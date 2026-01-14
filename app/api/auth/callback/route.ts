import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/";

  try {
    if (code) {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        // Redirect to home with error parameter
        return NextResponse.redirect(`${origin}/?error=auth_error`);
      }
    }

    // Redirect to the 'next' URL if provided, otherwise go to home
    return NextResponse.redirect(`${origin}${next}`);
  } catch (error) {
    console.error("Auth callback error:", error);

    // If it's a corrupted cookie error, clear cookies and redirect
    if (
      error instanceof Error &&
      (error.message.includes("Invalid UTF-8") ||
        error.message.includes("Invalid cookie"))
    ) {
      const response = NextResponse.redirect(
        `${origin}/?error=corrupted_session`
      );

      // Clear all Supabase auth cookies
      const cookieNames = [
        "sb-yissfqcdmzsxwfnzrflz-auth-token",
        "sb-yissfqcdmzsxwfnzrflz-auth-token.0",
        "sb-yissfqcdmzsxwfnzrflz-auth-token.1",
      ];

      cookieNames.forEach((name) => {
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

    // For other errors, just redirect to home
    return NextResponse.redirect(`${origin}/?error=unknown`);
  }
}
