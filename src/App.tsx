// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import {
  doc,
  DocumentReference,
  getFirestore,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import StepData, { fetchSteps } from "./datasets/StepData";
import RoleData, { fetchRoles } from "./datasets/RoleData";
import Role from "./components/Role";
import { Accordion, Col, Nav, Row, Tab } from "react-bootstrap";
import Step from "./components/Step";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBZo1hbq7C20pS_OK-ahyiUE96lcjAgWmQ",
  authDomain: "vetting-caf2f.firebaseapp.com",
  projectId: "vetting-caf2f",
  storageBucket: "vetting-caf2f.firebasestorage.app",
  messagingSenderId: "727627155798",
  appId: "1:727627155798:web:e89bdc979c27e611c12ef7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export interface IdList<T> {
  [id: string]: T;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState({} as IdList<RoleData>);
  const [steps, setSteps] = useState({} as IdList<StepData>);

  let docRef: null | DocumentReference = null;
  if (user) {
    docRef = doc(firestore, "users", user.uid);
  }

  const generateUserData = () => {
    if (user && docRef) {
      const data = { name: user.displayName };
      setDoc(docRef, data);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchSteps().then((steps) => {
        fetchRoles(steps).then((roles) => setRoles(roles));
        setSteps(steps);
      });
    }
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (!loading && docRef !== null) {
      const unsubscribe = onSnapshot(docRef, (snapshot) => {
        const docs = snapshot.data();
        if (docs === undefined) {
          // generateUserData();
        } else {
          // const statuses: { [id: string]: number } = docs.statuses;
          // const keys = Object.keys(statuses);
          // Object.values(steps).forEach((step) => {
          //   if (keys.includes(step.id)) {
          //     step.setStatus(statuses[step.getId()]);
          //   }
          // });
        }
      });

      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [loading, user]); // Empty dependency array means this effect runs once on mount

  const handleGoogleLogin = async () => {
    console.log(auth, googleProvider);
    try {
      const user = await signInWithPopup(auth, googleProvider);
      setUser(user.user);
      // User successfully logged in, redirect or update UI
      console.log("User logged in with Google!");
    } catch (error) {
      console.error("Error during Google login:", error);
    }
  };

  return (
    <>
      <NavBar
        user={user}
        setPage={setPage}
        setUser={setUser}
        openLogin={handleGoogleLogin}
      />
      <h1>Welcome to the CISV Saskatoon Volunteer Vetting page</h1>
      <p>
        There are many different roles you can fill as a volunteer within our
        chapter. Each role has different vetting requirements to ensure
        safeguarding for participants. You can be vetted for multiple roles at a
        time. You can view the steps to be vetted for each role seperately. If
        you wish to use our vetting tracker please log in by pressing the log in
        button on the top right corner. Once logged in you can select a role to
        help you track your vetting status.
      </p>
      {/* <p>
        Below you will find a section on each step walking you through what is
        required to volunteer at a CISV programme (if you are over 18 years
        old).
      </p> */}
      {page === "home" && (
        <Tab.Container id="left-tabs-example" defaultActiveKey="first">
          <Row>
            <Col sm={3}>
              <Nav variant="pills" className="flex-column">
                {Object.values(roles).map((role) => (
                  <Role key={role.id} data={role} />
                ))}
              </Nav>
            </Col>
            <Col sm={9}>
              <Tab.Content>
                {Object.values(roles).map((role) => (
                  <Tab.Pane eventKey={role.id} key={role.id}>
                    <Accordion>
                      {Object.values(role.steps).map((step) => (
                        <Step key={step.id} data={step} />
                      ))}
                    </Accordion>
                  </Tab.Pane>
                ))}
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      )}
    </>
  );
}
