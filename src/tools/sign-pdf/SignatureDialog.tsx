"use client";

import { Eraser, ImageUp, Trash2, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type SignaturePad from "signature_pad";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { notify } from "@/components/ui/Toast";
import { toToolError } from "@/lib/errors";
import { sniffFile } from "@/lib/files/sniff";
import { cn } from "@/lib/cn";
import { SIGNATURE_FONTS } from "./fonts";
import {
  deleteSavedSignature,
  INK,
  readSavedSignature,
  savedSignatureImage,
  saveSignature,
  toSignature,
  trimCanvas,
  typedSignature,
  uploadedSignature,
  type InkColor,
  type SignatureImage,
} from "./signature";

type Mode = "draw" | "type" | "upload";

const COLORS = [
  { value: "black", label: "Black" },
  { value: "blue", label: "Blue" },
];

/** The drawing pad: signature_pad loads when Draw is shown (on intent). */
function DrawPad({
  color,
  canvasRef,
  onInk,
}: {
  color: InkColor;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onInk: (hasInk: boolean) => void;
}) {
  const pad = useRef<SignaturePad | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let observer: ResizeObserver | undefined;
    void import("signature_pad").then(({ default: Pad }) => {
      if (disposed) return;
      const instance = new Pad(canvas, { minWidth: 0.9, maxWidth: 3, throttle: 0 });
      pad.current = instance;
      instance.addEventListener("endStroke", () => onInk(!instance.isEmpty()));
      const fit = () => {
        // At least 2× so the exported image stays sharp in the PDF.
        const ratio = Math.max(window.devicePixelRatio || 1, 2);
        const data = instance.toData();
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        instance.clear();
        instance.fromData(data);
      };
      fit();
      observer = new ResizeObserver(fit);
      observer.observe(canvas);
      setReady(true);
    });
    return () => {
      disposed = true;
      observer?.disconnect();
      pad.current?.off();
      pad.current = null;
    };
  }, [canvasRef, onInk]);

  useEffect(() => {
    const instance = pad.current;
    if (!instance) return;
    instance.penColor = INK[color];
    // Recolour what is already drawn.
    const data = instance.toData().map((group) => ({ ...group, penColor: INK[color] }));
    instance.clear();
    instance.fromData(data);
  }, [color, ready]);

  return (
    <div className="flex flex-col gap-2">
      <div className="light relative overflow-hidden rounded-md border border-border-strong bg-surface">
        <canvas
          ref={canvasRef}
          aria-label="Signature drawing area. Draw with a mouse, finger or stylus; to use the keyboard, choose Type."
          className="block h-44 w-full cursor-crosshair touch-none"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-dashed border-border-strong"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const instance = pad.current;
            if (!instance) return;
            const data = instance.toData();
            data.pop();
            instance.fromData(data);
            onInk(!instance.isEmpty());
          }}
        >
          <Undo2 aria-hidden />
          Undo stroke
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            pad.current?.clear();
            onInk(false);
          }}
        >
          <Eraser aria-hidden />
          Clear
        </Button>
      </div>
    </div>
  );
}

export function SignatureDialog({
  open,
  onOpenChange,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (signature: SignatureImage) => void;
}) {
  const [mode, setMode] = useState<Mode>("draw");
  const [color, setColor] = useState<InkColor>("black");
  const [hasInk, setHasInk] = useState(false);
  const [name, setName] = useState("");
  const [fontId, setFontId] = useState<string>(SIGNATURE_FONTS[0].id);
  const [upload, setUpload] = useState<{ file: File; url: string } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [clearWhite, setClearWhite] = useState(true);
  const [remember, setRemember] = useState(false);
  // Read on mount: the page remounts the dialog each time it opens.
  const [saved, setSaved] = useState<string | null>(readSavedSignature);
  const [busy, setBusy] = useState(false);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (upload) URL.revokeObjectURL(upload.url);
    },
    [upload],
  );

  const ready = mode === "draw" ? hasInk : mode === "type" ? name.trim() !== "" : upload !== null;

  async function chooseImage(file: File | undefined) {
    if (!file) return;
    setUploadError("");
    const kind = await sniffFile(file);
    if (kind !== "png" && kind !== "jpeg" && kind !== "webp") {
      setUploadError(`${file.name} isn’t a PNG, JPG or WebP image.`);
      return;
    }
    setUpload({ file, url: URL.createObjectURL(file) });
  }

  async function finish(signature: SignatureImage | null) {
    if (!signature) {
      notify.error("The signature is empty. Draw, type or choose one first.");
      return;
    }
    if (remember && !(await saveSignature(signature.blob))) {
      notify.warning(
        "Your signature couldn’t be remembered on this device (storage is full or blocked).",
      );
    }
    onDone(signature);
    onOpenChange(false);
  }

  async function create() {
    if (!ready || busy) return;
    setBusy(true);
    try {
      if (mode === "draw") {
        const trimmed = canvas.current && trimCanvas(canvas.current);
        await finish(trimmed ? await toSignature(trimmed) : null);
      } else if (mode === "type") {
        const font = SIGNATURE_FONTS.find((f) => f.id === fontId) ?? SIGNATURE_FONTS[0];
        await finish(await typedSignature(name.trim(), font.font.style.fontFamily, INK[color]));
      } else if (upload) {
        await finish(await uploadedSignature(upload.file, clearWhite));
      }
    } catch (error) {
      notify.error(toToolError(error, "creating the signature").message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Add your signature"
        description="Draw, type or upload it. It stays on this device."
        className="sm:max-w-palette"
      >
        {saved && (
          <div className="flex items-center gap-3 rounded-md border border-border p-3">
            <span className="light flex h-14 min-w-0 flex-1 items-center rounded-sm bg-surface px-2">
              {/* A data URL from this device's storage, never user-provided HTML. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={saved}
                alt="Your saved signature"
                className="max-h-12 max-w-full object-contain"
              />
            </span>
            <div className="flex shrink-0 flex-col gap-1">
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  onDone(await savedSignatureImage(saved));
                  onOpenChange(false);
                }}
              >
                Use saved
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  deleteSavedSignature();
                  setSaved(null);
                  notify.success("Saved signature deleted from this device.");
                }}
              >
                <Trash2 aria-hidden />
                Delete
              </Button>
            </div>
          </div>
        )}

        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList aria-label="How to add your signature">
            <TabsTrigger value="draw">Draw</TabsTrigger>
            <TabsTrigger value="type">Type</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="draw">
            {mode === "draw" && <DrawPad color={color} canvasRef={canvas} onInk={setHasInk} />}
          </TabsContent>
          <TabsContent value="type" className="flex flex-col gap-4">
            <Field label="Your name">
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="Your name"
              />
            </Field>
            <RadioGroup value={fontId} onValueChange={setFontId} aria-label="Signature style">
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {SIGNATURE_FONTS.map(({ id, label, font }) => (
                  <Radio
                    key={id}
                    value={id}
                    aria-label={label}
                    label={
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span
                          className={cn(
                            "light block h-12 w-56 max-w-full truncate rounded-sm bg-surface px-3 text-h2 leading-12",
                            font.className,
                          )}
                          style={{ color: INK[color] }}
                        >
                          {name.trim() || "Your signature"}
                        </span>
                        <span aria-hidden className="px-1 text-micro text-fg-muted">
                          {label}
                        </span>
                      </span>
                    }
                  />
                ))}
              </div>
            </RadioGroup>
          </TabsContent>
          <TabsContent value="upload" className="flex flex-col gap-3">
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(event) => {
                void chooseImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <div className="light flex h-32 items-center justify-center rounded-md border border-dashed border-border-strong bg-surface p-2">
              {upload ? (
                // A local object URL of the chosen image (never inline SVG/HTML).
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upload.url}
                  alt={`Chosen image ${upload.file.name}`}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-small text-fg-muted">
                  A PNG with a transparent background looks best.
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()}>
                <ImageUp aria-hidden />
                {upload ? "Choose another image" : "Choose image"}
              </Button>
              <Checkbox
                label="Make a white background transparent"
                checked={clearWhite}
                onCheckedChange={(value) => setClearWhite(value === true)}
              />
            </div>
            {uploadError && (
              <p role="alert" className="text-small text-danger">
                {uploadError}
              </p>
            )}
          </TabsContent>
        </Tabs>

        {mode !== "upload" && (
          <div className="flex items-center gap-3">
            <span aria-hidden className="text-ui text-fg">
              Ink
            </span>
            <SegmentedControl
              label="Ink colour"
              options={COLORS}
              value={color}
              onValueChange={(value) => setColor(value as InkColor)}
            />
          </div>
        )}

        <Checkbox
          label="Remember my signature on this device"
          checked={remember}
          onCheckedChange={(value) => setRemember(value === true)}
        />

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" aria-disabled={!ready || busy || undefined} onClick={create}>
            Add signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
