"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const CreateDocument = dynamic(
  () =>
    import("@/components/create-document").then((mod) => ({
      default: mod.CreateDocument,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12 gap-2">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">載入中...</span>
      </div>
    ),
  }
);

export default function CreatePage() {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <Card className="bg-background/70 backdrop-blur-lg">
        <CardContent className="pt-6">
          <CreateDocument />
        </CardContent>
      </Card>
    </div>
  );
}
