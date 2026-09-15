import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** RSC render-request memoization only; Server Actions keep their fresh clients. */
export const getRequestClient = cache(createClient);

export const getRequestUser = cache(async () => {
  const supabase = await getRequestClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error ? null : user;
});
