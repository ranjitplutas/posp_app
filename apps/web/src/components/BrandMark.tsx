export function BrandMark({ size = 45 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 70" width={size} height={(size * 70) / 64} aria-hidden="true">
      <path d="M32 3C41 8 49 9 58 9V34C58 49 48 61 32 68C16 61 6 49 6 34V9C15 9 23 8 32 3Z" fill="#0b5278" />
      <path d="M32 3V68C16 61 6 49 6 34V9C15 9 23 8 32 3Z" fill="#2d779a" opacity=".55" />
      <path d="M5 33C18 28 30 33 36 43C41 51 48 52 59 46C54 57 45 64 32 69C18 63 9 53 5 40V33Z" fill="#78b82a" />
      <path d="M6 38C18 36 28 41 34 49C38 55 43 58 49 58C44 63 38 67 32 69C18 63 9 53 6 38Z" fill="#5f9e1d" opacity=".82" />
    </svg>
  );
}
