import { getCreationById, isOwnerOf, isUnlocked } from "@/lib/creations";
import { getOwner } from "@/lib/auth";
import { getEnv } from "@/lib/cf";
import { getMediaById } from "@/lib/media";

function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "");
  const encoded = encodeURIComponent(fileName);
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const media = await getMediaById(id);
  if (!media) return new Response("Not found", { status: 404 });

  if (media.creation_id) {
    const creation = await getCreationById(media.creation_id);
    if (!creation) return new Response("Not found", { status: 404 });
    if (!creation.published) return new Response("Not found", { status: 404 });
    if (creation.expires_at && creation.expires_at < Date.now()) {
      return new Response("Not found", { status: 404 });
    }

    const owner = await getOwner();
    if (!isOwnerOf(creation, owner)) {
      if (creation.access_type === "private") {
        return new Response("Not found", { status: 404 });
      }
      if (creation.access_type === "password" && !(await isUnlocked(creation.id))) {
        return new Response("This file is locked", { status: 403 });
      }
    }
  } else {
    const owner = await getOwner();
    const ownsByUser = Boolean(owner.userId && media.owner_user_id === owner.userId);
    const ownsByGuest = Boolean(
      !owner.userId && owner.guestToken && media.owner_guest_token === owner.guestToken,
    );
    if (!ownsByUser && !ownsByGuest) return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const download = url.searchParams.get("download") === "1";
  const { FILES } = await getEnv();

  const totalSize = media.file_size;
  const rangeHeader = request.headers.get("range");
  const headers = new Headers();
  headers.set("Content-Type", media.file_type);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "private, max-age=3600");
  headers.set(
    "Content-Disposition",
    contentDisposition(download ? "attachment" : "inline", media.file_name),
  );
  headers.set("X-Content-Type-Options", "nosniff");

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (match) {
      const start = match[1] ? Number.parseInt(match[1], 10) : 0;
      const requestedEnd = match[2]
        ? Number.parseInt(match[2], 10)
        : Math.min(start + 2 * 1024 * 1024 - 1, totalSize - 1);
      const end = Math.min(requestedEnd, totalSize - 1);
      const length = end - start + 1;

      if (Number.isNaN(start) || start >= totalSize || length <= 0) {
        headers.set("Content-Range", `bytes */${totalSize}`);
        return new Response("Range not satisfiable", { status: 416, headers });
      }

      const object = await FILES.get(media.r2_key, { range: { offset: start, length } });
      if (!object) return new Response("Not found", { status: 404 });

      headers.set("Content-Range", `bytes ${start}-${end}/${totalSize}`);
      headers.set("Content-Length", String(length));
      return new Response(object.body, { status: 206, headers });
    }
  }

  const object = await FILES.get(media.r2_key);
  if (!object) return new Response("Not found", { status: 404 });

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
}
