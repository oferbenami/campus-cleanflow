import { supabase } from "@/integrations/supabase/client";

/**
 * Creates a signed URL for an incident photo stored in the private bucket.
 * Falls back gracefully if the photo_url is already a full URL (legacy data).
 */
export async function getIncidentPhotoUrl(photoPath: string): Promise<string | null> {
  if (!photoPath) return null;

  // Legacy: if it's already a full URL, return as-is
  if (photoPath.startsWith("http")) return photoPath;

  const { data, error } = await supabase.storage
    .from("incident-photos")
    .createSignedUrl(photoPath, 3600); // 1 hour expiry

  if (error) {
    console.error("Failed to create signed URL:", error);
    return null;
  }
  return data.signedUrl;
}
