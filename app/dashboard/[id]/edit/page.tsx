import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Editor } from "@/components/editor";
import { getCurrentUser, getOwner } from "@/lib/auth";
import { getCreationForOwner, hydrateBlocks } from "@/lib/creations";

export const metadata = { title: "Edit page" };

export default async function EditCreationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const owner = user ? { userId: user.id, guestToken: null } : await getOwner();
  const creation = await getCreationForOwner(id, owner);

  if (!creation) notFound();

  const blocks = await hydrateBlocks(creation.parsedBlocks);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Editor
        mode="edit"
        isGuest={!user}
        initial={{
          id: creation.id,
          title: creation.title,
          subtitle: creation.subtitle ?? "",
          blocks,
          accessType: creation.access_type,
          expiresAt: creation.expires_at ? Number(creation.expires_at) : null,
          slug: creation.slug,
        }}
      />
    </div>
  );
}
