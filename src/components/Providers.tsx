"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/SignInModal";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <SignInModal />
    </AuthProvider>
  );
}
