import { User } from "firebase/auth";
import { doc, DocumentReference, getDoc, updateDoc } from "firebase/firestore";
import { firestore, IdList } from "../App";
import { Permission } from "./AccountData";

export type RoleStatus = "Complete" | "In-Progress";
export type StepStatus = "Action Needed" | "Complete" | "Awaiting Approval";

export default class UserData {
  static async create(user: User | null, roles?: string[], steps?: string[]) {
    const data = new UserData(user);
    if (user === null) {
      return data;
    } else if (data.docRef) {
      let docs = await getDoc(data.docRef);
      if (docs.exists()) {
        const docData = docs.data();
        roles?.forEach(
          (id) =>
            (data.roles[id] = docData.roles[id] ? docData.roles[id] : null)
        );
        steps?.forEach(
          (id) =>
            (data.steps[id] = docData.steps[id] ? docData.steps[id] : null)
        );
      }

      docs = await getDoc(doc(firestore, "permissions", data.id));

      if (docs.exists()) {
        data.permission = docs.data().role;
      }
      return data;
    }
  }

  readonly id: string;
  readonly user: User | null;
  readonly docRef: DocumentReference | null;
  roles: IdList<RoleStatus | null> = {};
  steps: IdList<StepStatus | null> = {};
  permission: Permission = "volunteer";

  constructor(user: User | null) {
    this.id = user ? user.uid : "";
    this.user = user;
    this.docRef = user ? doc(firestore, "users", this.id) : null;
  }

  saveUserData() {
    if (this.docRef) {
      updateDoc(this.docRef, { roles: this.roles, steps: this.steps });
    }
  }

  isLoggedIn() {
    return this.user !== null;
  }
}
