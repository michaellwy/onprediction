"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  needsProfileSetup: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithTwitter: () => Promise<void>;
  signOut: () => Promise<void>;
  isSignInModalOpen: boolean;
  openSignInModal: () => void;
  closeSignInModal: () => void;
  createProfile: (displayName: string) => Promise<boolean>;
  updateProfile: (displayName: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch profile when user changes
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setNeedsProfileSetup(false);
      setProfileLoading(false);
      return;
    }

    async function fetchProfile() {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error || !data) {
        setNeedsProfileSetup(true);
        setProfile(null);
      } else {
        setProfile(data);
        setNeedsProfileSetup(false);
      }
      setProfileLoading(false);
    }

    fetchProfile();
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signInWithTwitter = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: "twitter",
      options: { redirectTo: window.location.origin },
    });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const openSignInModal = useCallback(() => setIsSignInModalOpen(true), []);
  const closeSignInModal = useCallback(() => setIsSignInModalOpen(false), []);

  const createProfile = useCallback(
    async (displayName: string): Promise<boolean> => {
      if (!user) return false;

      const avatarUrl =
        user.user_metadata?.avatar_url ||
        user.user_metadata?.picture ||
        null;

      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          id: user.id,
          display_name: displayName.trim(),
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (error || !data) return false;

      setProfile(data);
      setNeedsProfileSetup(false);
      return true;
    },
    [user]
  );

  const updateProfile = useCallback(
    async (displayName: string): Promise<boolean> => {
      if (!user) return false;

      const trimmed = displayName.trim();

      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          display_name: trimmed,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error || !data) return false;

      // Update author_name on all existing posts and comments
      await Promise.all([
        supabase
          .from("forum_posts")
          .update({ author_name: trimmed })
          .eq("user_id", user.id),
        supabase
          .from("forum_comments")
          .update({ author_name: trimmed })
          .eq("user_id", user.id),
      ]);

      setProfile(data);
      return true;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        profileLoading,
        needsProfileSetup,
        isLoading,
        signInWithGoogle,
        signInWithTwitter,
        signOut,
        isSignInModalOpen,
        openSignInModal,
        closeSignInModal,
        createProfile,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
