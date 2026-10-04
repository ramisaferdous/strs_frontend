import { notFound } from "next/navigation";
import { Workspace } from "@/features/underwriting/workspace";

export const metadata = { title: "Underwriting workspace" };

export default async function UnderwritingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <Workspace id={n} />;
}
