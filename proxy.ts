import { createClient } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

export default async function proxy(request: NextRequest) {
  try {
    const { supabase, response } = createClient(request);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && request.nextUrl.pathname === "/api/auth/callback") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch (error) {
    // Handle Invalid UTF-8 sequence error (corrupted cookies)
    if (
      error instanceof Error &&
      (error.message.includes("Invalid UTF-8") ||
        error.message.includes("Invalid cookie"))
    ) {
      console.error("Corrupted cookie detected, clearing auth cookies:", error);

      // Create a response that clears all Supabase cookies
      const response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      });

      // Clear all Supabase auth cookies
      const cookieNames = [
        "sb-yissfqcdmzsxwfnzrflz-auth-token",
        "sb-yissfqcdmzsxwfnzrflz-auth-token.0",
        "sb-yissfqcdmzsxwfnzrflz-auth-token.1",
      ];

      cookieNames.forEach((name) => {
        // Clear for both current domain and shared domain
        response.cookies.set(name, "", {
          maxAge: 0,
          path: "/",
          domain: ".winlab.tw",
        });
        response.cookies.set(name, "", {
          maxAge: 0,
          path: "/",
        });
      });

      return response;
    }

    // Re-throw other errors
    console.error("Middleware error:", error);
    throw error;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
