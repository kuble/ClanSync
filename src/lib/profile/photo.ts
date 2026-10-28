export const PROFILE_PHOTO_BUCKET = "profile-photos";
export const PROFILE_PHOTO_LIMIT = 2 * 1024 * 1024;
export function profilePhotoUrl(path?: string | null) {
  return path ? `/api/profile-photo/${path.replace(/\.webp$/, "")}` : null;
}
