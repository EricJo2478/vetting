import { ReactNode } from "react";
import parse from "html-react-parser";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../App";
import VettingItem from "./VettingItem";
import { Status } from "./StatusBadge";

export async function fetchSteps() {
  const dataSet: { [id: string]: Step } = {};
  const data = await getDocs(collection(firestore, "steps"));
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new Step(doc.id, docData.name, docData.description);
  }
  return dataSet;
}

const statusString: Status[] = [
  "Action Needed",
  "Awaiting Approval",
  "Complete",
  "Not Required",
];

export default class Step {
  private readonly id: string;
  private readonly name: string;
  private readonly html: ReactNode;
  private status?: number;

  constructor(id: string, name: string, htmlString: string) {
    this.id = id;
    this.name = name;
    this.html = <div>{parse(htmlString)}</div>;
  }

  toString() {
    return this.name;
  }

  getName() {
    return this.name;
  }

  getHtml() {
    return this.html;
  }

  getId() {
    return this.id;
  }

  setStatus(status: number) {
    this.status = status;
  }

  render() {
    return (
      <VettingItem
        key={this.id}
        eventKey={this.id}
        title={this.name}
        status={this.status ? statusString[this.status] : undefined}
        handleComplete={() => (this.status = 1)}
      >
        {this.html}
      </VettingItem>
    );
  }
}
