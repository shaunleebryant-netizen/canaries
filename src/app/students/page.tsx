import { StudentGate } from "@/components/students/Shell";
import { PortalHome } from "@/components/students/PortalHome";

/** Student portal — LOCAL DRAFT PROTOTYPE (owner 2026-10-30). Mock gate: ?demo=1 / toggle. Not shipped. */
export const metadata = { title: "Student portal", robots: { index: false, follow: false } };

export default function StudentsPage() {
  return <StudentGate><PortalHome /></StudentGate>;
}
