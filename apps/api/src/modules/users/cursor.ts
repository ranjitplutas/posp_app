type Cursor = { createdAt: string; id: string };

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

export function decodeCursor(encoded: string | undefined): Cursor | null {
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (typeof parsed.createdAt === "string" && typeof parsed.id === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}
