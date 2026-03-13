"use client";

import { useAuth } from "@/contexts/AuthContext";
import { ProfileSetupModal } from "@/components/ProfileSetupModal";

export function ProfileSetupGuard() {
  const { user, needsProfileSetup, profileLoading, createProfile } = useAuth();

  if (!user || profileLoading || !needsProfileSetup) return null;

  return <ProfileSetupModal open={true} onSave={createProfile} />;
}
