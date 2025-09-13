// src/pages/TrackedRoleDetailsPage
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Card,
  ListGroup,
  Badge,
  Button,
  Spinner,
  Breadcrumb,
  Row,
  Col,
  ProgressBar,
} from "react-bootstrap";
import { CheckCircleFill } from "react-bootstrap-icons";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getRole } from "../services/roleService";
import { getStepsByIds } from "../services/stepService";
import { getProgress, updateStepProgress } from "../services/progressService";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";
import { StepProgress } from "../types/Progress";
import Markdown from "../components/common/MarkDown";

export default function TrackedRoleDetailsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { user } = useAuth();
  const { showNotification } = useToast();

  const [role, setRole] = useState<RoleDoc | null>(null);
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [progress, setProgress] = useState<Record<string, StepProgress>>({});
  const [loading, setLoading] = useState(true);
  const [savingStep, setSavingStep] = useState<string | null>(null);

  useEffect(() => {
    if (!roleId || !user) return;
    (async () => {
      try {
        const r = await getRole(roleId);
        if (r) {
          setRole(r);
          const stepDocs = r.steps.length ? await getStepsByIds(r.steps) : [];
          setSteps(stepDocs);
        }

        const prog = await getProgress(user.uid, roleId);
        setProgress(prog || {});
      } catch (e) {
        console.error(e);
        showNotification("Failed to load tracked role", "danger");
      } finally {
        setLoading(false);
      }
    })();
  }, [roleId, user, showNotification]);

  const handleToggleStep = async (stepId: string) => {
    if (!user || !roleId) return;
    setSavingStep(stepId);
    try {
      const prev = progress[stepId];
      const newStatus = prev?.status;
      const update: StepProgress = {
        status: newStatus,
        completedAt: newStatus
          ? new Date().toISOString().slice(0, 10)
          : undefined,
        expiresAt:
          newStatus && steps.find((s) => s.id === stepId)?.expiresInMonths
            ? new Date(
                Date.now() +
                  steps.find((s) => s.id === stepId)!.expiresInMonths! *
                    30 *
                    24 *
                    60 *
                    60 *
                    1000
              )
                .toISOString()
                .slice(0, 10)
            : undefined,
      };

      await updateStepProgress(user.uid, roleId, stepId, update);
      setProgress((prevProg) => ({ ...prevProg, [stepId]: update }));
      showNotification(`Step ${newStatus ? "completed" : "reset"}`, "success");
    } catch (e) {
      console.error("Failed to update step", e);
      showNotification("Could not update step", "danger");
    } finally {
      setSavingStep(null);
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
          <Breadcrumb.Item as={Link} to="/roles">
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

  const completedCount = Object.values(progress).filter(
    (p) => p.status === "completed"
  ).length;
  const percent = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  return (
    <div className="container py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/roles" }}>
          Roles
        </Breadcrumb.Item>
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
                <Badge bg="info">
                  {completedCount}/{steps.length} Completed
                </Badge>
              </div>

              <div className="mt-3">
                <ProgressBar now={percent} label={`${percent}%`} />
              </div>

              <div className="mt-3">
                <h5 className="mb-2">Steps</h5>
                <ListGroup variant="flush">
                  {steps.length ? (
                    steps.map((s) => {
                      const prog = progress[s.id];
                      const completed = prog?.status === "completed";
                      return (
                        <ListGroup.Item key={s.id} className="px-0 py-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <div className="fw-semibold">{s.name}</div>
                              {s.description && (
                                <div className="text-muted">
                                  <Markdown>{s.description}</Markdown>
                                </div>
                              )}
                              {prog?.expiresAt && (
                                <div>
                                  <small className="text-warning">
                                    Expires:{" "}
                                    {new Date(
                                      prog.expiresAt
                                    ).toLocaleDateString()}
                                  </small>
                                </div>
                              )}
                            </div>
                            <Button
                              variant={
                                completed ? "success" : "outline-secondary"
                              }
                              size="sm"
                              disabled={savingStep === s.id}
                              onClick={() => handleToggleStep(s.id)}
                            >
                              {savingStep === s.id ? (
                                <Spinner size="sm" animation="border" />
                              ) : completed ? (
                                "Completed"
                              ) : (
                                "Mark Complete"
                              )}
                            </Button>
                          </div>
                        </ListGroup.Item>
                      );
                    })
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
      </Row>
    </div>
  );
}
