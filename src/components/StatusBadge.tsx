import { JSX, ReactElement } from "react";
import { Badge, OverlayTrigger, Popover, Tooltip } from "react-bootstrap";

interface Props {
  tooltip?: boolean;
  status: string | null;
  popover?: JSX.Element;
  placement?: "top" | "bottom" | "left" | "right";
}
export default function StatusBadge({
  popover,
  status,
  tooltip = false,
  placement = "top",
}: Props) {
  const tooltips: { [s: string]: string } = {
    "Action Needed":
      "This is a flag to help you keep track. If you completed all actions then click the Action Complete button.",
    Complete:
      "This is a flag telling you that the risk manager has marked this step done.",
    "Awaiting Approval":
      "This is a flag saying that the risk manager has not confirmed your actions from this step.",
  };
  const renderTooltip = (props: any) =>
    status && tooltip && tooltips[status] ? (
      <Tooltip id="button-tooltip" {...props}>
        {tooltips[status]}
      </Tooltip>
    ) : (
      <span></span>
    );
  const colours: { [s: string]: string } = {
    "Action Needed": "warning",
    Complete: "success",
    "Awaiting Approval": "info",
    "In-Progress": "info",
  };

  if (status && colours[status]) {
    return (
      <OverlayTrigger
        placement={placement}
        delay={{ show: 250, hide: 400 }}
        overlay={popover ? popover : renderTooltip}
      >
        <Badge className="ms-1" bg={colours[status]}>
          {status}
        </Badge>
      </OverlayTrigger>
    );
  }
  return false;
}
