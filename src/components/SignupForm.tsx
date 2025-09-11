import { SyntheticEvent, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import googleSVG from "../assets/google.svg";
import githubLightSVG from "../assets/github-white.svg";

export default function SignUpForm() {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  return (
    <>
      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title as="h3">Sign Up</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <GoogleLoginButton onClick={console.log} />
          <GithubLoginButton onClick={console.log} />
        </Modal.Body>
      </Modal>
      <Button onClick={() => setShow(true)}>Sign Up</Button>
    </>
  );
}

interface GoogleProps {
  onClick: (e: SyntheticEvent) => void;
}

function GoogleLoginButton({ onClick }: GoogleProps) {
  return (
    <Button
      variant="light"
      className="d-flex align-items-center border rounded px-3 py-2 shadow-sm"
      style={{ fontWeight: 500 }}
      onClick={onClick}
    >
      <img
        src={googleSVG}
        alt="Google Logo"
        width="20"
        height="20"
        className="me-2"
      />
      Sign in with Google
    </Button>
  );
}

interface GithubProps {
  onClick: (e: SyntheticEvent) => void;
}

function GithubLoginButton({ onClick }: GithubProps) {
  return (
    <Button
      className="github-login-btn d-flex align-items-center px-3 py-2"
      style={{
        backgroundColor: "#24292e",
        borderColor: "#1b1f23",
        color: "#ffffff",
        fontWeight: 500,
      }}
      onClick={onClick}
    >
      <img
        src={githubLightSVG}
        alt="GitHub Logo"
        width="20"
        height="20"
        className="me-2"
      />
      Sign in with GitHub
    </Button>
  );
}
