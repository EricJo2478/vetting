import { ReactNode } from "react";
import parse from "html-react-parser";
import { collection, getDocs } from "firebase/firestore";
import { IdList } from "../App";
import { firestore } from "../services/firebase";

export default class StepData {
  readonly id: string;
  readonly name: string;
  readonly html: ReactNode;
  readonly button?: string;
  readonly modal?: ReactNode;

  constructor(
    id: string,
    name: string,
    htmlString: string,
    button?: string,
    modal?: string
  ) {
    this.id = id;
    this.name = name;
    this.html = parse(htmlString);
    this.button = button;
    this.modal = modal ? parse(modal) : undefined;
  }

  compare(other: StepData) {
    return this.name.localeCompare(other.name);
  }
}

export async function fetchSteps() {
  const dataSet: IdList<StepData> = {};
  const data = await getDocs(collection(firestore, "steps"));
  for (const doc of data.docs) {
    const docData = doc.data();
    dataSet[doc.id] = new StepData(
      doc.id,
      docData.name,
      docData.description,
      docData.button,
      docData.modal
    );
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  return sortedData;
}
