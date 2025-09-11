// src/pages/RoleDetailsPage
import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Card,
  ListGroup,
  Badge,
  Button,
  Spinner,
  Breadcrumb,
  Row,
  Col,
} from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getRole } from "../services/roleService";
import { getStepsByIds } from "../services/stepService";
import { updateUser } from "../services/userService";
import { RoleDoc } from "./DashboardPage";
import { StepDoc } from "../types/Step";
import { LinkContainer } from "react-router-bootstrap";
import Markdown from "../components/common/MarkDown";

export default function RoleDetailsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showNotification } = useToast();

  const [role, setRole] = useState<RoleDoc | null>(null);
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isTracking = useMemo(() => {
    return !!profile?.roleIds?.includes(roleId || "");
  }, [profile?.roleIds, roleId]);

  useEffect(() => {
    if (!roleId) return;
    (async () => {
      try {
        const r = await getRole(roleId);
        if (!r) {
          showNotification("Role not found", "danger");
          return;
        }
        setRole(r);
        const stepDocs = r.steps.length ? await getStepsByIds(r.steps) : [];
        setSteps(stepDocs);
      } catch (e) {
        console.error(e);
        showNotification("Failed to load role details", "danger");
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId, showNotification]);

  const handleTrackRole = async () => {
    if (!user) {
      navigate("/login", {
        replace: true,
        state: { redirectTo: `/catalog/${roleId}` },
      });
      return;
    }
    if (!roleId) return;
    if (isTracking) {
      showNotification("You're already tracking this role", "warning");
      return;
    }
    setSaving(true);
    try {
      const current = new Set(profile?.roleIds ?? []);
      current.add(roleId);
      await updateUser(user.uid, { roleIds: Array.from(current) });
      showNotification("Now tracking this role", "success");
      navigate("/roles", { replace: true });
    } catch (e) {
      console.error("Failed to start tracking role", e);
      showNotification("Could not start tracking this role", "danger");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="container py-4">
        <Breadcrumb className="mb-3">
          <Breadcrumb.Item as={Link} to="/catalog">
            Roles
          </Breadcrumb.Item>
          <Breadcrumb.Item active>Not Found</Breadcrumb.Item>
        </Breadcrumb>
        <Card body className="text-muted">
          Role not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Breadcrumb className="mb-3">
        {user ? (
          <Breadcrumb.Item as={Link} to="/roles">
            Roles
          </Breadcrumb.Item>
        ) : (
          <Breadcrumb.Item as={Link} to="/catalog">
            Roles
          </Breadcrumb.Item>
        )}
        <Breadcrumb.Item active>{role.name}</Breadcrumb.Item>
      </Breadcrumb>

      <Row className="g-4">
        <Col lg={8}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <Card.Title className="mb-1">{role.name}</Card.Title>
                  {role.description && (
                    <Card.Text className="text-muted">
                      {role.description}
                    </Card.Text>
                  )}
                </div>
                {isTracking && (
                  <Badge
                    bg="success"
                    className="d-inline-flex align-items-center gap-1"
                  >
                    <CheckCircleFill /> Tracking
                  </Badge>
                )}
              </div>

              <div className="mt-3">
                <h5 className="mb-2">Required Steps</h5>
                <ListGroup variant="flush">
                  {steps.length ? (
                    steps.map((s) => (
                      <ListGroup.Item key={s.id} className="px-0 py-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-semibold">{s.name}</div>
                            {s.description && (
                              <div className="text-muted">
                                <Markdown>{s.description}</Markdown>
                              </div>
                            )}
                          </div>
                          {s.expiresInMonths && (
                            <span className="badge bg-warning text-dark">
                              Expires: {s.expiresInMonths} mo
                            </span>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))
                  ) : (
                    <ListGroup.Item className="px-0 text-muted">
                      No steps defined.
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="h-100">
            <Card.Body>
              <h5 className="mb-3">Track Progress</h5>
              <p className="text-muted mb-4">
                {user
                  ? "Add this role to your dashboard to track completion of each step."
                  : "Log in to add this role to your dashboard and track your progress."}
              </p>

              {user ? (
                <Button
                  variant={isTracking ? "outline-secondary" : "primary"}
                  disabled={saving || isTracking}
                  onClick={handleTrackRole}
                  className="w-100"
                >
                  {isTracking ? (
                    "Already Tracking"
                  ) : saving ? (
                    <>
                      <Spinner size="sm" animation="border" className="me-2" />{" "}
                      Saving…
                    </>
                  ) : (
                    "Track this Role"
                  )}
                </Button>
              ) : (
                <LinkContainer to="/login">
                  <Button variant="primary" size="sm">
                    Log in to track
                  </Button>
                </LinkContainer>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
