import { createClient } from "@supabase/supabase-js";

/**
 * Next.js patches global fetch and caches GET responses in its Data Cache by
 * default. supabase-js goes through that same fetch, so reads can silently
 * return stale rows -- a digest kept listing a task that had already been
 * deleted. Nothing here should ever be served from cache.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  }
);
