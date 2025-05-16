"use client"; // Ensure this file is treated as client-side

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  // Ensure environment variables are available client-side (prefixed with NEXT_PUBLIC_)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL or Anon Key is missing. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your .env file."
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
