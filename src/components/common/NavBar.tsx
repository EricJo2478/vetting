import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { useAuth } from "../../hooks/useAuth";
import { Link } from "react-router-dom";
import { LinkContainer } from "react-router-bootstrap";

export default function NavBar() {
  const { user, logout } = useAuth();

  // Determine if roles link should be active (catalog or roles pages)
  const isRolesActive =
    location.pathname.startsWith("/catalog") ||
    location.pathname.startsWith("/roles");

  return (
    <Navbar expand="lg" className="shadow-sm mb-4">
      <Container className="ms-1">
        {/* Brand (link to home) */}
        <LinkContainer to="/">
          <Navbar.Brand>
            <img
              alt=""
              src="./src/assets/logo.svg"
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
