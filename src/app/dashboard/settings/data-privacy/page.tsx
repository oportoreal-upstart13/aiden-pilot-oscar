import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DataPrivacySection } from "@/components/settings/data-privacy-section";

export default async function DataPrivacySettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/settings/data-privacy");
  }

  return <DataPrivacySection />;
}
