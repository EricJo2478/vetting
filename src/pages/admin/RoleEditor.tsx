// src/pages/admin/RoleEditor.tsx
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Container,
  Form,
  Row,
} from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import {
  createRole,
  getRole,
  updateRole,
} from "../../services/roleService";
import StepEditor from "../../components/admin/StepEditor";
import { RoleDoc } from "../../types/Role";
import MarkdownEditor from "../../components/common/MarkdownEditor";

export default function RoleEditor() {
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId: string }>();

  const [role, setRole] = useState<Partial<RoleDoc>>({
    name: "",
    description: "",
    isPublished: false,
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (roleId) {
          const doc = await getRole(roleId);
          if (!cancelled) setRole(doc || {});
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e?.message || "Failed to load role");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roleId]);

  const onCreate = async () => {
    setError(null);
    setSaved(null);
    try {
      const newId = await createRole({
        name: role.name?.trim() || "Untitled role",
        description: role.description?.trim() || "",
        isPublished: !!role.isPublished,
      });
      navigate(`/admin/roles/${newId}`);
    } catch (e: any) {
      setError(e?.message || "Could not create role");
    }
  };

  const onSave = async () => {
    if (!roleId) return;
    setError(null);
    setSaved(null);
    try {
      await updateRole(roleId, {
        name: role.name?.trim() || "Untitled role",
        description: role.description?.trim() || "",
        isPublished: !!role.isPublished,
      });
      setSaved("Saved");
    } catch (e: any) {
      setError(e?.message || "Could not save role");
    }
  };

  return (
    <Container className="py-4">
      <Card>
        <Card.Header>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <div className="fw-semibold">{roleId ? "Edit role" : "Create role"}</div>
              <div className="text-muted small">
                Volunteers will see this name and description. The description supports Markdown for simple formatting.
              </div>
            </div>
            <div className="d-flex align-items-center gap-3">
              <Form.Check
                type="switch"
                id="publish-switch"
                label="Published"
                checked={!!role.isPublished}
                onChange={(e) => setRole({ ...role, isPublished: e.target.checked })}
              />
              {roleId ? (
                <Button variant="primary" onClick={onSave}>Save</Button>
              ) : (
                <Button variant="primary" onClick={onCreate}>Create role</Button>
              )}
            </div>
          </div>
        </Card.Header>

        <Card.Body>
          {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
          {saved && <Alert variant="success" className="mb-3">{saved}</Alert>}

          <Row className="g-3">
            <Col md={6}>
              <Form.Group controlId="role-name">
                <Form.Label>Role name</Form.Label>
                <Form.Control
                  value={role.name ?? ""}
                  onChange={(e) => setRole({ ...role, name: e.target.value })}
                  placeholder="e.g., Food Bank Greeter"
                />
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end justify-content-end">
              <div className="text-muted small text-end">
                Toggle <strong>Published</strong> to make this role visible in the catalog.
              </div>
            </Col>

            <Col xs={12}>
              <Form.Group controlId="role-description">
                <Form.Label>Description</Form.Label>
                <MarkdownEditor
                  value={role.description ?? ""}
                  onChange={(v) => setRole({ ...role, description: v })}
                  rows={6}
                  minHeight={140}
                  placeholder="Describe the role. Use Markdown for formatting."
                />
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {roleId && (
        <div className="mt-3">
          <StepEditor roleId={roleId} />
        </div>
      )}
    </Container>
  );
}
