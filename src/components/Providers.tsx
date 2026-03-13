"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SignInModal } from "@/components/SignInModal";
import { ProfileSetupGuard } from "@/components/ProfileSetupGuard";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <SignInModal />
      <ProfileSetupGuard />
    </AuthProvider>
  );
}
