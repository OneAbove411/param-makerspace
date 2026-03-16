import { supabase } from './supabase';

// ─── Supabase Storage Helpers ───
// Wraps upload / delete / public-url for every configured bucket.

export type BucketName =
    | 'avatars'
    | 'project-images'
    | 'project-files'
    | 'challenge-images'
    | 'event-images'
    | 'badge-images'
    | 'product-images'
    | 'equipment-images'
    | 'induction-certificates';

/**
 * Upload a file to a Supabase Storage bucket.
 * @param bucket  One of the configured bucket names.
 * @param path    Path inside the bucket, e.g. `userId/avatar.png`.
 * @param file    The File or Blob to upload.
 * @returns       The public URL on success, or an error string.
 */
export async function uploadFile(
    bucket: BucketName,
    path: string,
    file: File
): Promise<{ url: string | null; error: string | null }> {
    // Fail fast for oversized files (10 MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        return { url: null, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max is 10 MB.` };
    }

    const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
            upsert: true,
            cacheControl: '3600',          // 1-hour CDN cache
            contentType: file.type || undefined,
        });

    if (error) return { url: null, error: error.message };

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, error: null };
}

/**
 * Delete a file from a Supabase Storage bucket.
 */
export async function deleteFile(
    bucket: BucketName,
    path: string
): Promise<{ error: string | null }> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return { error: error?.message || null };
}

/**
 * Get the public URL for a file (only useful for PUBLIC buckets).
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
}

/**
 * Extract the storage path from a full Supabase public URL.
 * e.g. "https://xxx.supabase.co/storage/v1/object/public/avatars/user123/pic.png"
 *   → "user123/pic.png"
 */
export function extractPathFromUrl(url: string, bucket: BucketName): string | null {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.slice(idx + marker.length);
}
