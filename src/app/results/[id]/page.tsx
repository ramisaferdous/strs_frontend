import { notFound } from "next/navigation";
import { ResultsView } from "@/features/results/results-view";

export const metadata = { title: "Evaluation result" };

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <ResultsView id={n} />;
}
