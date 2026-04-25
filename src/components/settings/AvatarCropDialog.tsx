import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Move, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  file: File | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
  saving?: boolean;
}

const CANVAS_SIZE = 320; // preview size (px)
const OUTPUT_SIZE = 512; // exported avatar size (px)

/**
 * Discord/Telegram-style avatar editor.
 * Pure Canvas API — no extra deps.
 * Outputs a square 512×512 WebP centered/zoomed by the user.
 */
export function AvatarCropDialog({ open, file, onCancel, onConfirm, saving }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragging = useRef<{ x: number; y: number } | null>(null);

  // Load image when file changes
  useEffect(() => {
    if (!file || !open) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.width, h: img.height });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, open]);

  // Compute base "fit" scale so smaller side fills canvas (cover behavior)
  const baseScale = imgSize.w && imgSize.h
    ? CANVAS_SIZE / Math.min(imgSize.w, imgSize.h)
    : 1;

  // Draw whenever state changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgSize.w) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    // checkerboard bg for transparency clarity
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const scale = baseScale * zoom;
    const drawW = imgSize.w * scale;
    const drawH = imgSize.h * scale;
    const cx = CANVAS_SIZE / 2 - drawW / 2 + offset.x;
    const cy = CANVAS_SIZE / 2 - drawH / 2 + offset.y;
    ctx.drawImage(img, cx, cy, drawW, drawH);
  }, [zoom, offset, imgSize, baseScale]);

  // Drag handlers (mouse + touch)
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragging.current.x;
    const dy = e.clientY - dragging.current.y;
    dragging.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(3, Math.max(1, z - e.deltaY * 0.002)));
  }, []);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = async () => {
    const img = imgRef.current;
    if (!img || !imgSize.w) return;

    // Render at OUTPUT_SIZE matching the preview composition
    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const octx = out.getContext("2d");
    if (!octx) return;
    octx.imageSmoothingQuality = "high";

    const ratio = OUTPUT_SIZE / CANVAS_SIZE;
    const scale = baseScale * zoom * ratio;
    const drawW = imgSize.w * scale;
    const drawH = imgSize.h * scale;
    const cx = OUTPUT_SIZE / 2 - drawW / 2 + offset.x * ratio;
    const cy = OUTPUT_SIZE / 2 - drawH / 2 + offset.y * ratio;

    // background fill in case of transparency
    octx.fillStyle = "#0f172a";
    octx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    octx.drawImage(img, cx, cy, drawW, drawH);

    const blob: Blob | null = await new Promise((resolve) => {
      out.toBlob((b) => resolve(b), "image/webp", 0.92);
    });
    if (!blob) return;
    await onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onCancel()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Ajustar avatar</DialogTitle>
          <DialogDescription>
            Arraste para mover. Use o zoom para enquadrar do jeito que você quer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div
            className="relative rounded-xl overflow-hidden bg-muted touch-none select-none"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block cursor-grab active:cursor-grabbing"
            />
            {/* Circular mask overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, transparent 0, transparent calc(50% - 1px), rgba(0,0,0,0.55) calc(50% + 0px))",
              }}
            />
            <div className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-primary/80 m-0" style={{ clipPath: "circle(50% at 50% 50%)" }} />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 text-[10px] text-white/80 bg-black/40 backdrop-blur rounded px-2 py-1 pointer-events-none">
              <Move className="h-3 w-3" /> arraste · role para zoom
            </div>
          </div>

          <div className="w-full flex items-center gap-3">
            <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={reset}
              className="h-8 px-2"
              title="Resetar"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={saving || !imgSize.w}>
            {saving ? "Salvando..." : "Salvar avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
