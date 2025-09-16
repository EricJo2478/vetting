// src/pages/TrackedRoleDetailsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  ListGroup,
  Badge,
  Button,
  Spinner,
  Row,
  Col,
  ProgressBar,
} from "react-bootstrap";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";

import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getRole } from "../services/roleService";
import { getStepsByIds } from "../services/stepService";
import { getProgress, updateStepProgress } from "../services/progressService";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";
import { StepProgress, StepStatus } from "../types/Progress";
import Markdown from "../components/common/Markdown";

// small helpers
const toISODate = (d: Date) => d.toISOString().slice(0, 10);
const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};

export default function TrackedRoleDetailsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { user } = useAuth();
  const { showNotification } = useToast();

  const [role, setRole] = useState<RoleDoc | null>(null);
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [progress, setProgress] = useState<Record<string, StepProgress>>({});
  const [entryStatusByStep, setEntryStatusByStep] = useState<
    Record<string, StepStatus>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingStep, setSavingStep] = useState<string | null>(null);

  // Load role, steps, and progress
  useEffect(() => {
    if (!roleId || !user) return;
    let cancelled = false;

    (async () => {
      try {
        const r = await getRole(roleId);
        if (!r) throw new Error("Role not found");
        if (cancelled) return;

        setRole(r);
        const stepDocs = r.steps?.length ? await getStepsByIds(r.steps) : [];
        if (cancelled) return;
        setSteps(stepDocs);

        const prog = await getProgress(user.uid, roleId);
        if (cancelled) return;
        setProgress(prog?.steps ?? {});
      } catch (e) {
        console.error(e);
        showNotification("Failed to load tracked role", "danger");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roleId, user, showNotification]);

  // Live subscription to review entries so the UI flips to "Completed" when a manager approves
  useEffect(() => {
    if (!user || !roleId) return;
    const col = collection(
      db,
      "users",
      user.uid,
      "progress",
      roleId,
      "entries"
    );
    const unsub = onSnapshot(
      col,
      (snap) => {
        const map: Record<string, StepStatus> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data?.status) map[d.id] = data.status as StepStatus;
        });
        setEntryStatusByStep(map);
      },
      (err) => console.error("entries onSnapshot error", err)
    );
    return () => unsub();
  }, [user, roleId]);

  // Derived completion: consider a step completed if its entry is approved OR its StepProgress says completed
  const isApproved = (stepId: string) =>
    entryStatusByStep[stepId] === "completed";
  const isCompleted = (stepId: string) =>
    isApproved(stepId) || progress[stepId]?.status === "completed";

  const completedCount = useMemo(
    () => steps.filter((s) => isCompleted(s.id)).length,
    [steps, progress, entryStatusByStep]
  );
  const percent = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  // Toggle: Pending <-> In-progress (do NOT mark completed here)
  const handleToggleInProgress = async (stepId: string) => {
    if (!user || !roleId) return;
    setSavingStep(stepId);

    try {
      const step = steps.find((s) => s.id === stepId);
      if (!step) throw new Error(`Unknown step ${stepId}`);

      const current = progress[stepId]?.status;
      const goingToInProgress = current !== "in-progress";

      // Build StepProgress without undefineds; no completedAt/expiresAt until approved
      const next: StepProgress = {
        status: (goingToInProgress ? "in-progress" : "pending") as StepStatus, // add "in-progress" to your StepStatus union
      };

      await updateStepProgress(user.uid, roleId, step, next);

      // When moving into in-progress, submit an entry so managers can review/approve
      if (goingToInProgress) {
        await submitEntry({ userId: user.uid, roleId, stepId });
      }

      setProgress((prev) => ({ ...prev, [stepId]: next }));
      showNotification(
        goingToInProgress ? "Step set to In-progress" : "Step set to Pending",
        "success"
      );
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
        <Card body className="text-muted">
          Role not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4">
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
                <Badge bg={percent === 100 ? "success" : "info"}>
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
                      const approved = isApproved(s.id);
                      const completed = isCompleted(s.id);
                      const inProgress = prog?.status === "in-progress";
                      const entryStatus = entryStatusByStep[s.id];

                      return (
                        <ListGroup.Item key={s.id} className="px-0 py-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="pe-3">
                              <div className="fw-semibold d-flex align-items-center gap-2">
                                {s.name}
                                {approved && (
                                  <Badge bg="success">Approved</Badge>
                                )}
                                {!approved && inProgress && (
                                  <Badge bg="warning" text="dark">
                                    In progress
                                  </Badge>
                                )}
                                {!approved && entryStatus === "completed" && (
                                  <Badge bg="secondary">Submitted</Badge>
                                )}
                              </div>

                              {s.description && (
                                <div className="text-muted mt-1">
                                  <Markdown>{s.description}</Markdown>
                                </div>
                              )}

                              {/* Show expiry only after completion */}
                              {completed && prog?.expiresAt && (
                                <div className="mt-1">
                                  <small className="text-warning">
                                    Expires:{" "}
                                    {new Date(
                                      prog.expiresAt
                                    ).toLocaleDateString()}
                                  </small>
                                </div>
                              )}
                            </div>

                            {/* Action button */}
                            <div className="text-end">
                              {approved ? (
                                <Button variant="success" size="sm" disabled>
                                  Completed
                                </Button>
                              ) : (
                                <Button
                                  variant={
                                    inProgress ? "warning" : "outline-secondary"
                                  }
                                  size="sm"
                                  disabled={savingStep === s.id}
                                  onClick={() => handleToggleInProgress(s.id)}
                                >
                                  {savingStep === s.id ? (
                                    <Spinner size="sm" animation="border" />
                                  ) : inProgress ? (
                                    "Set Pending"
                                  ) : (
                                    "Start"
                                  )}
                                </Button>
                              )}
                            </div>
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
