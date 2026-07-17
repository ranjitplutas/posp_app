"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "../src/lib/auth/auth-context";
import { ToastProvider } from "../src/lib/toast/toast-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <AuthProvider>{children}</AuthProvider>
    </ToastProvider>
  );
}
