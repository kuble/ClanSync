"use server";

import { createClient } from "@/lib/supabase/server";
import { writeLanguage } from "@/lib/i18n/server";

export async function saveLanguage(language: unknown) {
  if (language !== "ko" && language !== "en") return false;
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data, error } = await db.from("users").update({ language }).eq("id", user.id).select("id").single();
  if (error || !data) return false;
  await writeLanguage(language);
  return true;
}
