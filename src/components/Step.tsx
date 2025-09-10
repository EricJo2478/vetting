import { ReactNode, useState } from "react";
import StatusBadge, { Status } from "./StatusBadge";
import ModalButton from "./ModalButton";
import StepData from "../datasets/StepData";
import { Accordion, Button, Card, useAccordionButton } from "react-bootstrap";

interface Props {
  data: StepData;
}

export default function Step({ data }: Props) {
  const [status, setStatus] = useState(undefined as Status | undefined);
  const decoratedOnClick = useAccordionButton(data.id);
  return (
    <Card>
      <Card.Header>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            onClick={decoratedOnClick}
            style={{ flexGrow: 1, cursor: "pointer" }}
          >
            {data.name}
            <StatusBadge status={status} />
          </div>
          {status === "Action Needed" && (
            <Button
              variant="primary"
              onClick={() => setStatus("Awaiting Approval")}
            >
              Mark Action Completed
            </Button>
          )}
        </div>
      </Card.Header>
      <Accordion.Collapse eventKey={data.id}>
        <Card.Body>
          {data.html}
          {data.button && (
            <ModalButton button={data.button} header={data.button}>
              {data.modal}
            </ModalButton>
          )}
        </Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}
