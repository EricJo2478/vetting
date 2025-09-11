import { useEffect, useState } from "react";
import { Card, Row, Col, Spinner, Button, Breadcrumb } from "react-bootstrap";
import { Link } from "react-router-dom";
import { getRoles } from "../services/roleService";
import { LinkContainer } from "react-router-bootstrap";
import { useAuth } from "../hooks/useAuth";

interface RoleDoc {
  id: string;
  name: string;
  description?: string;
  steps: string[];
}

export default function RolesCatalog() {
  const [roles, setRoles] = useState<RoleDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const data = await getRoles();
        setRoles(data);
      } catch (e) {
        console.error("Failed to fetch roles", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Breadcrumb className="mb-3">
        <Breadcrumb.Item active>Roles</Breadcrumb.Item>
      </Breadcrumb>

      <h2 className="mb-3">Volunteer Roles</h2>
      <Row xs={1} md={2} lg={3} className="g-3">
        {roles.map((role) => (
          <Col key={role.id}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{role.name}</Card.Title>
                {role.description && (
                  <Card.Text className="text-muted">
                    {role.description}
                  </Card.Text>
                )}
                <div className="mt-3">
                  {user ? (
                    <LinkContainer to={`/roles/${role.id}`}>
                      <Button variant="link" size="sm">
                        View Details
                      </Button>
                    </LinkContainer>
                  ) : (
                    <LinkContainer
                      to={user ? `/roles/${role.id}` : `/catalog/${role.id}`}
                    >
                      <Button variant="link" size="sm">
                        View Details
                      </Button>
                    </LinkContainer>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
