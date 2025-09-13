// src/pages/ReviewPage.tsx
import { useMemo, useState } from "react";
import {
  Card,
  Table,
  Form,
  Badge,
  Button,
  Spinner,
  Breadcrumb,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { useApprovals } from "../hooks/useApprovals";
import { Link } from "react-router-dom";
import { usePermissions } from "../hooks/usePermissions";
import { useAuth } from "../hooks/useAuth";

export default function ReviewPage() {
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<
    "submitted" | "changes_requested" | "approved" | ""
  >("");
  const { user } = useAuth();

  const { canReview, canManage, loading: permsLoading } = usePermissions();

  const { items, loading, approve, requestChanges, reopen } = useApprovals(
    { roleId: roleFilter || undefined, status: statusFilter || undefined },
    {
      enabled: !permsLoading && canReview, // don't query until auth/role known
      allowActions: canManage, // actions only for managers
    }
  );

  const pendingCount = useMemo(
    () => items.filter((i) => i.status === "submitted").length,
    [items]
  );

  if (!canReview) {
    return (
      <div className="container py-4">
        <Breadcrumb className="mb-3">
          <Breadcrumb.Item
            linkAs={Link}
            linkProps={user ? { to: "/roles" } : { to: "/catalog" }}
          >
            Catalog
          </Breadcrumb.Item>
          <Breadcrumb.Item active>Review</Breadcrumb.Item>
        </Breadcrumb>
        <Card>
          <Card.Body>
            <Card.Title className="mb-2">Access required</Card.Title>
            <p className="mb-0">
              You don’t have permission to view the review queue. Ask a manager
              to grant you access.
            </p>
          </Card.Body>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/catalog" }}>
          Catalog
        </Breadcrumb.Item>
        <Breadcrumb.Item active>Review</Breadcrumb.Item>
      </Breadcrumb>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <div>
            <Card.Title className="mb-0">Review Queue</Card.Title>
            <small className="text-muted">
              {pendingCount} awaiting approval
            </small>
          </div>
          <div className="d-flex gap-2">
            <Form.Select
              size="sm"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All roles</option>
              {/* TODO: populate options from roles collection */}
            </Form.Select>
            <Form.Select
              size="sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="changes_requested">Changes requested</option>
              <option value="approved">Approved</option>
            </Form.Select>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="p-4 d-flex justify-content-center">
              <Spinner animation="border" />
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Step</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Notes</th>
                  <th style={{ width: 240 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <div className="d-flex flex-column">
                        <span className="fw-semibold">
                          {it.userEmail ?? it.userId}
                        </span>
                        <small className="text-muted">UID: {it.userId}</small>
                      </div>
                    </td>
                    <td>{it.roleName ?? it.roleId}</td>
                    <td>{it.stepName ?? it.stepId}</td>
                    <td>
                      {it.submittedAt
                        ? new Date(it.submittedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <Badge
                        bg={
                          it.status === "approved"
                            ? "success"
                            : it.status === "changes_requested"
                            ? "warning"
                            : "primary"
                        }
                      >
                        {it.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td style={{ maxWidth: 320 }}>
                      <small className="text-muted">{it.notes ?? ""}</small>
                    </td>
                    <td className="d-flex gap-2">
                      {canManage ? (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => approve(it)}
                            disabled={it.status === "approved"}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="warning"
                            onClick={() => {
                              const msg = prompt(
                                "Enter notes for requested changes:",
                                it.notes ?? ""
                              );
                              requestChanges({ ...it, notes: msg ?? "" });
                            }}
                          >
                            Request changes
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => reopen(it)}
                            disabled={it.status !== "approved"}
                          >
                            Reopen
                          </Button>
                        </>
                      ) : (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id={`tt-${it.id}`}>
                              Supervisors have view-only access
                            </Tooltip>
                          }
                        >
                          <div className="d-flex gap-2">
                            <Button size="sm" variant="secondary" disabled>
                              Approve
                            </Button>
                            <Button size="sm" variant="secondary" disabled>
                              Request changes
                            </Button>
                            <Button size="sm" variant="secondary" disabled>
                              Reopen
                            </Button>
                          </div>
                        </OverlayTrigger>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
