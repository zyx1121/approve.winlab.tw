import { LogoutButton } from "@/components/logout-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      <div className="flex flex-col items-center gap-4 p-4 bg-background/70 backdrop-blur-lg rounded-lg border">
        <Avatar className="size-24">
          {user?.user_metadata?.avatar_url ? (
            <AvatarImage
              src={user.user_metadata.avatar_url}
              alt={user.email || "N/A"}
            />
          ) : null}
          <AvatarFallback className="text-2xl">
            {user?.user_metadata?.full_name
              ? user.user_metadata.full_name.charAt(0).toUpperCase()
              : "N/A"}
          </AvatarFallback>
        </Avatar>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">
            {user?.user_metadata?.full_name || "N/A"}
          </h2>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
        <div className="w-full pt-4">
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
