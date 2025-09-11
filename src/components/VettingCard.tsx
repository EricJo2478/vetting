import {
  Button,
  ButtonGroup,
  Card,
  Col,
  ListGroup,
  Modal,
} from "react-bootstrap";
import AccountData from "../datasets/AccountData";
import RoleData from "../datasets/RoleData";
import { IdList } from "../App";
import StepData from "../datasets/StepData";
import { RoleStatus, StepStatus } from "../datasets/UserData";
import { useState } from "react";
import StatusBadge from "./StatusBadge";

interface Props {
  data: AccountData;
  roles: IdList<RoleData>;
  steps: IdList<StepData>;
}

export default function VettingCard({ data, roles, steps }: Props) {
  return (
    <Col>
      <Card>
        <Card.Body>
          <Card.Title>{data.name}</Card.Title>
          <Card.Subtitle className="mb-2 text-muted">
            {data.permission}
          </Card.Subtitle>
          <ListGroup>
            {Object.keys(data.roles).map((id) => (
              <VettingModal
                key={id}
                role={roles[id]}
                roleStatus={data.roles[id]}
                steps={data.steps}
              />
            ))}
          </ListGroup>
        </Card.Body>
      </Card>
    </Col>
  );
}

interface ModalProps {
  role: RoleData;
  roleStatus: RoleStatus | null;
  steps: IdList<StepStatus | null>;
}

function VettingModal({ role, roleStatus, steps }: ModalProps) {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);

  if (roleStatus) {
    const stepsRendered: [string, StepStatus][] = [];
    role.steps.forEach((step) => {
      const status = steps[step.id];
      if (status && status !== "Complete") {
        stepsRendered.push([step.name, status]);
      }
    });
    return (
      <>
        <Modal show={show} onHide={handleClose}>
          <Modal.Header closeButton>
            <Modal.Title>Remaining Steps</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ListGroup>
              {stepsRendered.map((step) => (
                <ListGroup.Item key={step[0]}>
                  {step[0]}
                  <StatusBadge status={step[1]} />
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>

        <ListGroup.Item
          onClick={roleStatus == "Complete" ? undefined : () => setShow(true)}
        >
          {role.name} <StatusBadge status={roleStatus} />
        </ListGroup.Item>
      </>
    );
  } else {
    return false;
  }
}
