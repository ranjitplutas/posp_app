"use client";

import { useAuth } from "../../src/lib/auth/auth-context";
import { StatusScreen } from "../../src/components/StatusScreen";
import { AccessDeniedIllustration } from "../../src/components/AccessDeniedIllustration";

export default function AccountDisabledPage() {
  const { logout } = useAuth();
  return (
    <StatusScreen
      title="Account disabled"
      message="Your account has been disabled by an administrator. Contact your administrator if you believe this is a mistake."
      tone="danger"
      onLogout={logout}
      illustration={<AccessDeniedIllustration />}
    />
  );
}
