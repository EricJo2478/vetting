// src/pages/TrackedRoleDetailsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../services/firebase";

import { useAuth } from "../hooks/useAuth";
import { useToast } from "../hooks/useToast";
import { getRole } from "../services/roleService";
import { getStepsByIds } from "../services/stepService";
import { updateStepProgress } from "../services/progressService";
import { submitEntry, withdrawSubmission } from "../services/approvalService";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";
import { StepProgress } from "../types/Progress";
import Markdown from "../components/common/Markdown";

type ReviewStatus = "submitted" | "approved" | "changes_requested";

export default function TrackedRoleDetailsPage() {
  const { roleId } = useParams<{ roleId: string }>();
  const { user } = useAuth();
  const { showNotification } = useToast();
  const notifyRef = useRef(showNotification);

  const [role, setRole] = useState<RoleDoc | null>(null);
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [progress, setProgress] = useState<Record<string, StepProgress>>({});
  const [entryStatusByStep, setEntryStatusByStep] = useState<
    Record<string, ReviewStatus>
  >({});

  // separate readiness flags to avoid spinner races/flicker
  const [roleReady, setRoleReady] = useState(false);
  const [progressReady, setProgressReady] = useState(false);
  const loading = !roleReady || !progressReady;

  // Load role + steps (one-shot)
  useEffect(() => {
    if (!roleId || !user) return;
    let cancelled = false;
    setRoleReady(false);

    (async () => {
      try {
        const r = await getRole(roleId);
        if (!r) throw new Error("Role not found");
        if (cancelled) return;
        setRole(r);

        const stepDocs = r.steps?.length ? await getStepsByIds(r.steps) : [];
        if (cancelled) return;
        setSteps(stepDocs);
      } catch (e) {
        console.error(e);
        notifyRef.current("Failed to load role", "danger");
      } finally {
        if (!cancelled) setRoleReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roleId, user, notifyRef]);

  // Live subscribe to progress doc (Option A)
  useEffect(() => {
    if (!user || !roleId) return;
    setProgressReady(false);
    const ref = doc(db, "users", user.uid, "progress", roleId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() as any;
        setProgress((data?.steps ?? {}) as Record<string, StepProgress>);
        setProgressReady(true);
      },
      (err) => {
        console.error("progress onSnapshot error:", err);
        setProgress({});
        setProgressReady(true);
        notifyRef.current("Cannot read progress", "danger");
      }
    );
    return () => unsub();
  }, [user, roleId, notifyRef]);

  // Live subscribe to the step review entries so we can show "Submitted"/"Approved"
  useEffect(() => {
    if (!user || !roleId) return;
    const colRef = collection(
      db,
      "users",
      user.uid,
      "progress",
      roleId,
      "entries"
    );
    const unsub = onSnapshot(
      colRef,
      (snap) => {
        const map: Record<string, ReviewStatus> = {};
        snap.forEach((d) => {
          const data = d.data() as any;
          if (data?.status) map[d.id] = data.status as ReviewStatus;
        });
        setEntryStatusByStep(map);
      },
      (err) => {
        console.error("entries onSnapshot error:", err);
        // keep previous entryStatusByStep; do not block page load
      }
    );
    return () => unsub();
  }, [user, roleId]);

  // Derived completion from canonical progress
  const completedCount = useMemo(
    () => steps.filter((s) => progress[s.id]?.status === "completed").length,
    [steps, progress]
  );
  const percent = steps.length
    ? Math.round((completedCount / steps.length) * 100)
    : 0;

  // Volunteer can toggle only: pending <-> in-progress
  const handleToggleInProgress = async (stepId: string) => {
    if (!user || !roleId) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step) {
      showNotification(`Unknown step ${stepId}`, "danger");
      return;
    }

    try {
      const current = progress[stepId]?.status ?? "pending";
      const goingToInProgress = current !== "in-progress";

      const next: StepProgress = {
        status: goingToInProgress ? "in-progress" : "pending",
      };

      // If moving into in-progress, (re)submit an entry for manager review
      if (goingToInProgress) {
        await submitEntry({ userId: user.uid, roleId, step });
      } else {
        await withdrawSubmission(user.uid, roleId, step.id); // should set entry.status = "withdrawn"
        await updateStepProgress(user.uid, roleId, step, { status: "pending" }); // or fold this into withdrawSubmission
      }
    } catch (e) {
      console.error(e);
      showNotification("Could not update step", "danger");
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
                    <Card.Text as="div" className="text-muted">
                      <Markdown>{role.description}</Markdown>
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
                      const ps = prog?.status ?? "pending"; // "pending" | "in-progress" | "completed"
                      const review = entryStatusByStep[s.id]; // "submitted" | "approved" | "changes_requested"

                      return (
                        <ListGroup.Item key={s.id} className="px-0 py-3">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="pe-3">
                              <div className="fw-semibold d-flex align-items-center gap-2">
                                {s.name}

                                {/* Progress chip (canonical) */}
                                {ps === "completed" ? (
                                  <Badge bg="success">Completed</Badge>
                                ) : ps === "in-progress" ? (
                                  <Badge bg="warning" text="dark">
                                    In-progress
                                  </Badge>
                                ) : (
                                  <Badge bg="secondary">Pending</Badge>
                                )}

                                {/* Review chip (secondary, from entry doc) */}
                                {review === "approved" && (
                                  <Badge bg="success" className="ms-1">
                                    Approved
                                  </Badge>
                                )}
                                {review === "submitted" && (
                                  <Badge bg="info" className="ms-1">
                                    Submitted
                                  </Badge>
                                )}
                                {review === "changes_requested" && (
                                  <Badge bg="danger" className="ms-1">
                                    Changes requested
                                  </Badge>
                                )}
                              </div>

                              {s.description && (
                                <div className="text-muted mt-1">
                                  <Markdown>{s.description}</Markdown>
                                </div>
                              )}
                            </div>

                            {/* Volunteer actions: Pending ⇄ In-progress only */}
                            <div className="text-end">
                              {ps === "completed" ? (
                                <Button variant="success" size="sm" disabled>
                                  Completed
                                </Button>
                              ) : (
                                <Button
                                  variant={
                                    ps === "in-progress"
                                      ? "warning"
                                      : "outline-secondary"
                                  }
                                  size="sm"
                                  onClick={() => handleToggleInProgress(s.id)}
                                >
                                  {ps === "in-progress"
                                    ? "Withdraw Step"
                                    : "Start"}
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
