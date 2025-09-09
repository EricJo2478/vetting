import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../App";
import Step from "./Step";
import { Accordion } from "react-bootstrap";

export async function fetchRoles(stepList: { [id: string]: Step }) {
  const dataSet: { [id: string]: Role } = {};
  const data = await getDocs(collection(firestore, "roles"));
  for (const doc of data.docs) {
    const docData = doc.data();
    const steps = [];
    for (const stepId of docData.steps) {
      const step = stepList[stepId];
      if (step) {
        steps.push(step);
      }
    }
    dataSet[doc.id] = new Role(doc.id, docData.name, steps);
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}

export default class Role {
  private readonly steps: Step[];
  private readonly id: string;
  private readonly name: string;

  constructor(id: string, name: string, steps: Step[]) {
    this.id = id;
    this.name = name;
    this.steps = steps;
  }

  compare(other: Role) {
    return this.toString().localeCompare(other.toString());
  }

  toString() {
    return this.name;
  }

  getName() {
    return this.name;
  }

  getId() {
    return this.id;
  }

  getSteps() {
    return this.steps;
  }

  mapSteps(func: (step: Step) => any) {
    return this.steps.map(func);
  }

  render() {
    return (
      <Accordion key={this.id}>
        {Object.values(this.steps).map((step) => step.render())}
      </Accordion>
    );
  }
}
