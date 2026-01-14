"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkCookieSize, clearSupabaseCookies } from "@/lib/clear-cookies";
import { AlertCircle, CheckCircle2, Info, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CookieInfo {
  name: string;
  value: string;
  size: number;
}

export default function CookieDebugPage() {
  const [cookies, setCookies] = useState<CookieInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [percentUsed, setPercentUsed] = useState(0);
  const [isNearLimit, setIsNearLimit] = useState(false);

  const loadCookies = () => {
    const allCookies = document.cookie.split(";").map((c) => {
      const [name, ...valueParts] = c.trim().split("=");
      const value = valueParts.join("=");
      return {
        name,
        value,
        size: new Blob([value]).size,
      };
    });

    setCookies(allCookies);

    const sizeInfo = checkCookieSize();
    setTotalSize(sizeInfo.totalSize);
    setPercentUsed(sizeInfo.percentUsed);
    setIsNearLimit(sizeInfo.isNearLimit);
  };

  useEffect(() => {
    loadCookies();
  }, []);

  const handleClearSupabaseCookies = () => {
    clearSupabaseCookies();
    loadCookies();
    alert("✅ Supabase cookies 已清除！");
  };

  const handleClearAllCookies = () => {
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;domain=.winlab.tw`;
    });
    loadCookies();
    alert("✅ 所有 cookies 已清除！");
  };

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Cookie 診斷工具</h1>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isNearLimit ? (
              <AlertCircle className="size-5 text-orange-500" />
            ) : (
              <CheckCircle2 className="size-5 text-green-500" />
            )}
            Cookie 使用狀況
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">總大小</p>
              <p className="text-2xl font-bold">{totalSize} bytes</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">使用率</p>
              <p
                className={`text-2xl font-bold ${
                  isNearLimit ? "text-orange-500" : "text-green-500"
                }`}
              >
                {percentUsed.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cookie 數量</p>
              <p className="text-2xl font-bold">{cookies.length}</p>
            </div>
          </div>

          {isNearLimit && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <AlertCircle className="size-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-orange-500">
                  警告：Cookie 接近限制
                </p>
                <p className="text-sm text-muted-foreground">
                  Cookie 使用率超過 80%，可能導致問題。建議清理不必要的
                  cookies。
                </p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Info className="size-5 text-blue-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                瀏覽器限制：單個 cookie 最大 4KB，總大小限制視瀏覽器而定（通常
                4KB-8KB）
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleClearSupabaseCookies} variant="outline">
              <Trash2 className="size-4" />
              清除 Supabase Cookies
            </Button>
            <Button
              onClick={handleClearAllCookies}
              variant="destructive"
              className="cursor-pointer"
            >
              <Trash2 className="size-4" />
              清除所有 Cookies
            </Button>
            <Button onClick={loadCookies} variant="secondary">
              重新整理
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cookie List */}
      <Card>
        <CardHeader>
          <CardTitle>Cookie 列表</CardTitle>
        </CardHeader>
        <CardContent>
          {cookies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              目前沒有 cookies
            </p>
          ) : (
            <div className="space-y-2">
              {cookies.map((cookie, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 bg-background/50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-sm">
                      {cookie.name}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground truncate mt-1">
                      {cookie.value.substring(0, 100)}
                      {cookie.value.length > 100 && "..."}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p
                      className={`text-sm font-semibold ${
                        cookie.size > 3500
                          ? "text-orange-500"
                          : cookie.size > 2000
                            ? "text-yellow-500"
                            : "text-green-500"
                      }`}
                    >
                      {cookie.size} bytes
                    </p>
                    {cookie.name.includes("sb-") && (
                      <p className="text-xs text-blue-500 mt-1">Supabase</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
