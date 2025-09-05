import { Badge, Container, OverlayTrigger, Tooltip } from "react-bootstrap";

interface Props {
  status: string;
}
export default function StatusBadge({ status }: Props) {
  const tooltips: { [k: string]: string } = {
    "Not Required":
      "This step is not required for you. If you think this is feel free to complete it anyway.",
    "Action Needed":
      "This is a flag to help you keep track. If you completed all actions then click the Action Complete button.",
    Complete:
      "This is a flag telling you that the risk manager has marked this step done.",
    "Awaiting Approval":
      "This is a flag saying that the risk manager has not confirmed your actions from this step.",
  };
  const renderTooltip = (props: any) => (
    <Tooltip id="button-tooltip" {...props}>
      {tooltips[status]}
    </Tooltip>
  );
  const colours: { [k: string]: string } = {
    "Not Required": "secondary",
    "Action Needed": "warning",
    Complete: "success",
    "Awaiting Approval": "info",
  };
  return (
    <Container>
      <OverlayTrigger
        placement="top"
        delay={{ show: 250, hide: 400 }}
        overlay={renderTooltip}
      >
        <Badge bg={colours[status]}>{status}</Badge>
      </OverlayTrigger>
    </Container>
  );
}
