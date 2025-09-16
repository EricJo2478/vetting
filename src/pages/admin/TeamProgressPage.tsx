// src/pages/admin/TeamProgressPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Col,
  Form,
  InputGroup,
  Row,
  Spinner,
  Table,
} from "react-bootstrap";
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
  query,
  getDoc,
  DocumentReference,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import type { RoleDoc } from "../../types/Role";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { ProgressDoc, StepStatus } from "../../types/Progress";

// Firestore user/person doc shapes
type FireUser = {
  name?: string;
  displayName?: string;
  email?: string;
  systemRole?: string;
};
type PersonDoc = {
  name?: string;
  email?: string;
  notes?: string;
};

type RowItem = {
  ownerKind: "user" | "person" | "unknown";
  uid: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  completed: number;
  total: number;
  percent: number;
  inProgress: number;
  pending: number;
};

type RawProgress = {
  ownerKind: "user" | "person" | "unknown";
  uid: string;
  roleId: string;
  steps: Record<string, { status: StepStatus }>;
};

// Extract owner from "users/{uid}/progress/{roleId}" OR "people/{pid}/progress/{roleId}"
function ownerFromProgressRef(ref: DocumentReference): {
  kind: "user" | "person" | "unknown";
  id: string;
} {
  const segs = ref.path.split("/");
  const iu = segs.indexOf("users");
  if (iu >= 0 && segs[iu + 1]) return { kind: "user", id: segs[iu + 1] };
  const ip = segs.indexOf("people");
  if (ip >= 0 && segs[ip + 1]) return { kind: "person", id: segs[ip + 1] };
  return { kind: "unknown", id: "unknown" };
}

export default function TeamProgressPage() {
  const { user } = useAuth();
  const [canView, setCanView] = useState<boolean | null>(null);

  // catalogs
  const [users, setUsers] = useState<Record<string, FireUser>>({});
  const [people, setPeople] = useState<Record<string, PersonDoc>>({});
  const [roles, setRoles] = useState<Record<string, RoleDoc>>({});

  // raw progress; rows derived in useMemo
  const [progressDocs, setProgressDocs] = useState<RawProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [qText, setQText] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "in-progress" | "pending"
  >("all");

  const { showNotification } = useToast();
  const notifyRef = useRef<(msg: string) => void>(showNotification);
  useEffect(() => {
    notifyRef.current = (m) => showNotification(m, "danger");
  }, [showNotification]);

  // 1) Resolve privilege once before subscribing
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.uid) {
        setCanView(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const role = snap.data()?.systemRole as string | undefined;
        const ok =
          role === "manager" || role === "admin" || role === "supervisor";
        if (!cancelled) setCanView(ok);
      } catch (e: any) {
        console.error("role check failed", e);
        if (!cancelled) {
          setCanView(false);
          setError(e.message || String(e));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // 2) Subscribe to users (names/emails)
  useEffect(() => {
    if (canView !== true) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      const m: Record<string, FireUser> = {};
      snap.forEach((d) => (m[d.id] = d.data() as FireUser));
      setUsers(m);
    });
    return () => unsub();
  }, [canView]);

  // 2b) Subscribe to people (legacy / non-account)
  useEffect(() => {
    if (canView !== true) return;
    const unsub = onSnapshot(collection(db, "people"), (snap) => {
      const m: Record<string, PersonDoc> = {};
      snap.forEach((d) => (m[d.id] = d.data() as PersonDoc));
      setPeople(m);
    });
    return () => unsub();
  }, [canView]);

  // 3) Subscribe to roles (for total step counts)
  useEffect(() => {
    if (canView !== true) return;
    const unsub = onSnapshot(collection(db, "roles"), (snap) => {
      const m: Record<string, RoleDoc> = {};
      snap.forEach((d) => (m[d.id] = { id: d.id, ...(d.data() as any) }));
      setRoles(m);
    });
    return () => unsub();
  }, [canView]);

  // 4) Subscribe to ALL progress docs via collectionGroup('progress') ONCE
  useEffect(() => {
    if (canView !== true) return;
    setLoading(true);
    setError(null);

    const q = query(collectionGroup(db, "progress"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: RawProgress[] = [];
        snap.forEach((d) => {
          const owner = ownerFromProgressRef(d.ref);
          const roleId = d.id;
          const data = d.data() as ProgressDoc;
          out.push({
            ownerKind: owner.kind,
            uid: owner.id,
            roleId,
            steps: (data?.steps ?? {}) as any,
          });
        });
        setProgressDocs(out);
        setLoading(false);
      },
      (err) => {
        console.error("TeamProgress CG(progress) error:", err);
        setError(err.message || String(err));
        setProgressDocs([]);
        setLoading(false);
        notifyRef.current?.("Unable to load team progress");
      }
    );
    return () => unsub();
  }, [canView]);

  // 5) Join raw progress with latest users/people/roles
  const rows: RowItem[] = useMemo(() => {
    return progressDocs.map(({ ownerKind, uid, roleId, steps }) => {
      const role = roles[roleId];
      const total = role?.steps?.length ?? Object.keys(steps).length ?? 0;

      let completed = 0,
        inProgress = 0,
        pending = 0;
      Object.values(steps).forEach((s) => {
        if (s.status === "completed") completed++;
        else if (s.status === "in-progress") inProgress++;
        else pending++;
      });

      const u = ownerKind === "person" ? people[uid] || {} : users[uid] || {};
      const name = (u as any).name || (u as any).displayName || uid;
      const email = (u as any).email || "";
      const percent = total ? Math.round((completed / total) * 100) : 0;

      return {
        ownerKind,
        uid,
        name,
        email,
        roleId,
        roleName: role?.name || roleId,
        completed,
        total,
        percent,
        inProgress,
        pending,
      };
    });
  }, [progressDocs, users, people, roles]);

  // Filtering / search
  const filtered = useMemo(() => {
    let data = rows;
    if (roleFilter !== "all")
      data = data.filter((r) => r.roleId === roleFilter);
    if (statusFilter !== "all") {
      data = data.filter((r) => {
        if (statusFilter === "completed")
          return r.completed === r.total && r.total > 0;
        if (statusFilter === "in-progress") return r.inProgress > 0;
        if (statusFilter === "pending")
          return r.completed === 0 && r.inProgress === 0;
        return true;
      });
    }
    if (qText.trim()) {
      const ql = qText.toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(ql) ||
          r.email.toLowerCase().includes(ql) ||
          r.roleName.toLowerCase().includes(ql) ||
          r.uid.toLowerCase().includes(ql)
      );
    }
    return [...data].sort(
      (a, b) =>
        a.name.localeCompare(b.name) || a.roleName.localeCompare(b.roleName)
    );
  }, [rows, qText, roleFilter, statusFilter]);

  if (canView === false) {
    return (
      <div className="container py-4">
        <Alert variant="danger">
          You don’t have permission to view team progress. (Managers and
          supervisors only.)
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <Row className="mb-3">
        <Col>
          <h3 className="mb-0">Team Progress</h3>
          <div className="text-muted">All users · all roles</div>
        </Col>
      </Row>

      <Row className="g-3 align-items-end mb-3">
        <Col md={4}>
          <Form.Label>Search</Form.Label>
          <InputGroup>
            <Form.Control
              placeholder="Name, email, role…"
              value={qText}
              onChange={(e) => setQText(e.target.value)}
            />
          </InputGroup>
        </Col>
        <Col md={4}>
          <Form.Label>Role</Form.Label>
          <Form.Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All roles</option>
            {Object.entries(roles)
              .sort((a, b) =>
                (a[1].name || a[0]).localeCompare(b[1].name || b[0])
              )
              .map(([id, r]) => (
                <option key={id} value={id}>
                  {r.name || id}
                </option>
              ))}
          </Form.Select>
        </Col>
        <Col md={4}>
          <Form.Label>Status</Form.Label>
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In-progress</option>
            <option value="pending">Pending</option>
          </Form.Select>
        </Col>
      </Row>

      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center py-5">
              <Spinner animation="border" />
            </div>
          ) : error ? (
            <div className="p-3">
              <Alert variant="danger">{error}</Alert>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0 align-middle">
                <thead>
                  <tr>
                    <th style={{ minWidth: 160 }}>Account</th>
                    <th style={{ minWidth: 200 }}>Name</th>
                    <th style={{ minWidth: 180 }}>Email</th>
                    <th style={{ minWidth: 220 }}>Role</th>
                    <th className="text-center">Progress</th>
                    <th className="text-center">Pending</th>
                    <th className="text-center">In-progress</th>
                    <th className="text-center">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={`${r.ownerKind}:${r.uid}_${r.roleId}`}>
                      <td>
                        <Badge
                          bg={
                            r.ownerKind === "person" ? "secondary" : "primary"
                          }
                        >
                          {r.ownerKind === "person" ? "Person" : "User"}
                        </Badge>
                        <div className="text-muted small mt-1">{r.uid}</div>
                      </td>
                      <td className="fw-semibold">{r.name}</td>
                      <td className="text-muted">{r.email || "—"}</td>
                      <td>{r.roleName}</td>
                      <td className="text-center">
                        <Badge
                          bg={
                            r.percent === 100
                              ? "success"
                              : r.percent > 0
                              ? "info"
                              : "secondary"
                          }
                        >
                          {r.completed}/{r.total} ({r.percent}%)
                        </Badge>
                      </td>
                      <td className="text-center">{r.pending}</td>
                      <td className="text-center">{r.inProgress}</td>
                      <td className="text-center">{r.completed}</td>
                    </tr>
                  ))}
                  {!filtered.length && (
                    <tr>
                      <td colSpan={8} className="text-center text-muted py-4">
                        No results match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
