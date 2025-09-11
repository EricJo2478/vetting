import {
  Accordion,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  ListGroup,
  Modal,
  Row,
  ToggleButton,
  ToggleButtonGroup,
} from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import AccountData from "../datasets/AccountData";
import RoleData from "../datasets/RoleData";
import { IdList } from "../App";
import StepData from "../datasets/StepData";
import { useState } from "react";
import StatusBadge from "./StatusBadge";
import { RoleStatus, StepStatus } from "../datasets/UserData";

const statusToVariant = {
  "Action Needed": "warning",
  Complete: "success",
  "": "secondary",
  "Awaiting Approval": "info",
  "In-Progress": "info",
};

interface Props {
  setAccounts: (e: any) => void;
  data: AccountData;
  roles: IdList<RoleData>;
  steps: IdList<StepData>;
}

export default function AccountCard({
  setAccounts,
  data,
  roles,
  steps,
}: Props) {
  const compareStatus = (
    a: [string, StepStatus | null],
    b: [string, StepStatus | null]
  ) => {
    if (a[1] === b[1]) {
      return steps[a[0]].name.localeCompare(steps[b[0]].name);
    }
    const order = [null, "Awaiting Approval", "Action Needed", "Complete"];
    if (order.indexOf(a[1]) > order.indexOf(b[1])) {
      return -1;
    }
    return 1;
  };

  const [nameModal, setNameModal] = useState(false);
  const [permissionModal, setPermissionModal] = useState(false);
  const [stepsModal, setStepsModal] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const handleClose = () => {
    setNameModal(false);
    setPermissionModal(false);
    setStepsModal(false);
    setRoleModal(false);
  };

  const entries = Object.entries({ ...data.steps });
  entries.sort(compareStatus);
  const statuses = Object.fromEntries(entries);

  return (
    <>
      <Modal show={stepsModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit {data.name} Steps</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const payload = Object.fromEntries(formData);
              Object.keys(payload).forEach(
                (id) =>
                  (data.steps[id] = payload[id]
                    ? (payload[id] as StepStatus)
                    : null)
              );
              data.saveChanges(setAccounts, roles);
              handleClose();
            }}
          >
            {Object.keys(data.steps).map((id) => {
              const step = steps[id];
              return (
                <StepSelect key={id} step={step} status={data.steps[id]} />
              );
            })}
            <div>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={roleModal} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Edit {data.name} Roles</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const payload = Object.fromEntries(formData);
              Object.keys(payload).forEach(
                (id) =>
                  (data.roles[id] = payload[id]
                    ? (payload[id] as RoleStatus)
                    : null)
              );
              data.saveChanges(setAccounts, roles);
              handleClose();
            }}
          >
            {Object.keys(data.roles).map((id) => {
              const role = roles[id];
              return (
                <RoleSelect key={id} role={role} status={data.roles[id]} />
              );
            })}
            <div>
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Save Changes
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      <Col>
        <Card>
          <Card.Body>
            <Card.Title>
              <h2>
                {data.name}
                <Button variant="outline-secondary" size="sm" disabled>
                  <PencilSquare />
                </Button>
              </h2>
            </Card.Title>
            <Card.Subtitle className="mb-2 text-muted">
              {data.permission}
              <Button variant="outline-secondary" size="sm" disabled>
                <PencilSquare />
              </Button>
            </Card.Subtitle>
            <Row>
              <Col>
                <Accordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Roles</Accordion.Header>
                    <Accordion.Body>
                      <ListGroup onClick={() => setRoleModal(true)}>
                        {Object.keys(roles).map((id) => {
                          const role = roles[id];
                          const status = data.roles[id];
                          return (
                            <ListGroup.Item
                              key={id}
                              variant={statusToVariant[status ? status : ""]}
                              action
                            >
                              {role.name}
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </Col>
              <Col>
                <Accordion>
                  <Accordion.Item eventKey="0">
                    <Accordion.Header>Steps</Accordion.Header>
                    <Accordion.Body>
                      <ListGroup onClick={() => setStepsModal(true)}>
                        {Object.keys(steps).map((id) => {
                          const step = steps[id];
                          const status = data.steps[id];
                          return (
                            <ListGroup.Item
                              key={id}
                              variant={statusToVariant[status ? status : ""]}
                              action
                            >
                              {step.name}
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </>
  );
}

interface StepSelectProps {
  step: StepData;
  status: StepStatus | null;
}

function StepSelect({ step, status }: StepSelectProps) {
  return (
    <>
      <h4>{step.name}</h4>
      <ToggleButtonGroup
        className="mb-3"
        type="radio"
        name={step.id}
        defaultValue={status ? status : ""}
      >
        <ToggleButton
          variant="outline-secondary"
          id={step.id + "none"}
          value={""}
        >
          None
        </ToggleButton>
        <ToggleButton
          variant="outline-warning"
          id={step.id + "action-needed"}
          value={"Action Needed"}
        >
          Action Needed
        </ToggleButton>
        <ToggleButton
          variant="outline-info"
          id={step.id + "awaiting-approval"}
          value={"Awaiting Approval"}
        >
          Awaiting Approval
        </ToggleButton>
        <ToggleButton
          variant="outline-success"
          id={step.id + "complete"}
          value={"Complete"}
        >
          Complete
        </ToggleButton>
      </ToggleButtonGroup>
    </>
  );
}

interface RoleSelectProps {
  role: RoleData;
  status: RoleStatus | null;
}

function RoleSelect({ role, status }: RoleSelectProps) {
  return (
    <>
      <h4>{role.name}</h4>
      <ToggleButtonGroup
        className="mb-3"
        type="radio"
        name={role.id}
        defaultValue={status ? status : ""}
      >
        <ToggleButton
          variant="outline-secondary"
          id={role.id + "none"}
          value={""}
        >
          None
        </ToggleButton>
        <ToggleButton
          variant="outline-info"
          id={role.id + "in-progress"}
          value={"In-Progress"}
        >
          In-Progress
        </ToggleButton>
        <ToggleButton
          variant="outline-success"
          id={role.id + "complete"}
          value={"Complete"}
        >
          Complete
        </ToggleButton>
      </ToggleButtonGroup>
    </>
  );
}
