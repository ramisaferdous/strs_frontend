import { PropertyBrief } from "@/features/property/property-brief";

export const metadata = { title: "Property brief" };

export default async function PropertyPage({ params }: { params: Promise<{ zpid: string }> }) {
  const { zpid } = await params;
  return <PropertyBrief zpid={zpid} />;
}
