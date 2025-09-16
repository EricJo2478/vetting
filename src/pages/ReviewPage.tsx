// src/pages/ReviewPage.tsx
import { useMemo, useState } from "react";
import {
  Card,
  Table,
  Form,
  Badge,
  Button,
  Spinner,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import { useApprovals } from "../hooks/useApprovals";
import { approveEntry, returnToPending } from "../services/approvalService";

type ReviewStatus = "submitted" | "approved" | "changes_requested";
type StepStatus = "pending" | "in-progress" | "completed";

type QueueItem = {
  id?: string;
  userId: string;
  userName?: string;
  roleId: string;
  roleName?: string;
  stepId: string;
  stepName?: string;
  status: ReviewStatus;          // entry review status
  progressStatus?: StepStatus;   // mirrored canonical progress (optional)
  submittedAt?: number;
};

export default function ReviewPage() {
  const { user } = useAuth();
  const { isManager, loading: permsLoading } = usePermissions();

  // Realtime queue of entries
  const { items, loading } = useApprovals({ onlyOpen: false });

  const [statusFilter, setStatusFilter] = useState<"" | ReviewStatus>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  // Per-row optional expiry date (manager-entered)
  const [expiresByKey, setExpiresByKey] = useState<Record<string, string>>({});

  const filtered: QueueItem[] = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    return statusFilter ? list.filter((it: any) => it.status === statusFilter) : list;
  }, [items, statusFilter]);

  // Chips
  const renderProgressChip = (it: QueueItem) => {
    const s: StepStatus =
      it.progressStatus ?? (it.status === "approved" ? "completed" : "in-progress");
    if (s === "completed") return <Badge bg="success">Completed</Badge>;
    if (s === "in-progress") return <Badge bg="warning" text="dark">In-progress</Badge>;
    return <Badge bg="secondary">Pending</Badge>;
  };

  const renderReviewChip = (s: ReviewStatus) => {
    if (s === "approved") return <Badge bg="success">Approved</Badge>;
    if (s === "changes_requested") return <Badge bg="danger">Changes requested</Badge>;
    return <Badge bg="info">Submitted</Badge>;
  };

  // Actions
  const onApprove = async (it: QueueItem) => {
    if (!isManager) return;
    const key = `${it.userId}:${it.roleId}:${it.stepId}`;
    setBusyId(key);
    try {
      const expiresAt = (expiresByKey[key] || "").trim() || undefined; // optional
      await approveEntry({ userId: it.userId, roleId: it.roleId, stepId: it.stepId, expiresAt });
    } finally {
      setBusyId(null);
    }
  };

  const onReturnToPending = async (it: QueueItem) => {
    if (!isManager) return;
    const key = `${it.userId}:${it.roleId}:${it.stepId}`;
    setBusyId(key);
    try {
      await returnToPending({ userId: it.userId, roleId: it.roleId, stepId: it.stepId });
    } finally {
      setBusyId(null);
    }
  };

  const isLoading = loading || permsLoading;

  return (
    <div className="container py-4">
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div className="fw-semibold">Review queue</div>
          <div className="d-flex align-items-center gap-2">
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter by review status"
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="changes_requested">Changes requested</option>
            </Form.Select>
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {isLoading ? (
            <div className="p-4 d-flex justify-content-center">
              <Spinner animation="border" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-muted">Nothing to review.</div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Volunteer</th>
                  <th>Role</th>
                  <th>Step</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it) => {
                  const key = `${it.userId}:${it.roleId}:${it.stepId}`;
                  const disabled = busyId === key;

                  return (
                    <tr key={key}>
                      <td><Link to={`/users/${it.userId}`}>{it.userName || it.userId}</Link></td>
                      <td><Link to={`/roles/${it.roleId}`}>{it.roleName || it.roleId}</Link></td>
                      <td>{it.stepName || it.stepId}</td>
                      <td>{it.submittedAt ? new Date(it.submittedAt).toLocaleString() : "—"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          {renderProgressChip(it)}
                          {renderReviewChip(it.status)}
                        </div>
                      </td>
                      <td className="text-end">
                        {isManager ? (
                          <div className="d-flex gap-2 justify-content-end align-items-center">
                            {/* Optional expiry date (manager-entered) */}
                            <Form.Control
                              size="sm"
                              type="date"
                              style={{ maxWidth: 160 }}
                              value={expiresByKey[key] || ""}
                              onChange={(e) =>
                                setExpiresByKey((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              variant="success"
                              disabled={disabled || it.status === "approved"}
                              onClick={() => onApprove(it)}
                            >
                              {disabled && it.status !== "approved"
                                ? <Spinner size="sm" animation="border" />
                                : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-warning"
                              disabled={disabled}
                              onClick={() => onReturnToPending(it)}
                            >
                              {disabled
                                ? <Spinner size="sm" animation="border" />
                                : "Return to Pending"}
                            </Button>
                          </div>
                        ) : (
                          <OverlayTrigger
                            placement="top"
                            overlay={<Tooltip id={`tt-${key}`}>Supervisors have view-only access</Tooltip>}
                          >
                            <div className="text-muted">No actions</div>
                          </OverlayTrigger>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
