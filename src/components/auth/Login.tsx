// src/pages/auth/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, Button, Spinner, Alert } from "react-bootstrap";
import { useToast } from "../../hooks/useToast";
import { useAuth } from "../../hooks/useAuth";
import {
  handleGoogleRedirectResult,
  loginWithGoogleSmart,
  explainAuthError,
} from "../../services/authService";
// import { useNavigate } from "react-router-dom"; // optional

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
  const [busy, setBusy] = useState(false);
  const [redirectHandled, setRedirectHandled] = useState(false);
  // const navigate = useNavigate();

  const isInApp = useMemo(() => isInAppBrowserUA(), []);

  // Finalize redirect result (mobile/in-app)
  useEffect(() => {
    (async () => {
      try {
        const res = await handleGoogleRedirectResult();
        if (res?.user) {
          showNotification?.(
            `Google login successful: ${res.user.email ?? ""}`,
            "success"
          );
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

  // If already signed in, you could auto-redirect:
  // useEffect(() => {
  //   if (user) navigate("/roles", { replace: true });
  // }, [user, navigate]);

  const onGoogleClick = async () => {
    setBusy(true);
    try {
      const cred = await loginWithGoogleSmart();
      // Redirect path returns null; success will be processed above in the effect
      if (cred?.user) {
        showNotification?.(
          `Google login successful: ${cred.user.email ?? ""}`,
          "success"
        );
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

  return (
    <div className="container py-5 d-flex justify-content-center">
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <Card.Body>
          <h4 className="mb-3 text-center">Sign in</h4>

          {/* In-app browser heads-up */}
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

          {/* (Optional) add email/password inputs if you support them */}
        </Card.Body>
      </Card>
    </div>
  );
}
