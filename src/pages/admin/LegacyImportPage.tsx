// src/pages/admin/LegacyImportPage.tsx
import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Form, Row, Spinner } from "react-bootstrap";
import Papa from "papaparse";
import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "../../hooks/useToast";
import { importPeopleProgress, LegacyRow } from "../../services/legacyImport";

type RoleGuard = "unknown" | "allowed" | "denied";

export default function LegacyImportPage() {
  const { user } = useAuth();
  const { showNotification } = useToast();
  const [guard, setGuard] = useState<RoleGuard>("unknown");
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<LegacyRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) {
        setGuard("denied");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.data()?.systemRole as string | undefined;
        const ok = role === "manager" || role === "admin";
        if (!cancelled) setGuard(ok ? "allowed" : "denied");
      } catch {
        if (!cancelled) setGuard("denied");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const onFile = (file: File | null) => {
    if (!file) return;
    setParsing(true);
    setErrors([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const out: LegacyRow[] = [];
        const errs: string[] = [];

        for (const r of results.data as any[]) {
          const name = (r.name || r.Name || "").toString().trim();
          const email = (r.email || r.Email || "").toString().trim();
          const roleId = (r.roleId || r.RoleId || r.role || "")
            .toString()
            .trim();
          const completedSteps = (
            r.completedSteps ||
            r.CompletedSteps ||
            r.steps ||
            ""
          )
            .toString()
            .trim();

          if (!email || !roleId) {
            errs.push(`Missing email or roleId for row: ${JSON.stringify(r)}`);
            continue;
          }
          out.push({ name, email, roleId, completedSteps });
        }

        setRows(out);
        setErrors(errs);
        setParsing(false);
      },
      error: (err) => {
        setErrors([String(err)]);
        setParsing(false);
      },
    });
  };

  const doImport = async () => {
    try {
      setImporting(true);
      await importPeopleProgress(rows);
      showNotification(`Imported ${rows.length} record(s).`, "success");
      setRows([]);
    } catch (e: any) {
      showNotification(`Import failed: ${e.message || String(e)}`, "danger");
    } finally {
      setImporting(false);
    }
  };

  if (guard === "unknown") {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" />
      </div>
    );
  }

  if (guard === "denied") {
    return (
      <div className="container py-4">
        <Alert variant="danger">Only managers can import legacy records.</Alert>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Row className="mb-3">
        <Col>
          <h3 className="mb-0">Legacy Records Import</h3>
          <div className="text-muted">
            Upload a CSV of past completions for people without accounts.
          </div>
        </Col>
      </Row>

      <Card>
        <Card.Body>
          <Form.Group controlId="csvUpload" className="mb-3">
            <Form.Label>CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const input = e.currentTarget as HTMLInputElement; // narrow the element
                const file = input.files?.[0] ?? null;
                onFile(file);
              }}
              disabled={parsing || importing}
            />
            <Form.Text muted>
              Columns: <code>name</code>, <code>email</code>,{" "}
              <code>roleId</code>, <code>completedSteps</code>
            </Form.Text>
          </Form.Group>

          {parsing && <Spinner animation="border" />}

          {!!errors.length && (
            <Alert variant="warning">
              <div className="fw-semibold mb-1">Row issues</div>
              <ul className="mb-0">
                {errors.map((e, i) => (
                  <li key={i} className="small">
                    {e}
                  </li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted">
              Parsed rows: <strong>{rows.length}</strong>
            </div>
            <Button
              variant="primary"
              disabled={!rows.length || importing}
              onClick={doImport}
            >
              {importing ? "Importing…" : `Import ${rows.length} row(s)`}
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="mt-3">
        <Card.Body>
          <div className="fw-semibold mb-2">CSV example</div>
          <pre
            className="mb-0"
            style={{ whiteSpace: "pre-wrap" }}
          >{`name,email,roleId,completedSteps
Jane Doe,jane@example.org,usher,crc,orientation
Bob Smith,bob@example.org,greeter,crc,refs`}</pre>
          <div className="text-muted small mt-2">
            Use commas to separate steps. Header names are case-insensitive.
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
