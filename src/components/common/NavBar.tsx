import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";
import { usePermissions } from "../../hooks/usePermissions";

export default function NavBar() {
  const { user, logout } = useAuth();
  const { canReview, canManage } = usePermissions();

  // Determine if roles link should be active (catalog or roles pages)
  const { pathname } = useLocation();
  const isRolesActive =
    pathname.startsWith("/catalog") || pathname.startsWith("/roles");

  return (
    <Navbar expand="lg" className="shadow-sm mb-4">
      <Container className="ms-1">
        {/* Brand (link to home) */}
        <LinkContainer to="/">
          <Navbar.Brand>
            <img
              alt=""
              src="/src/assets/logo.svg"
              width="50"
              height="50"
              className="d-inline-block align-top me-4"
            />
            CISV Saskatoon
          </Navbar.Brand>
        </LinkContainer>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          {/* Left side links */}
          <Nav className="me-auto">
            {user ? (
              <LinkContainer to="/roles" isActive={() => isRolesActive}>
                <Nav.Link>Roles</Nav.Link>
              </LinkContainer>
            ) : (
              <LinkContainer to="/catalog" isActive={() => isRolesActive}>
                <Nav.Link>Roles</Nav.Link>
              </LinkContainer>
            )}
            {canReview && (
              <LinkContainer to="/progress">
                <Nav.Link>Progress</Nav.Link>
              </LinkContainer>
            )}
            {canManage && (
              <LinkContainer to="/review">
                <Nav.Link>Review</Nav.Link>
              </LinkContainer>
            )}
            {canManage && (
              <LinkContainer to="/admin/roles/new">
                <Nav.Link>New Role</Nav.Link>
              </LinkContainer>
            )}
            {canManage && (
              <LinkContainer to="/legacy">
                <Nav.Link>Legacy</Nav.Link>
              </LinkContainer>
            )}
          </Nav>

          {/* Right side auth actions */}
          <Nav>
            {user ? (
              <Button variant="primary" size="sm" onClick={logout}>
                Logout
              </Button>
            ) : (
              <LinkContainer to="/login">
                <Button variant="primary" size="sm">
                  Login
                </Button>
              </LinkContainer>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
