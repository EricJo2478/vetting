import { Accordion, Button, Card, useAccordionButton } from "react-bootstrap";
import StatusBadge, { Status } from "./StatusBadge";

interface Props {
  eventKey: string;
  title: string;
  status?: Status;
  children?: any;
  handleComplete: () => void;
}

export default function VettingItem({
  eventKey,
  title,
  status,
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
  status?: Status;
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
