"use client";

import { Card, CardContent } from "@/components/ui/card";
import dynamic from "next/dynamic";
import { use } from "react";

const SignDocument = dynamic(
  () =>
    import("@/components/sign-document").then((mod) => ({
      default: mod.SignDocument,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">載入簽名頁面中...</p>
        </div>
      </div>
    ),
  }
);

export default function PendingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Card className="bg-background/70 backdrop-blur-lg">
        <CardContent className="pt-6">
          <SignDocument documentId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
