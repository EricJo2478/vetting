// src/components/admin/StepEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import { addStep, deleteStep, getStepsByRole, updateStep } from "../../services/roleService";
import { StepDoc } from "../../types/Step";
import MarkdownEditor from "../common/MarkdownEditor";

export default function StepEditor({ roleId }: { roleId: string }) {
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<StepDoc>>({
    name: "",
    description: "",
    order: 1,
    requiresApproval: false,
    shareable: false,
    templateId: "",
    autoApproveIfVerified: false,
    roleId,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await getStepsByRole(roleId);
        if (!cancelled) setSteps(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [roleId]);

  const nextOrder = useMemo(() => {
    const max = steps.reduce((acc, s) => Math.max(acc, s.order ?? 0), 0);
    return (isFinite(max) ? max : 0) + 1;
  }, [steps]);

  const cleanse = (obj: Record<string, any>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

  // Row edits
  const onRowChange = (id: string, patch: Partial<StepDoc>) => {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const onRowSave = async (s: StepDoc) => {
    setSavingId(s.id);
    try {
      const payload = cleanse({
        name: s.name?.trim(),
        description: s.description?.trim() || "",
        order: Number(s.order ?? 0),
        requiresApproval: !!s.requiresApproval,
        shareable: !!s.shareable,
        templateId: s.shareable ? (s.templateId || "").trim() || "shared" : undefined,
        autoApproveIfVerified: !!s.autoApproveIfVerified,
      });
      await updateStep(s.id, payload as any);
    } finally {
      setSavingId(null);
    }
  };

  const onRowDelete = async (id: string) => {
    setSavingId(id);
    try {
      await deleteStep(id);
      setSteps((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setSavingId(null);
    }
  };

  const add = async () => {
    setAdding(true);
    try {
      const payload = cleanse({
        name: (form.name || "").trim(),
        description: (form.description || "").trim(),
        order: Number(form.order ?? nextOrder),
        requiresApproval: !!form.requiresApproval,
        shareable: !!form.shareable,
        templateId: form.shareable ? (form.templateId || "").trim() || "shared" : undefined,
        autoApproveIfVerified: !!form.autoApproveIfVerified,
        roleId,
      });
      const newId = await addStep(payload as any);
      const fresh = await getStepsByRole(roleId);
      setSteps(fresh);
      setForm({
        name: "",
        description: "",
        order: nextOrder + 1,
        requiresApproval: false,
        shareable: false,
        templateId: "",
        autoApproveIfVerified: false,
        roleId,
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card className="mt-3">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-semibold">Steps</div>
          <div className="text-muted small">Use Markdown in descriptions for clear, scannable instructions.</div>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <Table responsive hover className="mb-0 align-middle">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Order</th>
              <th>Title</th>
              <th>Description</th>
              <th style={{ width: 160 }}>Requires approval</th>
              <th style={{ width: 120 }}>Shareable</th>
              <th style={{ width: 160 }}>Template ID</th>
              <th style={{ width: 200 }} className="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.id}>
                <td style={{ width: 80 }}>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={s.order ?? 0}
                    onChange={(e) => onRowChange(s.id, { order: Number(e.target.value) })}
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    value={s.name ?? ""}
                    onChange={(e) => onRowChange(s.id, { name: e.target.value })}
                    placeholder="Step title"
                  />
                </td>
                <td>
                  <MarkdownEditor
                    value={s.description ?? ""}
                    onChange={(v) => onRowChange(s.id, { description: v })}
                    rows={6}
                    minHeight={120}
                    placeholder="Description (Markdown allowed)"
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    checked={!!s.requiresApproval}
                    onChange={(e) => onRowChange(s.id, { requiresApproval: e.target.checked })}
                    label=""
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    checked={!!s.shareable}
                    onChange={(e) => onRowChange(s.id, { shareable: e.target.checked })}
                    label=""
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    value={s.templateId ?? ""}
                    onChange={(e) => onRowChange(s.id, { templateId: e.target.value })}
                    placeholder="crc, food-safety, etc."
                    disabled={!s.shareable}
                  />
                </td>
                <td className="text-end">
                  <div className="d-flex gap-2 justify-content-end">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={savingId === s.id}
                      onClick={() => onRowSave(s)}
                    >
                      {savingId === s.id ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      disabled={savingId === s.id}
                      onClick={() => onRowDelete(s.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Add new row */}
            <tr>
              <td>
                <Form.Control
                  size="sm"
                  type="number"
                  value={form.order ?? nextOrder}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="New step title"
                />
              </td>
              <td>
                <MarkdownEditor
                  value={form.description ?? ""}
                  onChange={(v) => setForm({ ...form, description: v })}
                  rows={6}
                  minHeight={120}
                  placeholder="Description (Markdown allowed)"
                />
              </td>
              <td className="text-center">
                <Form.Check
                  type="switch"
                  checked={!!form.requiresApproval}
                  onChange={(e) => setForm({ ...form, requiresApproval: e.target.checked })}
                  label=""
                />
              </td>
              <td className="text-center">
                <Form.Check
                  type="switch"
                  checked={!!form.shareable}
                  onChange={(e) => setForm({ ...form, shareable: e.target.checked })}
                  label=""
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  value={form.templateId ?? ""}
                  onChange={(e) => setForm({ ...form, templateId: e.target.value })}
                  placeholder="crc, food-safety, etc."
                  disabled={!form.shareable}
                />
              </td>
              <td className="text-end">
                <Button variant="primary" size="sm" onClick={add} disabled={adding}>
                  {adding ? "Adding..." : "Add step"}
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
