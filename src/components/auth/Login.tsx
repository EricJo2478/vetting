// src/pages/auth/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, Button, Spinner, Alert, Form } from "react-bootstrap";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  handleGoogleRedirectResult,
  loginWithGoogleSmart,
  explainAuthError,
  loginWithEmail,
  signupWithEmail,
  resetPassword,
} from "../../services/authService";
import { iso } from "../../utils";
// import { useNavigate } from "react-router-dom";

function isInAppBrowserUA() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MiuiBrowser|WeChat|LinkedInApp/i.test(
    ua
  );
}

export default function Login() {
  const { showNotification } = useToast();
  const { user } = useAuth();
  // const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [redirectHandled, setRedirectHandled] = useState(false);
  const isInApp = useMemo(() => isInAppBrowserUA(), []);

  // Email/password form state
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState(""); // ⬅️ new
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // Finalize Google redirect result
  useEffect(() => {
    (async () => {
      try {
        const res = await handleGoogleRedirectResult();
        if (res?.user) {
          showNotification?.(`Welcome ${res.user.email ?? ""}`, "success");
          // navigate("/roles", { replace: true });
        }
      } catch (err: any) {
        const msg = err?.friendly || explainAuthError(err);
        console.error("Google redirect error:", err);
        showNotification?.(msg, "danger");
      } finally {
        setRedirectHandled(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onGoogleClick = async () => {
    setBusy(true);
    try {
      const cred = await loginWithGoogleSmart();
      if (cred?.user) {
        showNotification?.(`Welcome ${cred.user.email ?? ""}`, "success");
        // navigate("/roles", { replace: true });
      }
    } catch (err: any) {
      const msg = err?.friendly || explainAuthError(err);
      console.error("Google login error:", err);
      showNotification?.(msg, "danger");
    } finally {
      setBusy(false);
    }
  };

  const onSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showNotification?.("Please enter email and password.", "warning");
      return;
    }
    if (mode === "signup") {
      if (!fullName.trim()) {
        showNotification?.("Please enter your full name.", "warning");
        return;
      }
      if (password !== confirm) {
        showNotification?.("Passwords do not match.", "warning");
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const cred = await loginWithEmail(email.trim(), password);
        showNotification?.(`Welcome ${cred.user.email ?? ""}`, "success");
      } else {
        // ⬇️ pass profile data to Firestore creator
        const profileData = {
          name: fullName.trim(),
          email: email.trim(),
          systemRole: "volunteer" as const, // adjust default if your app differs
          roleIds: [],
          createdAt: iso(new Date()),
        };
        const cred = await signupWithEmail(email.trim(), password, profileData);
        showNotification?.(
          `Account created: ${cred.user.email ?? ""}`,
          "success"
        );
      }
      // navigate("/roles", { replace: true });
    } catch (err: any) {
      const msg = err?.friendly || explainAuthError(err);
      showNotification?.(msg, "danger");
    } finally {
      setBusy(false);
    }
  };

  const onResetPassword = async () => {
    if (!email) {
      showNotification?.("Enter your email above first.", "warning");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      showNotification?.("Password reset email sent.", "success");
    } catch (err: any) {
      const msg = err?.friendly || explainAuthError(err);
      showNotification?.(msg, "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container py-5 d-flex justify-content-center">
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <Card.Body>
          <h4 className="mb-3 text-center">Sign in</h4>

          {isInApp && (
            <Alert variant="warning">
              You appear to be using an in-app browser. If Google sign-in fails,
              tap the <strong>•••</strong> menu and choose{" "}
              <strong>Open in Browser</strong>, then try again.
            </Alert>
          )}

          <Button
            variant="outline-primary"
            className="w-100 mb-3"
            onClick={onGoogleClick}
            disabled={busy || (!!user && !redirectHandled)}
          >
            {busy ? (
              <>
                <Spinner size="sm" animation="border" className="me-2" />
                Signing in…
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>

          <div className="text-center text-muted my-3">or</div>

          <Form onSubmit={onSubmitEmail}>
            {mode === "signup" && (
              <Form.Group className="mb-2" controlId="fullName">
                <Form.Label>Full name</Form.Label>
                <Form.Control
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={busy}
                  placeholder="Jane Doe"
                  required
                />
              </Form.Group>
            )}

            <Form.Group className="mb-2" controlId="email">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                placeholder="you@example.com"
                required
              />
            </Form.Group>

            <Form.Group className="mb-2" controlId="password">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                required
              />
            </Form.Group>

            {mode === "signup" && (
              <Form.Group className="mb-3" controlId="confirm">
                <Form.Label>Confirm password</Form.Label>
                <Form.Control
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={busy}
                  required
                />
              </Form.Group>
            )}

            <div className="d-flex justify-content-between align-items-center mb-3">
              <Button variant="primary" type="submit" disabled={busy}>
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>

              {mode === "signin" ? (
                <Button
                  variant="link"
                  className="px-0"
                  onClick={() => setMode("signup")}
                  disabled={busy}
                >
                  Create an account
                </Button>
              ) : (
                <Button
                  variant="link"
                  className="px-0"
                  onClick={() => setMode("signin")}
                  disabled={busy}
                >
                  Have an account? Sign in
                </Button>
              )}
            </div>

            {mode === "signin" && (
              <div className="text-end">
                <Button
                  variant="link"
                  className="px-0"
                  onClick={onResetPassword}
                  disabled={busy}
                >
                  Forgot password?
                </Button>
              </div>
            )}
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}
