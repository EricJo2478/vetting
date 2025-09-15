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
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  createRole,
  getRole,
  publishRole,
  updateRole,
} from "../../services/roleService";
import StepEditor from "../../components/admin/StepEditor";
import { RoleDoc } from "../../types/Role";
import { LinkContainer } from "react-router-bootstrap";

export default function RoleEditor() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const [saved, setSaved] = useState<string | null>(null);
  const params = useParams();
  const paramRoleId = params.roleId ?? null;

  const [roleId, setRoleId] = useState<string | null>(search.get("id"));
  const [role, setRole] = useState<Partial<RoleDoc>>({
    name: "",
    description: "",
    isPublished: false,
  });

  useEffect(() => {
    (async () => {
      if (!paramRoleId) return; // create mode
      const existing = await getRole(paramRoleId);
      if (existing) {
        setRoleId(existing.id);
        setRole({
          name: existing.name,
          description: existing.description ?? "",
          isPublished: !!existing.isPublished,
        });
      }
    })();
  }, [paramRoleId]);

  const onCreate = async () => {
    if (!role.name?.trim()) return;
    const id = await createRole({
      name: role.name!.trim(),
      description: role.description ?? "",
      isPublished: !!role.isPublished,
    });
    setRoleId(id);
    setSaved("Created role");
    navigate({ search: `?id=${id}` }, { replace: true });
  };

  const onSave = async () => {
    if (!roleId) return;
    await updateRole(roleId, {
      name: role.name ?? "",
      description: role.description ?? "",
      isPublished: !!role.isPublished,
    });
    setSaved("Saved");
  };

  const onPublishToggle = async (checked: boolean) => {
    if (!roleId) return;
    await publishRole(roleId, checked);
    setRole((r) => ({ ...r, isPublished: checked }));
    setSaved(checked ? "Published" : "Unpublished");
  };

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          <h2>{roleId ? "Edit Role" : "Create Role"}</h2>
        </Col>
        <Col className="text-end">
          <LinkContainer to="/catalog">
            <Button variant="outline-secondary" size="sm">
              New Role
            </Button>
          </LinkContainer>
        </Col>
      </Row>

      {saved && (
        <Alert variant="success" onClose={() => setSaved(null)} dismissible>
          {saved}
        </Alert>
      )}

      <Card>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Role name</Form.Label>
                <Form.Control
                  value={role.name ?? ""}
                  onChange={(e) => setRole({ ...role, name: e.target.value })}
                  placeholder="e.g. Food Bank Helper"
                />
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end">
              <Form.Check
                type="switch"
                id="publish-switch"
                label="Published (visible in catalog)"
                checked={!!role.isPublished}
                onChange={(e) => onPublishToggle(e.target.checked)}
                disabled={!roleId}
              />
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>Description (Markdown allowed)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={6}
                  value={role.description ?? ""}
                  onChange={(e) =>
                    setRole({ ...role, description: e.target.value })
                  }
                />
              </Form.Group>
            </Col>
          </Row>

          <div className="mt-3 d-flex gap-2">
            {!roleId ? (
              <Button variant="primary" onClick={onCreate}>
                Create role
              </Button>
            ) : (
              <Button variant="primary" onClick={onSave}>
                Save
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {roleId && <StepEditor roleId={roleId} />}
    </Container>
  );
}
