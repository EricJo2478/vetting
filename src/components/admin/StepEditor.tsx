// src/components/admin/StepEditor.tsx
import { useEffect, useMemo, useState } from "react";
import { Button, Card, Form, Table } from "react-bootstrap";
import {
  addStep,
  deleteStep,
  getStepsByRole,
  updateStep,
} from "../../services/roleService";
import { StepDoc } from "../../types/Step";

export default function StepEditor({ roleId }: { roleId: string }) {
  const [steps, setSteps] = useState<StepDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<StepDoc>>({
    name: "",
    description: "",
    order: 1,
    requiresApproval: true,
    expiresInMonths: undefined,
    shareable: false,
    templateId: "",
  });

  const load = async () => {
    setLoading(true);
    const rows = await getStepsByRole(roleId);
    setSteps(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [roleId]);

  const nextOrder = useMemo(
    () => (steps.length ? Math.max(...steps.map((s) => s.order)) + 1 : 1),
    [steps]
  );

  const add = async () => {
    if (!form.name?.trim()) return;
    await addStep({
      roleId,
      name: form.name!.trim(),
      description: form.description ?? "",
      order: form.order ?? nextOrder,
      requiresApproval: !!form.requiresApproval,
      expiresInMonths: form.expiresInMonths
        ? Number(form.expiresInMonths)
        : null,
      shareable: !!form.shareable,
      templateId: form.shareable ? form.templateId || "shared" : "",
    });
    setForm({
      name: "",
      description: "",
      order: nextOrder,
      requiresApproval: true,
      shareable: false,
      templateId: "",
    });
    await load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this step?")) return;
    await deleteStep(id);
    await load();
  };

  const saveCell = async (id: string, patch: Partial<StepDoc>) => {
    await updateStep(id, patch);
    await load();
  };

  return (
    <Card className="mt-3">
      <Card.Header>Steps</Card.Header>
      <Card.Body>
        <Table responsive hover>
          <thead>
            <tr>
              <th style={{ width: 80 }}>Order</th>
              <th>Title</th>
              <th>Description</th>
              <th style={{ width: 140 }}>Requires approval</th>
              <th style={{ width: 160 }}>Expires (months)</th>
              <th style={{ width: 140 }}>Shareable</th>
              <th style={{ width: 120 }}>templateId</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s) => (
              <tr key={s.id}>
                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={s.order}
                    onChange={(e) =>
                      saveCell(s.id, { order: Number(e.target.value) })
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={s.name}
                    onChange={(e) => saveCell(s.id, { name: e.target.value })}
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    as="textarea"
                    rows={2}
                    value={s.description ?? ""}
                    onChange={(e) =>
                      saveCell(s.id, { description: e.target.value })
                    }
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    checked={!!s.requiresApproval}
                    onChange={(e) =>
                      saveCell(s.id, { requiresApproval: e.target.checked })
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="number"
                    value={form.expiresInMonths ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expiresInMonths: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                  />
                </td>
                <td className="text-center">
                  <Form.Check
                    type="switch"
                    checked={!!s.shareable}
                    onChange={(e) =>
                      saveCell(s.id, { shareable: e.target.checked })
                    }
                  />
                </td>
                <td>
                  <Form.Control
                    size="sm"
                    type="text"
                    value={s.templateId ?? ""}
                    onChange={(e) =>
                      saveCell(s.id, {
                        templateId: e.target.value || undefined,
                      })
                    }
                    placeholder="e.g. crc"
                  />
                </td>
                <td className="text-end">
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => remove(s.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <Form.Control
                  size="sm"
                  type="number"
                  value={form.order ?? nextOrder}
                  onChange={(e) =>
                    setForm({ ...form, order: Number(e.target.value) })
                  }
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  type="text"
                  value={form.name ?? ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Step name"
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  as="textarea"
                  rows={2}
                  value={form.description ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Description (Markdown allowed)"
                />
              </td>
              <td className="text-center">
                <Form.Check
                  type="switch"
                  checked={!!form.requiresApproval}
                  onChange={(e) =>
                    setForm({ ...form, requiresApproval: e.target.checked })
                  }
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  type="number"
                  value={form.expiresInMonths ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      expiresInMonths: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </td>
              <td className="text-center">
                <Form.Check
                  type="switch"
                  checked={!!form.shareable}
                  onChange={(e) =>
                    setForm({ ...form, shareable: e.target.checked })
                  }
                />
              </td>
              <td>
                <Form.Control
                  size="sm"
                  type="text"
                  value={form.templateId ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, templateId: e.target.value })
                  }
                  disabled={!form.shareable}
                  placeholder="e.g. crc"
                />
              </td>
              <td className="text-end">
                <Button variant="primary" size="sm" onClick={add}>
                  Add step
                </Button>
              </td>
            </tr>
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
