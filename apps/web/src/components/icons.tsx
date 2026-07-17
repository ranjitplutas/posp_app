type IconProps = { size?: number; color?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export function DashboardIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="11" width="8" height="10" rx="1.5" />
      <rect x="3" y="14" width="8" height="7" rx="1.5" />
    </svg>
  );
}

export function UsersIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.5" />
      <path d="M15.8 14.2c2.3.4 4.2 2.6 4.2 5.3" />
    </svg>
  );
}

export function RegistryIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="3" width="17" height="18" rx="2" />
      <path d="M7.5 8h9M7.5 12h9M7.5 16h5.5" />
    </svg>
  );
}

export function PerformanceIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 20V10M10 20V4M16 20v-7M4 20h16" />
    </svg>
  );
}

export function AnalyticsIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20z" />
      <path d="M12 2v10l7 7" />
    </svg>
  );
}

export function TotalIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function PendingIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3l9 16H3L12 3z" />
      <path d="M12 10v4M12 17.5v.1" />
    </svg>
  );
}

export function ApprovedIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.5 2.5L16 9.5" />
    </svg>
  );
}

export function RejectedIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

export function ManagersIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 2l3 3-3 3-3-3 3-3zM12 16l3 3-3 3-3-3 3-3zM2 12l3-3 3 3-3 3-3-3zM16 12l3-3 3 3-3 3-3-3z" />
    </svg>
  );
}

export function HealthIcon({ size = 18 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 12h4l2.5-7L13 19l2.5-7H21" />
    </svg>
  );
}

export function MenuIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function CloseIcon({ size = 20 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function LogoutIcon({ size = 16 }: IconProps) {
  return (
    <svg {...base(size)}>
      <path d="M9 4H5.5A1.5 1.5 0 004 5.5v13A1.5 1.5 0 005.5 20H9" />
      <path d="M16 16l4-4-4-4M20 12H9" />
    </svg>
  );
}
