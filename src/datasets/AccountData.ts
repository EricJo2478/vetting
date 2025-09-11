import {
  collection,
  doc,
  DocumentReference,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { firestore, IdList } from "../App";
import { RoleStatus, StepStatus } from "./UserData";
import RoleData from "./RoleData";

export type Permission = "volunteer" | "manager" | "coordinator";

export default class AccountData {
  readonly id: string;
  readonly name: string;
  readonly permission: Permission;
  readonly roles: IdList<RoleStatus | null> = {};
  readonly steps: IdList<StepStatus | null> = {};
  readonly docRef: DocumentReference;

  constructor(
    id: string,
    name: string,
    permission: Permission,
    roles: IdList<RoleStatus | null>,
    steps: IdList<StepStatus | null>
  ) {
    this.id = id;
    this.name = name;
    this.permission = permission;
    this.roles = roles;
    this.steps = steps;
    this.docRef = doc(firestore, "users", this.id);
  }

  compare(other: AccountData) {
    return this.name.localeCompare(other.name);
  }

  saveChanges(setAccounts: (e: any) => void, roles: IdList<RoleData>) {
    setAccounts((prevState: any) => ({ ...prevState }));
    Object.values(roles).forEach((role) => {
      if (this.roles[role.id] !== "Complete") {
        let completed = true;
        Object.values(role.steps).forEach((step) => {
          if (this.steps[step.id] !== "Complete") {
            completed = false;
          }
        });
        if (completed) {
          this.roles[role.id] = "Complete";
        }
      }
    });

    if (this.docRef) {
      updateDoc(this.docRef, { roles: this.roles, steps: this.steps });
    }
  }
}

export async function fetchAccounts() {
  const dataSet: IdList<AccountData> = {};
  const data = await getDocs(collection(firestore, "users"));
  for (const accountDoc of data.docs) {
    if (accountDoc.id !== "UklZSTqwpUNOyLjCFZ8yyZAV5oB2") {
      const docData = accountDoc.data();
      const permission = (
        await getDoc(doc(firestore, "permissions", accountDoc.id))
      ).data();
      dataSet[accountDoc.id] = new AccountData(
        accountDoc.id,
        docData.name,
        permission ? permission.role : "volunteer",
        docData.roles,
        docData.steps
      );
    }
  }
  const entries = Object.entries(dataSet);
  entries.sort((a, b) => a[1].compare(b[1]));
  const sortedData = Object.fromEntries(entries);
  console.log(sortedData);
  return sortedData;
}
