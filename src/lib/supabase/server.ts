import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies"; // Import the type
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Utility to create Supabase client for Server Components, Server Actions, Route Handlers
export function createSupabaseServerClient(
  cookieStore: ReadonlyRequestCookies
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    // This check might be redundant if the browser client also checks,
    // but good for server-side validation.
    throw new Error(
      "Supabase URL or Anon Key is missing. Check server environment variables."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Error handling for Server Components trying to set cookies
          console.warn(
            `Supabase Server Client: Failed to set cookie ${name} from Server Component.`
          );
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch (error) {
          // Error handling for Server Components trying to remove cookies
          console.warn(
            `Supabase Server Client: Failed to remove cookie ${name} from Server Component.`
          );
        }
      },
    },
  });
}

// Optional: Specific helper for Server Actions if different config is needed
// export function createSupabaseServerActionClient() {
//   // Can potentially reuse createSupabaseServerClient if config is the same
//   return createSupabaseServerClient();
// }

// Optional: Specific helper for Route Handlers if needed
// export function createSupabaseRouteHandlerClient() {
//   // Can potentially reuse createSupabaseServerClient if config is the same
//   return createSupabaseServerClient();
// }

// This function can be used in Server Components, Server Actions, and Route Handlers
// that need to act on behalf of a user, potentially with elevated privileges
// if you were to use a service_role key (but we are using anon key here for general use).
// For admin tasks or operations requiring service_role, you'd create a separate client.
