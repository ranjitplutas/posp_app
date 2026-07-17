"use client";

import { useAuth } from "../../src/lib/auth/auth-context";
import { StatusScreen } from "../../src/components/StatusScreen";
import { AccessDeniedIllustration } from "../../src/components/AccessDeniedIllustration";

export default function AccessDeniedPage() {
  const { logout } = useAuth();
  return (
    <StatusScreen
      title="Access denied"
      message="You do not have enough privileges to access this page. Please contact your administrator."
      tone="danger"
      onLogout={logout}
      illustration={<AccessDeniedIllustration />}
    />
  );
}
