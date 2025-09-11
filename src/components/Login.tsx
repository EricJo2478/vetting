import { useState, FormEvent } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  UserCredential,
} from "firebase/auth";
import {
  Button,
  Card,
  Form,
  Spinner,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import {
  Google,
  CheckCircleFill,
  ExclamationTriangleFill,
  XCircleFill,
} from "react-bootstrap-icons";
import { auth, googleProvider } from "../services/firebase";

export default function Login() {
  const [loading, setLoading] = useState<boolean>(false); // tracks if the login is in process
  const [email, setEmail] = useState<string>(""); // tracks the email value in form
  const [password, setPassword] = useState<string>(""); // tracks the password value in form
  const [isRegister, setIsRegister] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string>(""); // tracks if there is a toast message
  const [toastVariant, setToastVariant] = useState<
    "success" | "danger" | "warning"
  >("success"); // tracks colour variatn of toast message
  const [showToast, setShowToast] = useState<boolean>(false); // whether toast message is visible

  // function to show toast notification
  const showNotification = (
    message: string,
    variant: "success" | "danger" | "warning" = "success"
  ) => {
    setToastMessage(message); // set message
    setToastVariant(variant); // set variant (success if not defined)
    setShowToast(true); // show toast
  };

  // function to handle google login
  const handleGoogleLogin = async (): Promise<void> => {
    setLoading(true);
    try {
      const result: UserCredential = await signInWithPopup(
        auth,
        googleProvider
      );
      // show notification if login sucessful
      showNotification(
        `Google login successful: ${result.user.email}`,
        "success"
      );
    } catch (error) {
      // show notification for error and log to console
      console.error("❌ Google login error:", error);
      showNotification("Google login failed", "danger");
    } finally {
      setLoading(false);
    }
  };

  // function to get form event and sign in via email
  const handleEmailAuth = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    try {
      let result: UserCredential;
      if (isRegister) {
        result = await createUserWithEmailAndPassword(auth, email, password);
        showNotification(`Account created: ${result.user.email}`, "success");
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
        showNotification(`Logged in: ${result.user.email}`, "success");
      }
    } catch (error) {
      // show notification for error and log to console
      console.error(`❌ ${isRegister ? "Signup" : "Login"} error:`, error);
      showNotification(`${isRegister ? "Signup" : "Login"} failed`, "danger");
    } finally {
      setLoading(false);
    }
  };

  // function to reset password
  const handlePasswordReset = async (): Promise<void> => {
    // check if there is an email entered
    if (!email) {
      showNotification("Please enter your email to reset password", "warning");
      return;
    }
    setLoading(true);
    try {
      // show success notification
      await sendPasswordResetEmail(auth, email);
      showNotification("Password reset email sent!", "success");
    } catch (error) {
      // show error notification and log to console
      console.error("❌ Password reset error:", error);
      showNotification("Failed to send reset email", "danger");
    } finally {
      setLoading(false);
    }
  };

  // render idonc for toast based on variant
  const renderToastIcon = () => {
    if (toastVariant === "success") return <CheckCircleFill className="me-2" />;
    if (toastVariant === "danger") return <XCircleFill className="me-2" />;
    if (toastVariant === "warning")
      return <ExclamationTriangleFill className="me-2" />;
    return null;
  };

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark p-3">
      <Card className="p-4 shadow" style={{ width: "100%", maxWidth: "400px" }}>
        <h3 className="text-center mb-4">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h3>

        {/* Google Login button */}
        <Button
          variant="outline-primary"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
        >
          {loading ? <Spinner animation="border" size="sm" /> : <Google />}
          Continue with Google
        </Button>

        <div className="d-flex align-items-center my-3">
          <div className="flex-grow-1 border-bottom" />
          <span className="mx-2 text-muted">or</span>
          <div className="flex-grow-1 border-bottom" />
        </div>

        {/* Login form form for email and password */}
        <Form onSubmit={handleEmailAuth}>
          {/* Email Input */}
          <Form.Group className="mb-3" controlId="formEmail">
            <Form.Control
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Form.Group>

          {/* Password Input */}
          <Form.Group className="mb-3" controlId="formPassword">
            <Form.Control
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Form.Group>

          {/* Login Button. Disabled while authenticating */}
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            className="w-100 d-flex align-items-center justify-content-center gap-2"
          >
            {loading && <Spinner animation="border" size="sm" />}
            {isRegister ? "Sign Up with Email" : "Login with Email"}
          </Button>
        </Form>

        {/* Reset Password link */}
        {!isRegister && (
          <div className="text-center mt-3">
            <Button
              variant="link"
              size="sm"
              onClick={handlePasswordReset}
              disabled={loading}
            >
              Forgot Password?
            </Button>
          </div>
        )}

        {/* Button to switch from register to login option */}
        <div className="text-center mt-3 text-muted">
          {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
          <Button
            variant="link"
            size="sm"
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? "Login" : "Sign Up"}
          </Button>
        </div>
      </Card>

      {/* Toast Notification */}
      <ToastContainer position="bottom-center" className="mb-4">
        <Toast
          onClose={() => setShowToast(false)}
          show={showToast}
          delay={3000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header closeButton>
            {renderToastIcon()}
            <strong className="me-auto text-capitalize">{toastVariant}</strong>
          </Toast.Header>
          <Toast.Body className="text-white d-flex align-items-center">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
