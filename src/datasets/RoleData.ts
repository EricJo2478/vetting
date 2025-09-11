import { collection, getDocs } from "firebase/firestore";
import { IdList } from "../App";
import StepData from "./StepData";
import { firestore } from "../services/firebase";

export default class RoleData {
  readonly id: string;
  readonly name: string;
  readonly steps: StepData[] = [];

  constructor(id: string, name: string, steps: StepData[]) {
    this.id = id;
    this.name = name;
    this.steps = steps;
  }

  compare(other: RoleData) {
    return this.name.localeCompare(other.name);
  }
}

export async function fetchRoles(stepList: IdList<StepData>) {
  const dataSet: IdList<RoleData> = {};
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
    dataSet[doc.id] = new RoleData(doc.id, docData.name, steps);
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}
