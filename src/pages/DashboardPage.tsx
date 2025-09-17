// src/pages/DashboardPage
import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Button,
  Row,
  Col,
  Spinner,
  Form,
  Badge,
  ProgressBar,
} from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import {
  autoApproveShareableStepsForRole,
  getRoles,
} from "../services/roleService";
import { updateUser } from "../services/userService";
import { LinkContainer } from "react-router-bootstrap";
import { getProgressCountsForRoles } from "../services/progressService";
import { RoleDoc } from "../types/Role";
import { usePermissions } from "../hooks/usePermissions";
import Markdown from "../components/common/Markdown";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";

export default function RolesDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const { showNotification } = useToast();
  const { isManager, loading: permsLoading } = usePermissions();

  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [progressByRole, setProgressByRole] = useState<
    Record<string, { completed: number; total: number; percent: number }>
  >({});

  // Initialize local selection from user profile
  useEffect(() => {
    if (profile?.roleIds) {
      setSelected(new Set(profile.roleIds));
    }
  }, [profile?.roleIds]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (permsLoading) return;
      setLoading(true);
      try {
        const data = await getRoles(!isManager); // publishedOnly when not manager
        if (cancelled) return;
        setRoles(data);

        if (user && (profile?.roleIds?.length ?? 0) > 0) {
          const counts = await getProgressCountsForRoles(
            user.uid,
            profile?.roleIds!,
            data
          );
          if (!cancelled) setProgressByRole(counts);
        } else {
          if (!cancelled) setProgressByRole({});
        }
      } catch (e) {
        console.error("Failed to fetch roles", e);
        showNotification("Failed to load roles", "danger");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [permsLoading, isManager, user?.uid, profile?.roleIds]);

  const [busyRoleId, setBusyRoleId] = useState<string | null>(null);

  // if role is in selected delete; else add (and auto-approve when adding)
  const toggleRole = async (roleId: string) => {
    // compute once before setState so we know if we're adding
    const isAdding = !selected.has(roleId);

    // update UI selection immediately
    setSelected((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(roleId);
      else next.delete(roleId);
      return next;
    });

    // only run auto-approve when adding, and only if signed in
    if (!isAdding || !user) return;

    setBusyRoleId(roleId);
    try {
      // ensure the per-role progress doc exists (idempotent)
      const progressRef = doc(db, "users", user.uid, "progress", roleId);
      const exists = (await getDoc(progressRef)).exists();
      if (!exists) {
        await setDoc(progressRef, { createdAt: Date.now() }, { merge: true });
      }

      // sweep the role's steps and auto-complete any shareable + verified ones
      await autoApproveShareableStepsForRole(user.uid, roleId);

      showNotification?.(
        "Auto-approved matching steps for this role.",
        "success"
      );
    } catch (e) {
      console.error("Auto-approve on role add failed:", e);
      showNotification?.("Couldn’t auto-approve matching steps.", "danger");
    } finally {
      setBusyRoleId(null);
    }
  };

  const isDirty = useMemo(() => {
    const current = new Set(profile?.roleIds ?? []);
    if (current.size !== selected.size) return true;
    for (const r of selected) if (!current.has(r)) return true;
    return false;
  }, [profile?.roleIds, selected]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const roleIds = Array.from(selected);
      await updateUser(user.uid, { roleIds });
      showNotification("Roles updated", "success");

      // refresh counts with the newly saved selection
      const counts = await getProgressCountsForRoles(user.uid, roleIds, roles);
      setProgressByRole(counts);
    } catch (e) {
      console.error("Failed to save roles", e);
      showNotification("Could not save roles", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h2 className="mb-0">Choose Your Roles</h2>
        {profile?.systemRole && (
          <Badge bg="secondary" className="text-capitalize">
            {profile.systemRole}
          </Badge>
        )}
      </div>

      <Row xs={1} md={2} lg={3} className="g-3">
        {roles.map((role) => {
          const totalSteps = role.steps?.length ?? 0;
          const checked = selected.has(role.id);
          const rp = progressByRole[role.id];
          const percent = rp?.percent ?? 0;

          return (
            <Col key={role.id}>
              <Card className={checked ? "border-success" : ""}>
                <Card.Body>
                  <div className="d-flex align-items-start justify-content-between">
                    <div>
                      <Card.Title className="mb-1 d-flex align-items-center gap-2">
                        {checked && (
                          <CheckCircleFill className="text-success" />
                        )}
                        {role.name}
                      </Card.Title>
                      {role.description && (
                        <Card.Text as="div" className="text-muted mb-2">
                          <Markdown>{role.description}</Markdown>
                        </Card.Text>
                      )}
                    </div>
                    <Form.Check
                      type="switch"
                      id={`role-${role.id}`}
                      checked={checked}
                      onChange={() => toggleRole(role.id)}
                      aria-label={`Toggle ${role.name}`}
                    />
                  </div>

                  <div className="mt-2">
                    <small className="text-muted">
                      Requires {totalSteps} step{totalSteps === 1 ? "" : "s"}
                    </small>

                    {checked && (
                      <div className="mt-2">
                        <div className="d-flex justify-content-between small text-muted">
                          <span>
                            {rp?.completed ?? 0}/{rp?.total ?? totalSteps}{" "}
                            completed
                          </span>
                          <span>{percent}%</span>
                        </div>
                        <ProgressBar
                          now={percent}
                          variant={percent === 100 ? "success" : "info"}
                        />
                      </div>
                    )}

                    {checked && (
                      <LinkContainer to={`/roles/${role.id}`}>
                        <Button
                          variant="link"
                          size="sm"
                          className="px-0"
                          aria-label={`Open progress for ${role.name}`}
                        >
                          Open progress
                        </Button>
                      </LinkContainer>
                    )}
                  </div>
                  {isManager && (
                    <LinkContainer to={`/admin/roles/${role.id}/edit`}>
                      <Button size="sm" variant="outline-primary">
                        Edit role
                      </Button>
                    </LinkContainer>
                  )}
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      <div className="d-flex gap-2 mt-4">
        <Button
          variant="primary"
          disabled={!isDirty || saving}
          onClick={handleSave}
        >
          {saving ? (
            <Spinner animation="border" size="sm" className="me-2" />
          ) : null}
          Save Selection
        </Button>
        <Button
          variant="outline-secondary"
          disabled={!isDirty || saving}
          onClick={() => setSelected(new Set(profile?.roleIds ?? []))}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
