import { useEffect, useState } from "react";
import StatusBadge from "./StatusBadge";
import ModalButton from "./ModalButton";
import StepData from "../datasets/StepData";
import { Accordion, Button, Card, useAccordionButton } from "react-bootstrap";
import { StepStatus } from "../datasets/UserData";

interface Props {
  data: StepData;
  startingStatus?: StepStatus | null;
  onComplete: (id: string) => void;
}

export default function Step({
  data,
  startingStatus = null,
  onComplete,
}: Props) {
  const [status, setStatus] = useState(startingStatus as StepStatus | null);
  const decoratedOnClick = useAccordionButton(data.id);
  useEffect(() => setStatus(startingStatus), [startingStatus]);
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
            <StatusBadge tooltip status={status} />
          </div>
          {status === "Action Needed" && (
            <Button
              variant="primary"
              onClick={() => {
                setStatus("Awaiting Approval");
                onComplete(data.id);
              }}
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
