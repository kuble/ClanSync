export function allowDevGameLink(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV !== "production" &&
    env.NEXT_PUBLIC_SUPABASE_URL !== "https://mxkrfnzlgaxzdzcjbfkg.supabase.co" &&
    (env.NODE_ENV === "development" || env.DEV_GAME_LINK_SIMULATOR === "1");
}
