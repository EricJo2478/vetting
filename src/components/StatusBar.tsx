import { ProgressBar } from "react-bootstrap";
import { StepStatus } from "../datasets/UserData";
import StepData from "../datasets/StepData";
import { ReactNode } from "react";

interface Props {
  stepStatus: { [id: string]: StepStatus | null };
  steps: StepData[];
}

export default function StatusBar({ stepStatus, steps }: Props) {
  let completed = 0;
  let waiting = 0;

  steps.forEach((step) => {
    if (stepStatus[step.id] === "Complete") {
      completed += 1;
    } else if (stepStatus[step.id] === "Awaiting Approval") {
      waiting += 1;
    }
  });

  completed = Math.ceil((completed / steps.length) * 100);
  waiting = Math.ceil((waiting / steps.length) * 100);

  return (
    <ProgressBar className="mb-3">
      <ProgressBar striped variant="success" now={completed} key={2} />
      <ProgressBar striped variant="info" now={waiting} key={1} />
    </ProgressBar>
  );
}
