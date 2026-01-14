export function clearSupabaseCookies() {
  if (typeof window === "undefined") {
    console.warn("clearSupabaseCookies can only be called in the browser");
    return;
  }

  const cookieNames = [
    "sb-yissfqcdmzsxwfnzrflz-auth-token.0",
    "sb-yissfqcdmzsxwfnzrflz-auth-token.1",
    "sb-yissfqcdmzsxwfnzrflz-auth-token.2",
  ];

  cookieNames.forEach((name) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.winlab.tw;`;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=portal.winlab.tw;`;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=approve.winlab.tw;`;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=bento.winlab.tw;`;

    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=reimburse.winlab.tw;`;
  });

  console.log("Cleared all Supabase cookies");
}
