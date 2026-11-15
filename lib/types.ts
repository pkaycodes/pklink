export type AccessType = "public" | "unlisted" | "password" | "private";

export type ContentType = "text" | "gallery" | "video" | "document" | "link" | "mixed";

export type TextBlock = { id: string; type: "text"; text: string };

export type MediaBlock = {
  id: string;
  type: "image" | "video" | "file";
  mediaId: string;
  caption?: string;
};

export type LinkBlock = { id: string; type: "link"; url: string; label?: string };

export type Block = TextBlock | MediaBlock | LinkBlock;

export type BlockKind = Block["type"];

/** Blocks as sent by the browser / stored in the database (media is only a reference). */
export type StoredBlock = Block;

/** Blocks resolved with media metadata for rendering. */
export type RenderMediaBlock = MediaBlock & {
  url?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
};

export type RenderBlock = TextBlock | RenderMediaBlock | LinkBlock;

export type CreationRow = {
  id: string;
  user_id: string | null;
  guest_token: string | null;
  slug: string;
  title: string;
  subtitle: string | null;
  content_type: ContentType;
  blocks: string;
  access_type: AccessType;
  password_hash: string | null;
  published: number;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
};

export type MediaRow = {
  id: string;
  creation_id: string | null;
  owner_user_id: string | null;
  owner_guest_token: string | null;
  r2_key: string;
  file_type: string;
  file_name: string;
  file_size: number;
  created_at: number;
};

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
};

export type ScanRow = {
  id: string;
  creation_id: string;
  created_at: number;
  device: string | null;
  country: string | null;
  referrer: string | null;
  visitor_hash: string | null;
};

export type QrSettings = {
  fg: string;
  bg: string;
  logo: string | null;
  logoSize: number;
  rounded: boolean;
};

export const DEFAULT_QR_SETTINGS: QrSettings = {
  fg: "#141416",
  bg: "#ffffff",
  logo: null,
  logoSize: 0.22,
  rounded: true,
};

export const ACCESS_LABELS: Record<AccessType, string> = {
  public: "Public",
  unlisted: "Unlisted",
  password: "Password",
  private: "Private",
};

export const ACCESS_DESCRIPTIONS: Record<AccessType, string> = {
  public: "Anyone with the link or QR code can view it. Search engines may index it.",
  unlisted: "Anyone with the link can view it, but search engines are asked to ignore it.",
  password: "Visitors must enter a password you set before the page opens.",
  private: "Only you can open the page while signed in. The QR code stays yours.",
};

export const CONTENT_LABELS: Record<ContentType, string> = {
  text: "Text",
  gallery: "Gallery",
  video: "Video",
  document: "Document",
  link: "Link",
  mixed: "Mixed media",
};

export type Creation = CreationRow & {
  parsedBlocks: Block[];
  qrSettings: QrSettings;
};

export type ScanStats = {
  total: number;
  unique: number;
  devices: { device: string; count: number }[];
  countries: { country: string; count: number }[];
  daily: { day: string; count: number }[];
  recent: ScanRow[];
  lastScanAt: number | null;
};
