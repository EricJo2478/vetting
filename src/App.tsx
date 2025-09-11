// Import the functions you need from the SDKs you need
import { onAuthStateChanged, signInWithPopup } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { SyntheticEvent, useEffect, useState } from "react";
import StepData, { fetchSteps } from "./datasets/StepData";
import RoleData, { fetchRoles } from "./datasets/RoleData";
import UserData from "./datasets/UserData";
import {
  Accordion,
  Button,
  Col,
  Container,
  FloatingLabel,
  Form,
  Modal,
  Nav,
  Row,
  Tab,
} from "react-bootstrap";
import NavBar from "./components/layout/NavBar";
import Step from "./components/Step";
import StatusBadge from "./components/StatusBadge";
import StatusBar from "./components/StatusBar";
import AccountData, { fetchAccounts, Permission } from "./datasets/AccountData";
import VettingCard from "./components/VettingCard";
import AccountCard from "./components/AccountCard";
import { auth, firestore, googleProvider } from "./services/firebase";

export interface IdList<T> {
  [id: string]: T;
}

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(new UserData(null) as UserData);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState({} as IdList<RoleData>);
  const [steps, setSteps] = useState({} as IdList<StepData>);
  const [accounts, setAccounts] = useState({} as IdList<AccountData>);
  const [phantomModal, setPhantomModal] = useState(false);
  const handleClose = () => setPhantomModal(false);
  useEffect(() => {
    fetchSteps().then((steps) => {
      fetchRoles(steps).then((roles) => {
        setRoles(roles);
        setSteps(steps);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          UserData.create(user, Object.keys(roles), Object.keys(steps)).then(
            (data) => {
              if (data) {
                setUser(data);
                setLoading(false);
                if (
                  data.permission === "coordinator" ||
                  data.permission === "manager"
                ) {
                  fetchAccounts().then((accounts) => setAccounts(accounts));
                }
              }
            }
          );
        });

        // Clean up the listener when the component unmounts
        return () => unsubscribe();
      });
    });
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (user.docRef) {
        const unsubscribe = onSnapshot(user.docRef, (snapshot) => {
          const docs = snapshot.data();
          if (docs) {
            Object.keys(roles).forEach(
              (id) => (user.roles[id] = docs.roles[id] ? docs.roles[id] : null)
            );
            Object.keys(steps).forEach(
              (id) => (user.roles[id] = docs.roles[id] ? docs.roles[id] : null)
            );
            setUser(user);
          }
        });

        // Cleanup function to unsubscribe when the component unmounts
        return () => unsubscribe();
      }
    }
  }, [user, loading]);

  useEffect(() => {
    if (!loading && user) {
      if (user.docRef && user.permission !== "volunteer") {
        const unsubscribe = onSnapshot(
          collection(firestore, "users"),
          async (snapshot) => {
            const updatedAccounts = { ...accounts };
            for (const data of snapshot.docs) {
              if (data.id !== "UklZSTqwpUNOyLjCFZ8yyZAV5oB2") {
                const docs = data.data();
                const permission = (
                  await getDoc(doc(firestore, "permissions", data.id))
                ).data();
                updatedAccounts[data.id] = new AccountData(
                  data.id,
                  docs.name,
                  permission ? permission.role : "volunteer",
                  docs.roles,
                  docs.steps
                );
              }
            }
            setAccounts(updatedAccounts);
          }
        );

        // Cleanup function to unsubscribe when the component unmounts
        return () => unsubscribe();
      }
    }
  }, [user, loading]);

  const handleGoogleLogin = async () => {
    try {
      const user = await signInWithPopup(auth, googleProvider);
      UserData.create(user.user, Object.keys(roles), Object.keys(steps)).then(
        (data) => (data ? setUser(data) : null)
      );

      // User successfully logged in, redirect or update UI
      console.log("User logged in with Google!");
    } catch (error) {
      console.error("Error during Google login:", error);
    }
  };

  if (loading) {
    return <h1>Loading Page...</h1>;
  }

  return (
    <>
      <NavBar
        user={user}
        setPage={setPage}
        setUser={setUser}
        openLogin={handleGoogleLogin}
      />
      {page === "home" && (
        <>
          <Container className="ms-2">
            <h1>Welcome to the CISV Saskatoon Volunteer Vetting page</h1>
            <p>
              There are many different roles you can fill as a volunteer within
              our chapter. Each role has different vetting requirements to
              ensure safeguarding for participants. You can be vetted for
              multiple roles at a time. <br />
              You can view the steps to be vetted for each role seperately by
              selecting it on the left. If you wish to use our vetting tracker
              please log in by pressing the log in button in the top right
              corner.
            </p>
          </Container>
          <Tab.Container>
            <Row className="ms-0">
              <Col sm={3}>
                <h3 className="ms-1">Roles</h3>
                <Nav variant="pills" className="flex-column">
                  {Object.values(roles).map((role) => (
                    <Nav.Item key={role.id}>
                      <Nav.Link eventKey={role.id}>
                        {role.name}
                        {user.user && (
                          <StatusBadge status={user.roles[role.id]} />
                        )}
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
                      {user.isLoggedIn() && user.roles[role.id] === null && (
                        <Button
                          onClick={() => {
                            user.roles[role.id] = "In-Progress";
                            role.steps.forEach((step) => {
                              if (user.steps[step.id] === null)
                                user.steps[step.id] = "Action Needed";
                            });
                            user.saveUserData();
                          }}
                        >
                          Start Vetting
                        </Button>
                      )}
                      {user.isLoggedIn() && user.roles[role.id] !== null && (
                        <StatusBar stepStatus={user.steps} steps={role.steps} />
                      )}
                      <Accordion>
                        {Object.values(role.steps).map((step) => (
                          <Step
                            key={step.id}
                            data={step}
                            startingStatus={
                              user.roles[role.id] ? user.steps[step.id] : null
                            }
                            onComplete={(id: string) => {
                              if (user) {
                                user.steps[id] = "Awaiting Approval";
                                user.saveUserData();
                              }
                            }}
                          />
                        ))}
                      </Accordion>
                    </Tab.Pane>
                  ))}
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </>
      )}
      {page === "vetting" && (
        <Row xs={1} md={2} lg={3} className="g-4">
          {Object.values(accounts)
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((account) => (
              <VettingCard
                key={account.id}
                data={account}
                roles={roles}
                steps={steps}
              />
            ))}
        </Row>
      )}
      {page === "accounts" && (
        <>
          <Modal show={phantomModal} onHide={handleClose}>
            <Modal.Header closeButton>
              <Modal.Title>Phantom User</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Form
                onSubmit={(e: SyntheticEvent) => {
                  e.preventDefault();
                  handleClose();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const payload = Object.fromEntries(formData);
                  const data: {
                    name: string;
                    roles: IdList<null>;
                    steps: IdList<null>;
                  } = { name: payload.name as string, roles: {}, steps: {} };
                  Object.keys(roles).forEach((id) => (data.roles[id] = null));
                  Object.keys(steps).forEach((id) => (data.steps[id] = null));

                  addDoc(collection(firestore, "users"), data).then((ref) => {
                    setAccounts((prevState) => ({
                      ...prevState,
                      [ref.id]: new AccountData(
                        ref.id,
                        data.name,
                        payload.permission as Permission,
                        data.roles,
                        data.steps
                      ),
                    }));
                    if (payload.permission !== "volunteer") {
                      setDoc(doc(firestore, "permissions", ref.id), {
                        role: payload.permission as string,
                      });
                    }
                  });
                }}
              >
                <FloatingLabel controlId="name" label="Name" className="mb-3">
                  <Form.Control type="text" name="name" placeholder="Name" />
                </FloatingLabel>
                <FloatingLabel controlId="permission" label="Permission Level">
                  <Form.Select
                    name="permission"
                    aria-label="Floating label select example"
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="manager">Manager</option>
                  </Form.Select>
                </FloatingLabel>
                <Button variant="secondary" onClick={handleClose}>
                  Close
                </Button>
                <Button variant="primary" type="submit">
                  Add
                </Button>
              </Form>
            </Modal.Body>
          </Modal>
          <Button onClick={() => setPhantomModal(true)}>
            Add Phantom User
          </Button>
          <Row xs={1} md={2} xl={3} className="g-4">
            {Object.values(accounts)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((account) => (
                <AccountCard
                  setAccounts={setAccounts}
                  key={account.id}
                  data={account}
                  roles={roles}
                  steps={steps}
                />
              ))}
          </Row>
        </>
      )}
    </>
  );
}
