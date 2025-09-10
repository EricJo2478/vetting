import RoleData from "../datasets/RoleData";
import Step from "./Step";
import { Accordion, Button, Card, Container, Nav, Row } from "react-bootstrap";

interface Props {
  data: RoleData;
}

export default function Role({ data }: Props) {
  return (
    <Nav.Item>
      <Nav.Link eventKey={data.id}>{data.name}</Nav.Link>
    </Nav.Item>
  );
  return (
    <Card className="ms-">
      <Card.Body>
        <Card.Title>{data.name}</Card.Title>
        <Card.Text>
          This is a longer card with supporting text below as a natural lead-in
          to additional content. This content is a little bit longer.
        </Card.Text>
      </Card.Body>
    </Card>
  );
}
