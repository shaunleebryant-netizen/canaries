import { StudentGate } from "@/components/students/Shell";
import { ModulePlayer } from "@/components/students/ModulePlayer";

export const metadata = { title: "Student portal · Module", robots: { index: false, follow: false } };

export default async function ModulePage({ params }: { params: Promise<{ n: string }> }) {
  const { n } = await params;
  return <StudentGate><ModulePlayer n={Number(n)} /></StudentGate>;
}
