"use client";

import { useState, useCallback } from "react";
import imageCompression from "browser-image-compression";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB before compression (generous — compression handles the rest)

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.4,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export function useImageUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      if (!user) {
        setUploadError("Sign in to upload images");
        return null;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError("Only JPEG, PNG, GIF, and WebP images are supported");
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("Image must be under 10MB");
        return null;
      }

      setIsUploading(true);
      setUploadError(null);

      try {
        // Compress the image (GIFs skip compression to preserve animation)
        let compressed: File;
        if (file.type === "image/gif") {
          compressed = file;
        } else {
          compressed = await imageCompression(file, COMPRESSION_OPTIONS);
        }

        // Upload to Supabase Storage with user-scoped path
        const ext = compressed.type === "image/webp" ? "webp" : file.name.split(".").pop() || "webp";
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await supabase.storage
          .from("forum-images")
          .upload(fileName, compressed, {
            contentType: compressed.type,
            cacheControl: "31536000",
          });

        if (error) {
          setUploadError("Upload failed. Please try again.");
          return null;
        }

        const { data: urlData } = supabase.storage
          .from("forum-images")
          .getPublicUrl(fileName);

        return urlData.publicUrl;
      } catch {
        setUploadError("Failed to process image. Please try again.");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [user]
  );

  const clearError = useCallback(() => setUploadError(null), []);

  return { uploadImage, isUploading, uploadError, clearError };
}
