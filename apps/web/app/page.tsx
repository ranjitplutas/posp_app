"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../src/lib/auth/auth-context";
import { ROUTES } from "../src/config/constants";

export default function HomePage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state === "INITIALIZING") return;
    if (state === "APP_AUTHENTICATED") router.replace(ROUTES.DASHBOARD);
    else if (state === "PENDING_ROLE") router.replace(ROUTES.ACCESS_PENDING);
    else if (state === "DISABLED") router.replace(ROUTES.ACCOUNT_DISABLED);
    else router.replace(ROUTES.LOGIN);
  }, [state, router]);

  return null;
}
