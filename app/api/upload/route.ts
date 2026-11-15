import { NextResponse } from "next/server";
import { getEnv } from "@/lib/cf";
import { getOwner } from "@/lib/auth";
import {
  classifyUpload,
  createMediaRow,
  MAX_UPLOAD_BYTES,
  safeFileName,
} from "@/lib/media";
import { formatBytes } from "@/lib/utils";

export async function POST(request: Request) {
  const owner = await getOwner();
  if (!owner.userId && !owner.guestToken) {
    return NextResponse.json(
      { error: "Your session expired. Refresh the page and try again." },
      { status: 401 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file was received." }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  }

  const mimeType = (file.type || "application/octet-stream").toLowerCase();
  const kind = classifyUpload(mimeType);
  if (!kind) {
    return NextResponse.json(
      { error: "That file type isn't supported. Try images, MP4/WebM video, PDFs or documents." },
      { status: 415 },
    );
  }

  const limit = MAX_UPLOAD_BYTES[kind];
  if (file.size > limit) {
    return NextResponse.json(
      { error: `${kind === "video" ? "Videos" : "Files"} are limited to ${formatBytes(limit)}.` },
      { status: 413 },
    );
  }

  const fileName = safeFileName(file.name ||
    (kind === "image" ? "image" : kind === "video" ? "video" : "document"));
  const key = `media/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}`;
  const bytes = await file.arrayBuffer();

  try {
    const { FILES } = await getEnv();
    await FILES.put(key, bytes, {
      httpMetadata: {
        contentType: mimeType,
        cacheControl: "private, max-age=31536000",
      },
    });

    const row = await createMediaRow({
      ownerUserId: owner.userId,
      ownerGuestToken: owner.userId ? null : owner.guestToken,
      r2Key: key,
      fileType: mimeType,
      fileName,
      fileSize: file.size,
    });

    return NextResponse.json({
      id: row.id,
      url: `/api/files/${row.id}`,
      name: row.file_name,
      type: row.file_type,
      size: row.file_size,
      kind,
    });
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "The upload failed. Please try again." }, { status: 500 });
  }
}
