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
            const cookieOptions: any = { ...options };

            if (process.env.NODE_ENV === "production") {
              cookieOptions.domain = ".winlab.tw";
            }

            cookieOptions.sameSite = "lax";
            cookieOptions.secure = process.env.NODE_ENV === "production";

            cookieStore.set(name, value, cookieOptions);
          });
        } catch (error) {
          console.error("Error setting cookie:", error);
        }
      },
    },
  });
};
