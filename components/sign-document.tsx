"use client";

import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { DocumentWithSigners, SignatureBox } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Save,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignDocumentProps {
  documentId: string;
}

export function SignDocument({ documentId }: SignDocumentProps) {
  const router = useRouter();
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Document state
  const [document, setDocument] = useState<DocumentWithSigners | null>(null);
  const [signatureBoxes, setSignatureBoxes] = useState<SignatureBox[]>([]);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // PDF viewer state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [pageLoaded, setPageLoaded] = useState<boolean>(false);

  // Signature state
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [useSavedSignature, setUseSavedSignature] = useState(true);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  // Reset page loaded state when page number changes
  useEffect(() => {
    setPageLoaded(false);
  }, [pageNumber]);

  const loadDocument = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }

      setUserEmail(user.email || "");

      // Load document with signature boxes
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select(
          `
          *,
          document_signers(*),
          signature_boxes(*)
        `
        )
        .eq("id", documentId)
        .single();

      if (docError) throw docError;

      // Check if user is a signer
      const userSigner = doc.document_signers.find(
        (s: any) => s.signer_id === user.id
      );

      if (!userSigner) {
        alert("您沒有權限簽署此文件");
        router.push("/");
        return;
      }

      if (userSigner.status === "signed") {
        alert("您已經簽署過此文件");
        router.push("/");
        return;
      }

      console.log("Document loaded:", doc);
      console.log("File URL:", doc.file_url);
      console.log("All signature boxes:", doc.signature_boxes);

      setDocument(doc as any);

      // Filter signature boxes for this user
      const userBoxes = doc.signature_boxes.filter(
        (box: any) => box.signer_email === user.email
      );
      console.log("User signature boxes:", userBoxes);
      console.log("User email:", user.email);

      // Validate signature boxes
      const validBoxes = userBoxes.filter((box: any) => {
        if (
          !box ||
          box.x == null ||
          box.y == null ||
          box.width == null ||
          box.aspect_ratio == null
        ) {
          console.error("Invalid signature box found:", box);
          return false;
        }
        return true;
      });

      if (validBoxes.length !== userBoxes.length) {
        console.warn(
          `Filtered out ${userBoxes.length - validBoxes.length} invalid boxes`
        );
      }

      setSignatureBoxes(validBoxes);

      // Load saved signature
      const { data: savedSig, error: sigError } = await supabase
        .from("user_signatures")
        .select("signature_data")
        .eq("user_id", user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() - returns null if no row found

      if (savedSig && !sigError) {
        console.log("Loaded saved signature");
        setSavedSignature(savedSig.signature_data);
        setSignatureImage(savedSig.signature_data);
        setUseSavedSignature(true);
      } else {
        console.log("No saved signature found (first time user)");
        setUseSavedSignature(false);
      }
    } catch (error) {
      console.error("Error loading document:", error);
      alert("載入文件失敗");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useLayoutEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const padding = 32;
        setContainerWidth(containerRef.current.clientWidth - padding);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const pageWidth =
    containerWidth > 0 ? containerWidth * (zoomLevel / 100) : undefined;

  const handleSave = async () => {
    if (!signatureImage) {
      alert("請先簽名");
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("請先登入");

      // Save signature to user_signatures if it's a new signature (not using saved one)
      if (!useSavedSignature || !savedSignature) {
        const { error: sigError } = await supabase
          .from("user_signatures")
          .upsert({
            user_id: user.id,
            signature_data: signatureImage,
            updated_at: new Date().toISOString(),
          });

        if (sigError) {
          console.warn("Failed to save signature for reuse:", sigError);
          // Don't fail the whole operation if saving signature fails
        } else {
          console.log("Signature saved for future use");
        }
      }

      // Update document_signers record
      const { error: updateError } = await supabase
        .from("document_signers")
        .update({
          signature_data: signatureImage,
          signed_at: new Date().toISOString(),
          status: "signed",
        })
        .eq("document_id", documentId)
        .eq("signer_id", user.id);

      if (updateError) throw updateError;

      alert("簽名完成！");
      router.push("/");
    } catch (error: any) {
      console.error("Error saving signature:", error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const currentPageBoxes = signatureBoxes.filter(
    (box) => box.page === pageNumber
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{document.title}</h1>
          <p className="text-muted-foreground">請在指定位置簽名</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !signatureImage}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          儲存簽名
        </Button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm tabular-nums px-3 text-muted-foreground">
            {pageNumber} / {numPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() =>
              setPageNumber((prev) => Math.min(prev + 1, numPages))
            }
            disabled={pageNumber >= numPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZoomLevel((prev) => Math.max(prev - 25, 50))}
            disabled={zoomLevel <= 50}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomLevel(100)}
            className="text-sm tabular-nums min-w-14 text-center text-muted-foreground"
          >
            {zoomLevel}%
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => setZoomLevel((prev) => Math.min(prev + 25, 300))}
            disabled={zoomLevel >= 300}
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div ref={containerRef} className="rounded-lg bg-muted/30">
        <Document
          file={document.file_url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex items-center justify-center p-12 gap-2">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">載入中...</span>
            </div>
          }
          error={
            <div className="flex items-center justify-center p-12 text-destructive">
              無法載入 PDF 檔案
            </div>
          }
          className="flex justify-center py-4"
        >
          <div ref={pageRef} className="relative">
            <Page
              pageNumber={pageNumber}
              width={pageWidth}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-2xl"
              onLoadSuccess={() => {
                console.log(`Page ${pageNumber} loaded successfully`);
                setPageLoaded(true);
              }}
              onLoadError={(error) => {
                console.error(`Error loading page ${pageNumber}:`, error);
                setPageLoaded(false);
              }}
            />

            {/* Signature Boxes Overlay - only render when page is loaded */}
            {pageLoaded &&
              currentPageBoxes.map((box) => {
                // Defensive check for null/undefined values
                if (
                  !box ||
                  box.x == null ||
                  box.y == null ||
                  box.width == null ||
                  box.aspect_ratio == null
                ) {
                  console.error("Invalid signature box:", box);
                  return null;
                }

                const heightPercent = box.width / box.aspect_ratio;
                return (
                  <div
                    key={box.id}
                    className="absolute border-2 border-dashed border-primary rounded-md bg-primary/10 z-50"
                    style={{
                      left: `${box.x - box.width / 2}%`,
                      top: `${box.y - heightPercent / 2}%`,
                      width: `${box.width}%`,
                      height: `${heightPercent}%`,
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      {signatureImage ? (
                        <img
                          src={signatureImage}
                          alt="Signature"
                          className="max-w-full max-h-full object-contain pointer-events-none"
                          draggable={false}
                        />
                      ) : (
                        <div className="text-primary/60 text-xs text-center">
                          請在下方簽名區簽名
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </Document>
      </div>

      {/* Signature Section */}
      <div className="space-y-4">
        {savedSignature && (
          <div className="bg-muted/30 rounded-lg p-4 border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">已儲存的簽名</span>
                <span className="text-xs text-muted-foreground">
                  (可重複使用)
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUseSavedSignature(!useSavedSignature);
                  if (!useSavedSignature) {
                    setSignatureImage(savedSignature);
                  } else {
                    setSignatureImage(null);
                  }
                }}
              >
                {useSavedSignature ? "繪製新簽名" : "使用已儲存簽名"}
              </Button>
            </div>
            {useSavedSignature && (
              <div className="border rounded-lg bg-white p-4 flex items-center justify-center">
                <img
                  src={savedSignature}
                  alt="Saved signature"
                  className="max-h-24 object-contain"
                />
              </div>
            )}
          </div>
        )}

        {(!savedSignature || !useSavedSignature) && (
          <div className="bg-muted/30 rounded-lg p-4 border">
            <SignaturePad
              onSignatureChange={(sig) => {
                setSignatureImage(sig);
                setUseSavedSignature(false);
              }}
            />
          </div>
        )}
      </div>

      {signatureBoxes.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          此文件有 {signatureBoxes.length} 個您的簽名位置
        </div>
      )}
    </div>
  );
}
