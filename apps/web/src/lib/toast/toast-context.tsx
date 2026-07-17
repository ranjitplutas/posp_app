"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type ToastVariant = "success" | "error";
type Toast = { id: number; variant: ToastVariant; message: string };

type ToastContextValue = {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (variant: ToastVariant, message: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, variant, message }]);
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const showSuccess = useCallback((message: string) => push("success", message), [push]);
  const showError = useCallback((message: string) => push("error", message), [push]);

  return (
    <ToastContext.Provider value={{ showSuccess, showError }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 1000,
          maxWidth: 360,
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const isSuccess = toast.variant === "success";
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        background: "var(--color-surface)",
        border: `1px solid ${isSuccess ? "var(--color-accent)" : "var(--color-red)"}`,
        borderLeft: `4px solid ${isSuccess ? "var(--color-accent-dark)" : "var(--color-red)"}`,
        borderRadius: 8,
        padding: "12px 14px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        animation: "toast-in 0.2s ease-out",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: isSuccess ? "var(--color-accent-soft)" : "var(--color-red-soft)",
          color: isSuccess ? "var(--color-accent-dark)" : "var(--color-red)",
          fontSize: 12,
          fontWeight: 800,
        }}
      >
        {isSuccess ? "✓" : "✕"}
      </span>
      <div style={{ fontSize: 13, color: "var(--color-text)", flex: 1, lineHeight: 1.4 }}>{toast.message}</div>
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{ background: "none", border: "none", color: "var(--color-text-subtle)", fontSize: 14, padding: 0, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
