import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              domain:
                process.env.NODE_ENV === "production"
                  ? ".winlab.tw"
                  : undefined,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          });
        } catch (error) {
          // Ignore errors in Server Components - this is expected
          // Cookies will be properly set in Route Handlers
        }
      },
    },
  });
};
