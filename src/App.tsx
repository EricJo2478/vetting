// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";
import { Accordion } from "react-bootstrap";
import ModalButton from "./components/ModalButton";
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
export const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

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
        Below you will find a section on each step walking you through what is
        required to volunteer at a CISV programme (if you are over 18 years
        old).
      </p>
      <Accordion defaultActiveKey="1">
        <Accordion.Item eventKey="1">
          <Accordion.Header>Be a member of CISV Saskatoon</Accordion.Header>
          <Accordion.Body>
            <p>
              As a sign of our appreciation, for mini camp we are providing
              “Mini Camp Supervisors and/or Kitchen Volunteers” a discounted
              membership for the cost of $1.00 which will be reimbursed to you
              when you come to mini camp. Membership form is on our website
              here:{" "}
              <a href="https://www.cisvsaskatoon.ca/joinus/membership/">
                https://www.cisvsaskatoon.ca/joinus/membership/
              </a>
              <br />
              Discount code for minicamp volunteers is:{" "}
              <strong>MINICAMPSTAFF24</strong> - This code is good for $34 off a
              1yr staff/leader membership.
            </p>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="2">
          <Accordion.Header>Reference</Accordion.Header>
          <Accordion.Body>
            <p>
              Your reference should be provided by someone who is either a
              current or recent employer, leaders in voluntary organizations, or
              a local community representative in positions of trust and
              responsibility.
              <br />
              Your reference can be from a CISV volunteer in a leadership
              position (such as a risk manager or camp director), or a board or
              executive member. The referee must have known the applicant for a{" "}
              <strong>minimum of 1 year</strong>. They must <strong>not</strong>{" "}
              be a family member. Ideally, the references should demonstrate the
              applicant’s previous experience working or volunteering with
              children.
              <br />
              To submit your reference please use the following online form:{" "}
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSeUXtMqcwUmy9haBdVfJIih1TWsIVFM9GG3Zqycuj2-ng_alA/viewform">
                CISV Reference - Applicant Form
              </a>
              , Once you fill in the form it will automatically send an email to
              your reference requesting their written reference.
              <br />
              Provide your reference with the required information.
            </p>
            <ModalButton
              button="Example Reference Request"
              header="Example Reference Request"
            >
              Dear Reference,
              <br />I will be volunteering with CISV Saskatoon in the position
              of Mini Camp Supervisor and/or Kitchen Volunteer this year and the
              organization requires a reference which I am requesting from you
              today. The position will include acting as caregiver and a mentor
              for youth ages 8-17 for 2 days and one overnight at camp. The
              youth will participate in a variety of activities on the topic of
              peace education. I will be there to ensure the safety and security
              of the youth while they participate in the activities. If you
              agree to provide me with a reference you will receive an email
              from the organization to fill in.
              <br />
              <br />
              More Information about the organization can be found at the
              following link:{" "}
              <a href="https://www.cisvsaskatoon.ca/">
                https://www.cisvsaskatoon.ca/
              </a>
            </ModalButton>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="3">
          <Accordion.Header>Criminal Record Check</Accordion.Header>
          <Accordion.Body>
            <p>
              CISV Saskatoon’s risk manager must have a criminal record and
              vulnerable sector check (CRCVS) on file with the chapter and it
              must be renewed every 3 years. Please request a volunteer letter
              from the chapter via the{" "}
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSfM5IsyfQSt2YeS5MEV3Td5WgawunuETUKm5lZHGL85DzBGRA/viewform">
                CRCVS Letter Request Form
              </a>
              .
              <br /> <br />
              Your Volunteer Letter will be mailed out. Alternatively you can
              arrange to pick up the letter by contacting our Risk Manager at
              riskmanager@cisvsaskatoon.ca It will need to be taken to your
              local authorities (police) to have your Criminal Record and
              Vulnerable Sector Check processed. Once you have it please take a
              photo of it and submit it alongside a photo of{" "}
              <strong>valid government issued photo ID</strong> to our Risk
              Manager via this link:{" "}
              <a href="https://cisvsaskatoon.app.box.com/f/5b367ffafff04ba4b43a932609b7ca78">
                CRCVS & ID Submission Form
              </a>
              .
              <br /> <br />
              <span className="text-muted">
                While most municipal police services will waive the processing
                fee when you provide a volunteer letter, not all do. Any cost
                incurred to obtain a CRCVS is your responsibility and not
                covered by CISV Saskatoon.
              </span>
            </p>
            <ModalButton
              button="Police Websites"
              header="List of Police and RCMP webpages"
            >
              <p>
                Saskatoon residents: Local Police Station |{" "}
                <a href="https://saskatoonpolice.ca/recordcheck/">
                  https://saskatoonpolice.ca/recordcheck/
                </a>
                <br />
                Regina residents: Local Police Station |{" "}
                <a href="https://reginapolice.ca/resources/criminal-record-check/">
                  https://reginapolice.ca/resources/criminal-record-check/
                </a>
                <br />
                All other Saskatchewan residents: Local RCMP Station |{" "}
                <a href="https://www.rcmp-grc.gc.ca/en/criminal-record-checks">
                  https://www.rcmp-grc.gc.ca/en/criminal-record-checks
                </a>
                <br />
                All other areas: Your local authority or online. Online: There
                are a number of online CRCVS providers, they always charge a fee
                for their services. We do not reimburse for online services.
              </p>
            </ModalButton>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="4">
          <Accordion.Header>Show Photo ID</Accordion.Header>
          <Accordion.Body>
            <p>
              When providing the risk manager with your criminal record check
              you will also need to provide government issued photo ID to prove
              you are who you say you are.
            </p>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="5">
          <Accordion.Header>Voluntary Self-Declaration Form</Accordion.Header>
          <Accordion.Body>
            <p>
              Fill in the{" "}
              <a href="https://docs.google.com/forms/d/e/1FAIpQLSfRTnvb1B3poxIdjqqF5bNE9UD7Mp3sqRaRQA2TDqHb2wVGww/viewform">
                CISV voluntary Self-Declaration Form
              </a>{" "}
              affirming that you do not have a history of any behaviours that
              would impede their ability to meet CISV's duty of care to
              participants.
              <br /> <br />
              The form will also request additional information for volunteer
              first aiders and volunteer drivers. If you are not assigned to
              either of these duties you may choose “none of the above”.
            </p>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="6">
          <Accordion.Header>Adult Code of Behaviour Form</Accordion.Header>
          <Accordion.Body>
            Read and agree to the{" "}
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSeKrtMh_VfZCR2T5kzuwtaXuDgoazrorEOcDfjU7zaO3mV0yw/viewform">
              Adult Code of Behavior Form
            </a>
            .
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="7">
          <Accordion.Header>My CISV Account</Accordion.Header>
          <Accordion.Body>
            <p>
              All volunteers participating in CISV activities must be a
              registered member of CISV and have a single profile on{" "}
              <a href="https://mycisv.cisv.org/">MyCISV</a>. If you need
              assistance with MyCISV registration click{" "}
              <a href="https://cisv.org/new-mycisv/">here</a>, or contact the
              International Office IT Support Officer at myCISV@Support.cisv.org
            </p>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="8">
          <Accordion.Header>First Aiders (optional)</Accordion.Header>
          <Accordion.Body>
            <p>
              Let us know if you are able to fulfill the duties of “first aider”
              as we are always looking for volunteers for this role. This
              section is only required by those who have been assigned to this
              duty.
              <br />
              <br />
              All first aiders must be qualified for the role and provide
              evidence that they possess the appropriate training,
              qualifications, and compliance with any relevant regulations.
              Please submit your First Aid certificate to the following link:{" "}
              <a href="https://cisvsaskatoon.app.box.com/f/5b367ffafff04ba4b43a932609b7ca78">
                Document Submission
              </a>
            </p>
          </Accordion.Body>
        </Accordion.Item>
        <Accordion.Item eventKey="9">
          <Accordion.Header>Volunteer Drivers (optional)</Accordion.Header>
          <Accordion.Body>
            <p>
              Only required by those who have been assigned to this duty. If you
              are able to fulfill this duty please let us know as we are always
              looking for volunteers to fill this role during camp.
              <br /> <br />
              All drivers must possess a valid driving license. They must be an
              adult (at least aged 18 years old or above). They must also have a
              road-worthy vehicle (government certified where required) and
              adequate insurance.
              <br />
              If transporting a participant, the driver will have another
              participant or adult volunteer in the vehicle with them for
              Safeguarding purposes. CISV Saskatoon Requires a Proof of
              Insurance, Drivers Abstract and a VIN search which can be
              submitted at this link:{" "}
              <a href="https://cisvsaskatoon.app.box.com/f/5b367ffafff04ba4b43a932609b7ca78">
                Document Submission
              </a>
              <br />
              <br />
              If you have any questions don’t hesitate to contact the chapter
              risk manager at riskmanage@cisvsakatoon.ca
            </p>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
}
