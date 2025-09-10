import { User } from "firebase/auth";
import {
  doc,
  DocumentData,
  DocumentReference,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firestore, IdList } from "../App";

export type RoleStatus = "Complete" | "In-Progress";
export type StepStatus = "Action Needed" | "Complete" | "Awaiting Approval";

export default class UserData {
  readonly id: string;
  readonly user: User;
  readonly docRef: DocumentReference;
  readonly roles: { [id: string]: RoleStatus };
  readonly steps: { [id: string]: StepStatus };

  constructor(user: User, data?: DocumentData) {
    this.id = user.uid;
    this.user = user;
    this.docRef = doc(firestore, "users", this.id);

    if (data) {
      this.roles = data.roles;
      this.steps = data.steps;
    } else {
      this.roles = {};
      this.steps = {};
    }
  }

  saveUserData() {
    updateDoc(this.docRef, { roles: this.roles, steps: this.steps });
  }
}

export async function fetchUserData(
  user: UserData,
  roleIds: string[],
  stepIds: string[]
) {
  const doc = await getDoc(user.docRef);
  const docData = doc.data();
  if (docData) {
    return new UserData(user.user, docData);
  } else {
    const rolesData: IdList<RoleStatus | null> = {};
    const stepsData: IdList<StepStatus | null> = {};

    roleIds.forEach((id) => (rolesData[id] = null));
    stepIds.forEach((id) => (stepsData[id] = null));

    const data = {
      name: user.user.displayName,
      roles: rolesData,
      steps: stepsData,
    };
    setDoc(user.docRef, data);
    return new UserData(user.user, data);
  }
}
