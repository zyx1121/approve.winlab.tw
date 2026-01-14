import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = (
  request: NextRequest
): {
  supabase: ReturnType<typeof createServerClient>;
  response: NextResponse;
} => {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        const allCookies = request.cookies.getAll();
        // Filter out potentially corrupted cookies
        return allCookies.filter((cookie) => {
          try {
            // Validate that the cookie value is valid UTF-8
            if (cookie.value) {
              // Test if it's valid base64 or regular string
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

            request.cookies.set(name, value);
          } catch (error) {
            console.error(`Failed to validate cookie ${name}:`, error);
            return; // Skip this cookie
          }
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            // Validate again before setting in response
            if (value) {
              Buffer.from(value, "utf-8");
            }

            supabaseResponse.cookies.set(name, value, {
              ...options,
              domain: ".winlab.tw",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          } catch (error) {
            console.error(`Failed to set cookie ${name} in response:`, error);
          }
        });
      },
    },
  });

  return { supabase, response: supabaseResponse };
};
