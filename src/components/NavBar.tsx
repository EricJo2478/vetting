import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { auth } from "../App";
import { signOut, type User } from "firebase/auth";

interface Props {
  setPage: Function;
  setUser: Function;
  admin?: boolean;
  user?: User | null;
  openLogin?: () => void;
}

export default function NavBar({
  setPage,
  setUser,
  admin = false,
  user = null,
  openLogin,
}: Props) {
  const pages: string[] = [];

  return (
    <Navbar expand="lg" className="bg-body-tertiary mb-5">
      <Container>
        <Navbar.Brand
          onClick={() => {
            setPage("home");
          }}
        >
          CISV Saskatoon
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            {pages.map((name) => (
              <Nav.Link
                key={name}
                onClick={() => {
                  setPage(name.toLocaleLowerCase());
                }}
              >
                {name}
              </Nav.Link>
            ))}
          </Nav>
          {user && (
            <Button
              onClick={() => {
                setUser(null);
                signOut(auth);
              }}
              type="button"
            >
              Logout
            </Button>
          )}
          {openLogin && !user && (
            <Button onClick={openLogin} type="button">
              Login with Google
            </Button>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
