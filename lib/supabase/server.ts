import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        const allCookies = cookieStore.getAll();
        return allCookies.filter((cookie) => {
          try {
            if (cookie.value) {
              Buffer.from(cookie.value, "utf-8");
            }
            return true;
          } catch (error) {
            console.error(`Invalid cookie detected: ${cookie.name}`, error);
            return false;
          }
        });
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              const cookieSize = new Blob([value]).size;
              if (cookieSize > 3500) {
                console.warn(
                  `Cookie ${name} is too large: ${cookieSize} bytes`
                );
              }

              cookieStore.set(name, value, {
                ...options,
                domain:
                  process.env.NODE_ENV === "production"
                    ? ".winlab.tw"
                    : undefined,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              });
            } catch (error) {
              console.error(`Failed to set cookie ${name}:`, error);
            }
          });
        } catch (error) {
          console.error("Failed to set cookies:", error);
        }
      },
    },
  });
};
