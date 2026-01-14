/**
 * Utility to clear all Supabase authentication cookies
 * Use this when encountering corrupted cookie errors
 */
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

/**
 * Get total size of all cookies
 */
export function getCookiesTotalSize(): number {
  if (typeof window === "undefined") return 0;

  return new Blob([document.cookie]).size;
}

/**
 * Check if cookies are approaching size limit
 */
export function checkCookieSize(): {
  totalSize: number;
  isNearLimit: boolean;
  percentUsed: number;
} {
  const totalSize = getCookiesTotalSize();
  const limit = 4096; // 4KB per cookie, but we check total
  const percentUsed = (totalSize / limit) * 100;
  const isNearLimit = percentUsed > 80; // Warn if over 80%

  return {
    totalSize,
    isNearLimit,
    percentUsed,
  };
}
