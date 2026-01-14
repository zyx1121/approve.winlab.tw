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
        cookiesToSet.forEach(({ name, value }) => {
          try {
            const cookieSize = new Blob([value]).size;
            if (cookieSize > 3500) {
              console.warn(
                `⚠️ Cookie ${name} is too large: ${cookieSize} bytes`
              );
            }

            request.cookies.set(name, value);
          } catch (error) {
            console.error(`Failed to set cookie ${name}:`, error);
            return;
          }
        });

        supabaseResponse = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            supabaseResponse.cookies.set(name, value, {
              ...options,
              domain: ".winlab.tw",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          } catch (error) {
            console.error(`Failed to set cookie ${name}:`, error);
          }
        });
      },
    },
  });

  return { supabase, response: supabaseResponse };
};
