import { Button, Container, Modal, Nav, Navbar } from "react-bootstrap";
import { auth } from "../App";
import { signOut } from "firebase/auth";
import UserData from "../datasets/UserData";
import SignUpForm from "./SignupForm";
import Login from "./Login";
import { useState } from "react";

interface Props {
  setPage: Function;
  setUser: Function;
  user: UserData;
  openLogin?: () => void;
}

export default function NavBar({ setPage, setUser, user, openLogin }: Props) {
  const [show, setShow] = useState<boolean>(false);

  const pages: string[] = [];
  if (user) {
    if (user.permission === "manager") {
      pages.push("Home");
      pages.push("Vetting");
      pages.push("Accounts");
    } else if (user.permission === "coordinator") {
      pages.push("Home");
      pages.push("Vetting");
    }
  }

  return (
    <Navbar expand="lg" className="bg-body-tertiary mb-5">
      <Container className="ms-1">
        <Navbar.Brand
          onClick={() => {
            setPage("home");
          }}
        >
          <img
            alt=""
            src="./src/assets/logo.svg"
            width="50"
            height="50"
            className="d-inline-block align-top me-4"
          />
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
          {user.user && (
            <Button
              onClick={() => {
                signOut(auth);
              }}
              type="button"
            >
              Logout
            </Button>
          )}
          {!user.user && (
            <>
              <Modal show={show} onHide={() => setShow(false)}>
                <Login />
              </Modal>
              <Button onClick={() => setShow(true)} type="button">
                Login
              </Button>
            </>
          )}
          {/* <LoginForm setUser={() => {}} /> */}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
