"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Loader2,
  Minus,
  Move,
  PenLine,
  Plus,
  Save,
  Upload,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface TempSignatureBox {
  id: string;
  email: string;
  page: number;
  x: number;
  y: number;
  width: number;
  aspectRatio: number;
}

export function CreateDocument() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Document state
  const [title, setTitle] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // PDF viewer state
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Signature boxes
  const [signatureBoxes, setSignatureBoxes] = useState<TempSignatureBox[]>([]);
  const [signerEmail, setSignerEmail] = useState("");

  // Users list
  const [users, setUsers] = useState<
    Array<{ id: string; email: string; name: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Dragging/Resizing state
  const [draggingBox, setDraggingBox] = useState<string | null>(null);
  const [resizingBox, setResizingBox] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const dragStartRef = useRef<any>(null);
  const resizeStartRef = useRef<any>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Load users on mount
  useEffect(() => {
    if (authLoading) return;

    const loadUsers = async () => {
      try {
        const supabase = createClient();

        // Query user_profiles table for all users
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, email, name")
          .order("name");

        if (error) {
          console.error("Error loading users:", error);
          // Fallback: try to get current user at least
          if (user) {
            setUsers([
              {
                id: user.id,
                email: user.email || "",
                name: user.user_metadata?.full_name || user.email || "User",
              },
            ]);
          }
        } else {
          const usersList = data.map((u) => ({
            id: u.id,
            email: u.email || "",
            name: u.name || u.email || "Unknown",
          }));
          setUsers(usersList);
        }
      } catch (error) {
        console.error("Error loading users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [authLoading, user]);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      if (!title) {
        setTitle(file.name.replace(".pdf", ""));
      }
    }
  };

  const addSignatureBox = () => {
    if (!signerEmail) {
      alert("請輸入簽核人員信箱");
      return;
    }

    const newBox: TempSignatureBox = {
      id: `sig-${Date.now()}`,
      email: signerEmail,
      page: pageNumber,
      x: 50,
      y: 50,
      width: 30,
      aspectRatio: 3,
    };
    setSignatureBoxes((prev) => [...prev, newBox]);
  };

  const removeSignatureBox = (id: string) => {
    setSignatureBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  // Drag handlers (similar to pdf-viewer.tsx)
  const handleDragStart = (
    e: React.MouseEvent | React.TouchEvent,
    boxId: string
  ) => {
    e.stopPropagation();
    const box = signatureBoxes.find((b) => b.id === boxId);
    if (!box || !pageRef.current) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setDraggingBox(boxId);
    dragStartRef.current = { x: clientX, y: clientY, boxX: box.x, boxY: box.y };
  };

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!draggingBox || !dragStartRef.current || !pageRef.current) return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const rect = pageRef.current.getBoundingClientRect();
      const deltaX = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStartRef.current.y) / rect.height) * 100;

      setSignatureBoxes((prev) =>
        prev.map((box) =>
          box.id === draggingBox
            ? {
                ...box,
                x: Math.max(
                  box.width / 2,
                  Math.min(
                    100 - box.width / 2,
                    dragStartRef.current.boxX + deltaX
                  )
                ),
                y: Math.max(
                  box.width / box.aspectRatio / 2,
                  Math.min(
                    100 - box.width / box.aspectRatio / 2,
                    dragStartRef.current.boxY + deltaY
                  )
                ),
              }
            : box
        )
      );
    },
    [draggingBox]
  );

  const handleDragEnd = useCallback(() => {
    setDraggingBox(null);
    dragStartRef.current = null;
  }, []);

  // Resize handlers
  const handleResizeStart = (
    e: React.MouseEvent | React.TouchEvent,
    boxId: string,
    corner: string
  ) => {
    e.stopPropagation();
    const box = signatureBoxes.find((b) => b.id === boxId);
    if (!box) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setResizingBox(boxId);
    setResizeCorner(corner);
    resizeStartRef.current = {
      x: clientX,
      y: clientY,
      width: box.width,
      boxX: box.x,
      boxY: box.y,
    };
  };

  const handleResizeMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (
        !resizingBox ||
        !resizeStartRef.current ||
        !pageRef.current ||
        !resizeCorner
      )
        return;

      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const rect = pageRef.current.getBoundingClientRect();
      const deltaX = ((clientX - resizeStartRef.current.x) / rect.width) * 100;
      const deltaY = ((clientY - resizeStartRef.current.y) / rect.height) * 100;

      setSignatureBoxes((prev) =>
        prev.map((box) => {
          if (box.id !== resizingBox) return box;
          let newWidth = resizeStartRef.current.width;
          if (resizeCorner.includes("right"))
            newWidth = resizeStartRef.current.width + deltaX * 2;
          else if (resizeCorner.includes("left"))
            newWidth = resizeStartRef.current.width - deltaX * 2;
          newWidth = Math.max(10, Math.min(80, newWidth));
          return { ...box, width: newWidth };
        })
      );
    },
    [resizingBox, resizeCorner]
  );

  const handleResizeEnd = useCallback(() => {
    setResizingBox(null);
    setResizeCorner(null);
    resizeStartRef.current = null;
  }, []);

  useLayoutEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      handleDragMove(e);
      handleResizeMove(e);
    };
    const handleEnd = () => {
      handleDragEnd();
      handleResizeEnd();
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [handleDragMove, handleDragEnd, handleResizeMove, handleResizeEnd]);

  const handleSave = async () => {
    if (!title || !pdfFile || signatureBoxes.length === 0) {
      alert("請填寫標題、上傳 PDF 並至少新增一個簽名區塊");
      return;
    }

    if (!user) {
      alert("請先登入");
      return;
    }

    setIsSaving(true);
    try {
      const supabase = createClient();

      // Upload PDF to Supabase Storage
      // Sanitize filename: remove special characters and use only alphanumeric, dash, underscore
      const fileExtension = pdfFile.name.split(".").pop();
      const sanitizedName = pdfFile.name
        .replace(/\.[^/.]+$/, "") // Remove extension
        .replace(/[^a-zA-Z0-9]/g, "_") // Replace special chars with underscore
        .substring(0, 50); // Limit length
      const fileName = `${
        user.id
      }/${Date.now()}_${sanitizedName}.${fileExtension}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(fileName, pdfFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      console.log("Upload successful:", uploadData);

      // Get file URL (use signed URL for private bucket)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from("documents")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (urlError) {
        console.error("Signed URL error:", urlError);
        throw urlError;
      }

      const signedUrl = signedUrlData?.signedUrl;
      console.log("Signed URL:", signedUrl);

      if (!signedUrl) {
        throw new Error("無法取得檔案 URL");
      }

      // Create document record
      const { data: document, error: docError } = await supabase
        .from("documents")
        .insert({
          title,
          file_url: signedUrl,
          file_name: pdfFile.name,
          created_by: user.id,
        })
        .select()
        .single();

      if (docError) throw docError;

      // Create signature boxes
      const boxesData = signatureBoxes.map((box) => ({
        document_id: document.id,
        signer_email: box.email,
        page: box.page,
        x: box.x,
        y: box.y,
        width: box.width,
        aspect_ratio: box.aspectRatio,
      }));

      const { error: boxesError } = await supabase
        .from("signature_boxes")
        .insert(boxesData);

      if (boxesError) throw boxesError;

      // Create document_signers records
      const uniqueEmails = [...new Set(signatureBoxes.map((box) => box.email))];
      const signersData = await Promise.all(
        uniqueEmails.map(async (email) => {
          // Find user by email from user_profiles (not auth.users)
          const { data: userData, error: userError } = await supabase
            .from("user_profiles")
            .select("id")
            .eq("email", email)
            .maybeSingle();

          if (userError) {
            console.error(`Error finding user for ${email}:`, userError);
          }

          if (!userData) {
            console.error(`User not found for email: ${email}`);
            throw new Error(`找不到用戶：${email}。請確保該用戶已註冊。`);
          }

          return {
            document_id: document.id,
            signer_id: userData.id,
            signer_email: email,
            status: "pending",
          };
        })
      );

      const { error: signersError } = await supabase
        .from("document_signers")
        .insert(signersData);

      if (signersError) throw signersError;

      // Send email notifications to all signers
      console.log("Sending email notifications to signers...");
      const creatorName =
        user.user_metadata?.full_name || user.email || "系統管理員";
      const documentUrl = `${window.location.origin}/pending/${document.id}`;

      const emailPromises = uniqueEmails.map(async (email) => {
        try {
          const response = await fetch("/api/send-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              signerName: email.split("@")[0],
              documentTitle: title,
              documentUrl: documentUrl,
              creatorName: creatorName,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to send email to ${email}:`, error);
          } else {
            console.log(`Email sent successfully to ${email}`);
          }
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
          // Don't fail the whole operation if email fails
        }
      });

      // Wait for all emails to be sent (but don't fail if some fail)
      await Promise.allSettled(emailPromises);

      alert("文件建立成功！通知郵件已發送。");
      router.push("/");
    } catch (error: any) {
      console.error("Error saving document:", error);
      alert(`儲存失敗：${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentPageBoxes = signatureBoxes.filter(
    (box) => box.page === pageNumber
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">建立簽核文件</h1>
          <p className="text-muted-foreground">上傳 PDF 並設定簽名區塊</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isSaving || !pdfFile || signatureBoxes.length === 0}
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          儲存
        </Button>
      </div>

      {/* Document Info */}
      <div className="grid gap-4">
        {/* PDF File - moved to top */}
        <div className="grid gap-2">
          <Label htmlFor="pdf">PDF 檔案</Label>
          <div className="flex gap-2">
            <Input
              id="pdf"
              type="file"
              ref={fileInputRef}
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="size-4" />
              {pdfFile ? pdfFile.name : "選擇 PDF 檔案"}
            </Button>
          </div>
        </div>

        {/* Document Title and Signer Select - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Document Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">文件標題</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="請輸入文件標題"
            />
          </div>

          {/* Signer Combobox */}
          <div className="grid gap-2">
            <Label>簽核人員</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {signerEmail ? (
                    <div className="flex flex-col items-start text-left overflow-hidden">
                      <span className="font-medium">
                        {users.find((u) => u.email === signerEmail)?.name}
                      </span>
                      <span className="text-xs text-muted-foreground truncate w-full">
                        {signerEmail}
                      </span>
                    </div>
                  ) : loadingUsers ? (
                    "載入中..."
                  ) : (
                    "選擇簽核人員"
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="搜尋姓名或信箱..." />
                  <CommandList>
                    <CommandEmpty>無符合結果</CommandEmpty>
                    <CommandGroup>
                      {loadingUsers ? (
                        <CommandItem disabled>載入中...</CommandItem>
                      ) : users.length === 0 ? (
                        <CommandItem disabled>無可用使用者</CommandItem>
                      ) : (
                        users.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={`${user.name} ${user.email}`}
                            onSelect={() => {
                              setSignerEmail(user.email);
                              setComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                signerEmail === user.email
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.email}
                              </span>
                            </div>
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Helper text below the row */}
        <p className="text-xs text-muted-foreground -mt-2">
          💡 選擇後點選「新增簽名區塊」在 PDF 上標記簽名位置
        </p>
      </div>

      {/* PDF Viewer */}
      {pdfUrl && (
        <>
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

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() =>
                    setZoomLevel((prev) => Math.max(prev - 25, 50))
                  }
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
                  onClick={() =>
                    setZoomLevel((prev) => Math.min(prev + 25, 300))
                  }
                  disabled={zoomLevel >= 300}
                >
                  <Plus className="size-4" />
                </Button>
              </div>

              <div className="w-px h-6 bg-border" />

              <Button variant="outline" size="sm" onClick={addSignatureBox}>
                <PenLine className="size-4" />
                新增簽名區塊
              </Button>
            </div>
          </div>

          <div ref={containerRef} className="rounded-lg bg-muted/30">
            <Document
              file={pdfUrl}
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
                />

                {/* Signature Boxes */}
                {currentPageBoxes.map((box) => {
                  const heightPercent = box.width / box.aspectRatio;
                  return (
                    <div
                      key={box.id}
                      className={`absolute border-2 border-dashed rounded-md transition-colors z-50 ${
                        draggingBox === box.id || resizingBox === box.id
                          ? "border-primary bg-primary/10"
                          : "border-primary/60 bg-primary/5 hover:border-primary hover:bg-primary/10"
                      }`}
                      style={{
                        left: `${box.x - box.width / 2}%`,
                        top: `${box.y - heightPercent / 2}%`,
                        width: `${box.width}%`,
                        height: `${heightPercent}%`,
                      }}
                    >
                      <div
                        className="absolute inset-0 cursor-move flex flex-col items-center justify-center select-none text-xs"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleDragStart(e, box.id);
                        }}
                        onTouchStart={(e) => handleDragStart(e, box.id)}
                      >
                        <Move className="size-3 text-primary/60" />
                        <span className="text-primary/60 mt-1">
                          {box.email}
                        </span>
                      </div>

                      <button
                        onClick={() => removeSignatureBox(box.id)}
                        className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors z-10"
                      >
                        <X className="size-3" />
                      </button>

                      {/* Corner resize handles */}
                      {[
                        "top-left",
                        "top-right",
                        "bottom-left",
                        "bottom-right",
                      ].map((corner) => (
                        <div
                          key={corner}
                          className={`absolute size-3 bg-primary rounded-full hover:bg-primary/80 ${
                            corner === "top-left"
                              ? "-top-1.5 -left-1.5 cursor-nwse-resize"
                              : corner === "top-right"
                                ? "-top-1.5 -right-1.5 cursor-nesw-resize"
                                : corner === "bottom-left"
                                  ? "-bottom-1.5 -left-1.5 cursor-nesw-resize"
                                  : "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleResizeStart(e, box.id, corner);
                          }}
                          onTouchStart={(e) =>
                            handleResizeStart(e, box.id, corner)
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </Document>
          </div>

          {signatureBoxes.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              已新增 {signatureBoxes.length} 個簽名區塊
            </div>
          )}
        </>
      )}
    </div>
  );
}
