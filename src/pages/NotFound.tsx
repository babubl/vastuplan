import { Container, ButtonLink } from "../components/ui";
export default function NotFound() {
  return <Container className="py-24"><h1 className="text-3xl">This page doesn't exist.</h1><p className="mt-3 text-body">The plan you were looking for may have a different link.</p><ButtonLink to="/design" className="mt-6">Design a house</ButtonLink></Container>;
}
