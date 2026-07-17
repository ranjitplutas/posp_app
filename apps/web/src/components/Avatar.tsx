function initials(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ url, name, size = 40 }: { url: string | null; name: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name ?? "Profile"}
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: 6, objectFit: "cover", border: "1px solid var(--color-line)" }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: "var(--color-primary-dark)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: size * 0.35,
      }}
    >
      {initials(name)}
    </div>
  );
}
