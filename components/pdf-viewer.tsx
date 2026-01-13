"use client";

import { SignaturePad } from "@/components/signature-pad";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Minus,
  Move,
  PenLine,
  Plus,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface SignatureBox {
  id: string;
  page: number;
  x: number; // percentage position
  y: number;
  width: number; // percentage width
  aspectRatio: number;
}

interface PDFViewerProps {
  file: string;
}

export function PDFViewer({ file }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [signatureBoxes, setSignatureBoxes] = useState<SignatureBox[]>([]);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Dragging state
  const [draggingBox, setDraggingBox] = useState<string | null>(null);
  const [resizingBox, setResizingBox] = useState<string | null>(null);
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const dragStartRef = useRef<{
    x: number;
    y: number;
    boxX: number;
    boxY: number;
  } | null>(null);
  const resizeStartRef = useRef<{
    x: number;
    y: number;
    width: number;
    boxX: number;
    boxY: number;
  } | null>(null);

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages);
    },
    []
  );

  const onPageLoadSuccess = useCallback(
    ({ width, height }: { width: number; height: number }) => {
      setPageDimensions({ width, height });
    },
    []
  );

  // Measure container width once on mount and on window resize
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

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 300));
  };

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 50));
  };

  const resetZoom = () => {
    setZoomLevel(100);
  };

  const addSignatureBox = () => {
    const newBox: SignatureBox = {
      id: `sig-${Date.now()}`,
      page: pageNumber,
      x: 50, // center
      y: 50, // center vertically
      width: 30, // 30% of page width
      aspectRatio: 3, // width:height = 3:1
    };
    setSignatureBoxes((prev) => [...prev, newBox]);
  };

  const removeSignatureBox = (id: string) => {
    setSignatureBoxes((prev) => prev.filter((box) => box.id !== id));
  };

  // Mouse/Touch handlers for dragging
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
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      boxX: box.x,
      boxY: box.y,
    };
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
                    dragStartRef.current!.boxX + deltaX
                  )
                ),
                y: Math.max(
                  box.width / box.aspectRatio / 2,
                  Math.min(
                    100 - box.width / box.aspectRatio / 2,
                    dragStartRef.current!.boxY + deltaY
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

  // Mouse/Touch handlers for resizing
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

          let newWidth = resizeStartRef.current!.width;
          let newX = resizeStartRef.current!.boxX;
          let newY = resizeStartRef.current!.boxY;
          const aspectRatio = box.aspectRatio;

          // Calculate new dimensions based on corner
          if (resizeCorner.includes("right")) {
            newWidth = resizeStartRef.current!.width + deltaX * 2;
          } else if (resizeCorner.includes("left")) {
            newWidth = resizeStartRef.current!.width - deltaX * 2;
          }

          // Use Y delta for vertical corners
          if (resizeCorner.includes("bottom")) {
            const widthFromY =
              (resizeStartRef.current!.width / aspectRatio + deltaY * 2) *
              aspectRatio;
            newWidth = Math.max(newWidth, widthFromY);
          } else if (resizeCorner.includes("top")) {
            const widthFromY =
              (resizeStartRef.current!.width / aspectRatio - deltaY * 2) *
              aspectRatio;
            newWidth = Math.max(newWidth, widthFromY);
          }

          // Clamp width
          newWidth = Math.max(10, Math.min(80, newWidth));

          return {
            ...box,
            width: newWidth,
            x: newX,
            y: newY,
          };
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

  // Global event listeners
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

  // Download PDF with signatures
  const downloadSignedPDF = async () => {
    if (!signatureImage || signatureBoxes.length === 0) return;

    setIsDownloading(true);
    try {
      // Fetch the original PDF
      const response = await fetch(file);
      const pdfBytes = await response.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);

      // Convert signature image to PNG bytes
      const signatureResponse = await fetch(signatureImage);
      const signatureBytes = await signatureResponse.arrayBuffer();
      const signaturePng = await pdfDoc.embedPng(signatureBytes);

      // Add signatures to each box
      for (const box of signatureBoxes) {
        const page = pdfDoc.getPage(box.page - 1);
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const sigWidth = (box.width / 100) * pageWidth;
        const sigHeight = sigWidth / box.aspectRatio;
        const sigX = (box.x / 100) * pageWidth - sigWidth / 2;
        const sigY = pageHeight - (box.y / 100) * pageHeight - sigHeight / 2;

        page.drawImage(signaturePng, {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        });
      }

      // Save and download
      const modifiedPdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(modifiedPdfBytes)], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "signed-document.pdf";
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const currentPageBoxes = signatureBoxes.filter(
    (box) => box.page === pageNumber
  );

  const canDownload = signatureImage && signatureBoxes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={goToPrevPage}
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
            onClick={goToNextPage}
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
              onClick={zoomOut}
              disabled={zoomLevel <= 50}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetZoom}
              className="text-sm tabular-nums min-w-14 text-center text-muted-foreground"
            >
              {zoomLevel}%
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={zoomIn}
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

          <Button
            variant="default"
            size="sm"
            onClick={downloadSignedPDF}
            disabled={!canDownload || isDownloading}
          >
            {isDownloading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            下載
          </Button>
        </div>
      </div>

      {/* PDF Document */}
      <div ref={containerRef} className="rounded-lg bg-muted/30">
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
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
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-2xl"
            />

            {/* Signature Boxes Overlay */}
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
                  {/* Drag handle */}
                  <div
                    className="absolute inset-0 cursor-move flex items-center justify-center select-none"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleDragStart(e, box.id);
                    }}
                    onTouchStart={(e) => handleDragStart(e, box.id)}
                  >
                    {signatureImage ? (
                      <img
                        src={signatureImage}
                        alt="Signature"
                        className="max-w-full max-h-full object-contain pointer-events-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex items-center gap-1 text-primary/60 text-xs">
                        <Move className="size-3" />
                        <span>拖曳移動</span>
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeSignatureBox(box.id)}
                    className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors z-10"
                  >
                    <X className="size-3" />
                  </button>

                  {/* Corner resize handles */}
                  {/* Top-left */}
                  <div
                    className="absolute -top-1.5 -left-1.5 size-3 bg-primary rounded-full cursor-nwse-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResizeStart(e, box.id, "top-left");
                    }}
                    onTouchStart={(e) =>
                      handleResizeStart(e, box.id, "top-left")
                    }
                  />
                  {/* Top-right */}
                  <div
                    className="absolute -top-1.5 -right-1.5 size-3 bg-primary rounded-full cursor-nesw-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResizeStart(e, box.id, "top-right");
                    }}
                    onTouchStart={(e) =>
                      handleResizeStart(e, box.id, "top-right")
                    }
                  />
                  {/* Bottom-left */}
                  <div
                    className="absolute -bottom-1.5 -left-1.5 size-3 bg-primary rounded-full cursor-nesw-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResizeStart(e, box.id, "bottom-left");
                    }}
                    onTouchStart={(e) =>
                      handleResizeStart(e, box.id, "bottom-left")
                    }
                  />
                  {/* Bottom-right */}
                  <div
                    className="absolute -bottom-1.5 -right-1.5 size-3 bg-primary rounded-full cursor-nwse-resize hover:bg-primary/80"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleResizeStart(e, box.id, "bottom-right");
                    }}
                    onTouchStart={(e) =>
                      handleResizeStart(e, box.id, "bottom-right")
                    }
                  />
                </div>
              );
            })}
          </div>
        </Document>
      </div>

      {/* Signature Pad */}
      <div className="bg-muted/30 rounded-lg p-4 border">
        <SignaturePad onSignatureChange={setSignatureImage} />
      </div>

      {/* Status */}
      {signatureBoxes.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          已新增 {signatureBoxes.length} 個簽名區塊
          {signatureBoxes.length > 0 &&
            !signatureImage &&
            " — 請在上方簽名區簽名"}
        </div>
      )}
    </div>
  );
}
