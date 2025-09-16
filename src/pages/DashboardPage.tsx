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
import { getRoles } from "../services/roleService";
import { updateUser } from "../services/userService";
import { LinkContainer } from "react-router-bootstrap";
import { getProgressCountsForRoles } from "../services/progressService";
import { RoleDoc } from "../types/Role";
import { usePermissions } from "../hooks/usePermissions";

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

  // if role is in selected delete; else add
  const toggleRole = (roleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
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
                        <Card.Text className="text-muted mb-2">
                          {role.description}
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
