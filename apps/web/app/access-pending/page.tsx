"use client";

import { useAuth } from "../../src/lib/auth/auth-context";
import { StatusScreen } from "../../src/components/StatusScreen";
import { AccessPendingIllustration } from "../../src/components/AccessPendingIllustration";

export default function AccessPendingPage() {
  const { user, logout } = useAuth();
  return (
    <StatusScreen
      title="Access pending"
      message={`Hi ${user?.fullName ?? ""}, your account has been created but no role has been assigned yet. Please contact your administrator to get access.`}
      onLogout={logout}
      illustration={<AccessPendingIllustration />}
    />
  );
}
