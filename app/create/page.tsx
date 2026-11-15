import { SiteHeader } from "@/components/site-header";
import { Editor } from "@/components/editor";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Create something" };

export default async function CreatePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Editor mode="create" isGuest={!user} />
    </div>
  );
}
