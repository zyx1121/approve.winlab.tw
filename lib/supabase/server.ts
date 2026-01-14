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
        // Filter out potentially corrupted cookies
        return allCookies.filter((cookie) => {
          try {
            // Validate that the cookie value is valid UTF-8
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
              // Validate cookie value before setting
              if (value) {
                Buffer.from(value, "utf-8");
              }

              // Check cookie size (4KB limit per cookie)
              const cookieSize = new Blob([value]).size;
              if (cookieSize > 3500) {
                // 3.5KB threshold to be safe
                console.warn(
                  `⚠️ Cookie ${name} is too large: ${cookieSize} bytes`
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
            } catch (encodeError) {
              console.error(
                `Failed to validate/set cookie ${name}:`,
                encodeError
              );
            }
          });
        } catch (error) {
          // Ignore errors in Server Components - this is expected
          // Cookies will be properly set in Route Handlers
          console.error("Error in setAll:", error);
        }
      },
    },
  });
};
