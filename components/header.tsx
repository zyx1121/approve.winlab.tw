"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "keycloak",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
        scopes: "openid",
      },
    });
  };

  return (
    <header className="flex items-center justify-between p-4 px-6 w-full max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/">
          <h1 className="text-2xl text-foreground font-bold hover:scale-105 transition-transform duration-200">
            Approve
          </h1>
        </Link>
        <Badge variant="outline">demo</Badge>
      </div>
      {user ? (
        <Link
          href="/profile"
          className="transition-all hover:opacity-80 hover:scale-105 duration-200 hover:cursor-pointer"
          aria-label="Profile"
        >
          <Avatar>
            {user.user_metadata?.avatar_url ? (
              <AvatarImage
                src={user.user_metadata.avatar_url}
                alt={user.email || "N/A"}
              />
            ) : null}
            <AvatarFallback>
              {user.user_metadata?.full_name
                ? user.user_metadata.full_name.charAt(0).toUpperCase()
                : ""}
            </AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <button
          onClick={handleLogin}
          className="cursor-pointer transition-all hover:opacity-80 hover:scale-105 duration-200"
          aria-label="Login"
        >
          <Avatar>
            <AvatarFallback>?</AvatarFallback>
          </Avatar>
        </button>
      )}
    </header>
  );
}
