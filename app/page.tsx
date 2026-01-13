"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { DocumentWithSigners } from "@/lib/types";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PDFDocument } from "pdf-lib";
import { useEffect, useState } from "react";

export default function Home() {
  const [pendingDocs, setPendingDocs] = useState<DocumentWithSigners[]>([]);
  const [completedDocs, setCompletedDocs] = useState<DocumentWithSigners[]>([]);
  const [assignedDocs, setAssignedDocs] = useState<DocumentWithSigners[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    loadDocuments();
    loadUser();
  }, []);

  const loadUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const downloadSignedPDF = async (doc: DocumentWithSigners) => {
    setDownloadingDocId(doc.id);
    try {
      console.log("Downloading document:", doc);

      // Fetch the original PDF
      const pdfResponse = await fetch(doc.file_url);
      if (!pdfResponse.ok) {
        throw new Error("無法載入 PDF 檔案");
      }
      const pdfBytes = await pdfResponse.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Get all signers with signatures
      const signersWithSignatures = doc.document_signers.filter(
        (s: any) => s.signature_data && s.status === "signed"
      );

      console.log("Signers with signatures:", signersWithSignatures);

      // Embed each signature
      for (const signer of signersWithSignatures) {
        // Find signature boxes for this signer
        const signerBoxes = doc.signature_boxes.filter(
          (box: any) => box.signer_email === signer.signer_email
        );

        console.log(`Boxes for ${signer.signer_email}:`, signerBoxes);

        // Embed signature image
        if (!signer.signature_data) {
          console.warn(`No signature data for ${signer.signer_email}`);
          continue;
        }
        const signatureImage = await pdfDoc.embedPng(signer.signature_data);

        // Add signature to each box
        for (const box of signerBoxes) {
          const page = pdfDoc.getPage(box.page - 1);
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // Calculate signature dimensions and position
          const sigWidth = (box.width / 100) * pageWidth;
          const sigHeight = sigWidth / box.aspect_ratio;
          const sigX = (box.x / 100) * pageWidth - sigWidth / 2;
          const sigY = pageHeight - (box.y / 100) * pageHeight - sigHeight / 2;

          console.log(`Drawing signature at page ${box.page}:`, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
          });

          page.drawImage(signatureImage, {
            x: sigX,
            y: sigY,
            width: sigWidth,
            height: sigHeight,
          });
        }
      }

      // Save and download
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.title}_已簽核.pdf`;
      link.click();

      URL.revokeObjectURL(url);

      console.log("Download complete!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert(`下載失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const deleteDocument = async (doc: DocumentWithSigners) => {
    // Confirm deletion
    if (!confirm(`確定要刪除「${doc.title}」嗎？\n此操作無法復原。`)) {
      return;
    }

    setDeletingDocId(doc.id);
    try {
      console.log("Deleting document:", doc);

      // Delete from storage
      if (doc.file_url) {
        // Extract file path from URL
        const urlParts = doc.file_url.split("/");
        const fileName = urlParts[urlParts.length - 1].split("?")[0];

        // Get user folder from file_url
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          const user = session.user;
          const filePath = `${user.id}/${decodeURIComponent(fileName)}`;
          console.log("Deleting file:", filePath);

          const { error: storageError } = await supabase.storage
            .from("documents")
            .remove([filePath]);

          if (storageError) {
            console.warn("Failed to delete file from storage:", storageError);
            // Don't fail the whole operation if file deletion fails
          }
        }
      }

      // Delete document from database (cascade will delete related records)
      const { error: deleteError } = await supabase
        .from("documents")
        .delete()
        .eq("id", doc.id);

      if (deleteError) throw deleteError;

      // Update UI
      setAssignedDocs((prev) => prev.filter((d) => d.id !== doc.id));

      console.log("Document deleted successfully");
      alert("文件已刪除");
    } catch (error) {
      console.error("Error deleting document:", error);
      alert(`刪除失敗：${error instanceof Error ? error.message : "未知錯誤"}`);
    } finally {
      setDeletingDocId(null);
    }
  };

  const loadDocuments = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }

      const user = session.user;

      // Get all documents accessible to user (via RLS policies)
      const { data: documents, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (docsError) {
        console.error("Documents error:", docsError);
        throw docsError;
      }

      console.log("Loaded documents:", documents);

      if (!documents || documents.length === 0) {
        console.log("No documents found");
        setPendingDocs([]);
        setCompletedDocs([]);
        setLoading(false);
        return;
      }

      // Get document signers for these documents
      const docIds = documents.map((d) => d.id);
      console.log("Document IDs:", docIds);

      const { data: signers, error: signersError } = await supabase
        .from("document_signers")
        .select("*")
        .in("document_id", docIds);

      if (signersError) {
        console.error("Signers error:", signersError);
        console.error(
          "Signers error details:",
          JSON.stringify(signersError, null, 2)
        );
        throw signersError;
      }

      console.log("Loaded signers:", signers);

      // Get signature boxes for these documents
      const { data: boxes, error: boxesError } = await supabase
        .from("signature_boxes")
        .select("*")
        .in("document_id", docIds);

      if (boxesError) {
        console.error("Boxes error:", boxesError);
        console.error(
          "Boxes error details:",
          JSON.stringify(boxesError, null, 2)
        );
        throw boxesError;
      }

      console.log("Loaded boxes:", boxes);

      // Combine the data
      const docsWithRelations = documents.map((doc) => ({
        ...doc,
        document_signers:
          signers?.filter((s) => s.document_id === doc.id) || [],
        signature_boxes: boxes?.filter((b) => b.document_id === doc.id) || [],
      }));

      console.log("Documents with relations:", docsWithRelations);

      // Filter for documents where user is a signer (including self-signed documents)
      const signerDocs = docsWithRelations.filter((doc) =>
        doc.document_signers.some((s: any) => s.signer_id === user.id)
      );

      console.log("Signer docs:", signerDocs);

      // Separate into pending and completed
      const pending = signerDocs.filter((doc) =>
        doc.document_signers.some(
          (s: any) => s.signer_id === user.id && s.status === "pending"
        )
      );

      console.log("Pending docs:", pending);

      const completed = signerDocs.filter((doc) =>
        doc.document_signers.some(
          (s: any) => s.signer_id === user.id && s.status === "signed"
        )
      );

      console.log("Completed docs:", completed);

      // Get documents created by the user (assigned to others)
      const assigned = docsWithRelations.filter(
        (doc) => doc.created_by === user.id
      );

      console.log("Assigned docs:", assigned);

      setPendingDocs(pending as any);
      setCompletedDocs(completed as any);
      setAssignedDocs(assigned as any);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <FileText className="size-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">請先登入</h2>
        <p className="text-muted-foreground">登入後即可查看您的簽核文件</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="ml-2 text-xl text-foreground font-bold">文件簽核</h1>
        <Button onClick={() => router.push("/create")}>
          <Plus className="size-4" />
          建立文件
        </Button>
      </div>

      {/* Pending Documents */}
      <section>
        <div className="ml-2 flex items-center gap-2 mb-4">
          <Clock className="size-5 text-orange-500" />
          <h2 className="text-xl font-semibold">
            待簽核 ({pendingDocs.length})
          </h2>
        </div>
        {pendingDocs.length === 0 ? (
          <Card className="bg-background/70 backdrop-blur-lg">
            <CardContent className="py-8 text-center text-muted-foreground">
              目前沒有待簽核文件
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingDocs.map((doc) => (
              <Link key={doc.id} href={`/pending/${doc.id}`}>
                <Card className="bg-background/70 backdrop-blur-lg hover:scale-101 hover:bg-background/30 transition-all duration-200 cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(doc.created_at).toLocaleDateString("zh-TW")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <Clock className="size-4" />
                        待簽核
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-4" />
                      {doc.file_name}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Completed Documents */}
      <section>
        <div className="ml-2 flex items-center gap-2 mb-4">
          <CheckCircle2 className="size-5 text-green-500" />
          <h2 className="text-xl font-semibold">
            已完成 ({completedDocs.length})
          </h2>
        </div>
        {completedDocs.length === 0 ? (
          <Card className="bg-background/70 backdrop-blur-lg">
            <CardContent className="py-8 text-center text-muted-foreground">
              目前沒有已完成文件
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {completedDocs.map((doc) => (
              <Card key={doc.id} className="bg-background/70 backdrop-blur-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{doc.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {new Date(doc.created_at).toLocaleDateString("zh-TW")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="size-4" />
                      已完成
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="size-4" />
                    {doc.file_name}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Assigned Documents */}
      <section>
        <div className="ml-2 flex items-center gap-2 mb-4">
          <FileText className="size-5 text-blue-500" />
          <h2 className="text-xl font-semibold">
            已指派 ({assignedDocs.length})
          </h2>
        </div>
        {assignedDocs.length === 0 ? (
          <Card className="bg-background/70 backdrop-blur-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">尚無已指派文件</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {assignedDocs.map((doc) => {
              const totalSigners = doc.document_signers.length;
              const signedCount = doc.document_signers.filter(
                (s: any) => s.status === "signed"
              ).length;
              const isAllSigned = signedCount === totalSigners;

              return (
                <Card
                  key={doc.id}
                  className="bg-background/70 backdrop-blur-lg"
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{doc.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(doc.created_at).toLocaleDateString("zh-TW")}
                        </CardDescription>
                      </div>
                      <div
                        className={`flex items-center gap-2 text-sm ${
                          isAllSigned ? "text-green-600" : "text-orange-600"
                        }`}
                      >
                        {isAllSigned ? (
                          <>
                            <CheckCircle2 className="size-4" />
                            全部完成
                          </>
                        ) : (
                          <>
                            <Clock className="size-4" />
                            待簽核
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="size-4" />
                      {doc.file_name}
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        簽核進度 ({signedCount}/{totalSigners})
                      </p>
                      {doc.document_signers.map((signer: any) => (
                        <div
                          key={signer.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {signer.signer_email}
                          </span>
                          <span
                            className={
                              signer.status === "signed"
                                ? "text-green-600"
                                : "text-orange-600"
                            }
                          >
                            {signer.status === "signed" ? "已簽核" : "待簽核"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      {isAllSigned && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 cursor-pointer"
                          onClick={() => downloadSignedPDF(doc)}
                          disabled={downloadingDocId === doc.id}
                        >
                          {downloadingDocId === doc.id ? (
                            <>
                              <Loader2 className="size-4 animate-spin" />
                              下載中...
                            </>
                          ) : (
                            <>
                              <Download className="size-4" />
                              下載已簽核文件
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        className={`${
                          isAllSigned ? "" : "w-full"
                        } cursor-pointer`}
                        onClick={() => deleteDocument(doc)}
                        disabled={deletingDocId === doc.id}
                      >
                        {deletingDocId === doc.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="size-4" />
                            {!isAllSigned && "刪除"}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
