import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { PROFILE_PHOTO_BUCKET } from "@/lib/profile/photo";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string; imageId: string }> }) {
  const { userId, imageId } = await params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!uuid.test(userId) || !uuid.test(imageId)) return new Response(null, { status: 404 });
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return new Response(null, { status: 401 });
  const path = `${userId}/${imageId}.webp`;
  const { data: photo, error } = await client.from("account_profile_photos").select("image_path").eq("user_id", userId).eq("image_path", path).maybeSingle();
  if (error) return new Response(null, { status: 500 });
  if (!photo) return new Response(null, { status: 404 });
  const { data, error: storageError } = await createServiceRoleClient().storage.from(PROFILE_PHOTO_BUCKET).download(path);
  if (storageError || !data) return new Response(null, { status: 404 });
  return new Response(data, { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
