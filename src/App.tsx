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
import UserData, { fetchUserData } from "./datasets/UserData";
import { Accordion, Button, Col, Nav, Row, Tab } from "react-bootstrap";
import Step from "./components/Step";
import StatusBadge from "./components/StatusBadge";
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
  const [user, setUser] = useState(null as UserData | null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState({} as IdList<RoleData>);
  const [steps, setSteps] = useState({} as IdList<StepData>);

  useEffect(() => {
    if (!loading) {
      fetchSteps().then((steps) => {
        fetchRoles(steps).then((roles) => {
          setRoles(roles);
          if (user)
            fetchUserData(user, Object.keys(roles), Object.keys(steps)).then(
              (userData) => setUser(userData)
            );
        });
        setSteps(steps);
      });
    }
  }, [loading]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user ? new UserData(user) : null);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(user.docRef, (snapshot) => {
        const docs = snapshot.data();
        if (docs === undefined) {
          fetchUserData(user, Object.keys(roles), Object.keys(steps)).then(
            (userData) => setUser(userData)
          );
        } else {
          const userData = new UserData(user.user, docs);
          setUser(userData);
        }
      });

      // Cleanup function to unsubscribe when the component unmounts
      return () => unsubscribe();
    }
  }, [user]); // Empty dependency array means this effect runs once on mount

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithPopup(auth, googleProvider);
      setUser(new UserData(user.user));
      // User successfully logged in, redirect or update UI
      console.log("User logged in with Google!");
    } catch (error) {
      console.error("Error during Google login:", error);
    }
  };

  return (
    <>
      <NavBar
        user={user?.user}
        setPage={setPage}
        setUser={setUser}
        openLogin={handleGoogleLogin}
      />
      <h1>Welcome to the CISV Saskatoon Volunteer Vetting page</h1>
      <p>
        There are many different roles you can fill as a volunteer within our
        chapter. Each role has different vetting requirements to ensure
        safeguarding for participants. You can be vetted for multiple roles at a
        time. <br />
        You can view the steps to be vetted for each role seperately by
        selecting it on the left. If you wish to use our vetting tracker please
        log in by pressing the log in button in the top right corner.
      </p>
      {page === "home" && (
        <Tab.Container id="left-tabs-example">
          <Row>
            <Col sm={3}>
              <h3>Roles</h3>
              <Nav variant="pills" className="flex-column">
                {Object.values(roles).map((role) => (
                  <Nav.Item key={role.id}>
                    <Nav.Link eventKey={role.id}>
                      {role.name}
                      {user && <StatusBadge status={user.roles[role.id]} />}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </Col>
            <Col sm={9}>
              <h3>Vetting Steps</h3>
              <Tab.Content>
                {Object.values(roles).map((role) => (
                  <Tab.Pane eventKey={role.id} key={role.id}>
                    {user && user.roles[role.id] === null && (
                      <Button
                        onClick={() => {
                          user.roles[role.id] = "In-Progress";
                          user.saveUserData();
                        }}
                      >
                        Start Vetting
                      </Button>
                    )}
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
