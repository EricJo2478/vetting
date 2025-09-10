import { Accordion, Button, Card, useAccordionButton } from "react-bootstrap";
import StatusBadge from "./StatusBadge";
import { StepStatus } from "../datasets/UserData";

interface Props {
  eventKey: string;
  title: string;
  status?: StepStatus | null;
  children?: any;
  handleComplete: () => void;
}

export default function VettingItem({
  eventKey,
  title,
  status = null,
  children = "",
  handleComplete,
}: Props) {
  return (
    <Card>
      <ItemHeader
        hasButton={status === "Action Needed"}
        onButtonClick={handleComplete}
        eventKey={eventKey}
        status={status}
      >
        {title}
      </ItemHeader>
      <Accordion.Collapse eventKey={eventKey}>
        <Card.Body>{children}</Card.Body>
      </Accordion.Collapse>
    </Card>
  );
}

interface HeaderProps {
  children?: string;
  eventKey: string;
  onButtonClick: (e: any) => void;
  hasButton: boolean;
  status: StepStatus | null;
}

function ItemHeader({
  children = "",
  eventKey,
  onButtonClick,
  hasButton,
  status,
}: HeaderProps) {
  const decoratedOnClick = useAccordionButton(eventKey);

  return (
    <>
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
            {children}
            <StatusBadge status={status} />
          </div>
          {hasButton && (
            <Button variant="primary" onClick={onButtonClick}>
              Mark Action Completed
            </Button>
          )}
        </div>
      </Card.Header>
    </>
  );
}
