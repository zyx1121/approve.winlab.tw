import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    cookieOptions: {
      domain:
        process.env.NODE_ENV === "production" &&
        typeof window !== "undefined" &&
        window.location.hostname.includes("winlab.tw")
          ? ".winlab.tw"
          : undefined,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
