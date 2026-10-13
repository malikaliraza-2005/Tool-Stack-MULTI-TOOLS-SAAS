"use client";

import {
  ArrowRight,
  Download,
  FileText,
  FolderOpen,
  RotateCcw,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Combobox } from "@/components/ui/Combobox";
import { CopyButton } from "@/components/ui/CopyButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
  SheetContent,
} from "@/components/ui/Dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/DropdownMenu";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Radio, RadioGroup } from "@/components/ui/Radio";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Slider } from "@/components/ui/Slider";
import { Switch } from "@/components/ui/Switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Textarea } from "@/components/ui/Textarea";
import { notify } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

const COLOR_TOKENS = [
  ["bg", "bg-bg"],
  ["surface", "bg-surface"],
  ["surface-2", "bg-surface-2"],
  ["surface-3", "bg-surface-3"],
  ["fg", "bg-fg"],
  ["fg-muted", "bg-fg-muted"],
  ["fg-subtle", "bg-fg-subtle"],
  ["border", "bg-border"],
  ["border-strong", "bg-border-strong"],
  ["accent", "bg-accent"],
  ["accent-hover", "bg-accent-hover"],
  ["accent-text", "bg-accent-text"],
  ["accent-soft", "bg-accent-soft"],
  ["success", "bg-success"],
  ["success-soft", "bg-success-soft"],
  ["warning", "bg-warning"],
  ["warning-soft", "bg-warning-soft"],
  ["danger", "bg-danger"],
  ["danger-soft", "bg-danger-soft"],
  ["info", "bg-info"],
  ["info-soft", "bg-info-soft"],
] as const;

const TYPE_SCALE = [
  ["text-display", "text-display", "Private tools"],
  ["text-h1", "text-h1", "Merge PDF files"],
  ["text-h2", "text-h2", "How to merge PDFs"],
  ["text-h3", "text-h3", "Options"],
  ["text-body-lg", "text-body-lg", "Combine PDFs in your browser. Nothing is uploaded."],
  ["text-body", "text-body", "Drop files here or choose them from your device."],
  ["text-ui", "text-ui", "Download merged PDF"],
  ["text-small", "text-small", "3 files · 4.2 MB"],
  ["text-micro", "text-micro uppercase", "Developer tools"],
  ["text-code", "font-mono text-code", '{ "bytesUploaded": 0 }'],
] as const;

const SELECT_OPTIONS = [
  { value: "jpeg", label: "JPEG" },
  { value: "png", label: "PNG" },
  { value: "webp", label: "WebP" },
  { value: "avif", label: "AVIF", disabled: true },
];

const TIMEZONES = [
  { value: "utc", label: "UTC" },
  { value: "europe-london", label: "Europe/London", keywords: ["uk", "gmt"] },
  { value: "europe-berlin", label: "Europe/Berlin", keywords: ["germany", "cet"] },
  { value: "america-new-york", label: "America/New_York", keywords: ["us", "est"] },
  { value: "asia-tokyo", label: "Asia/Tokyo", keywords: ["japan", "jst"] },
  { value: "asia-karachi", label: "Asia/Karachi", keywords: ["pakistan", "pkt"] },
];

function Demo({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-micro text-fg-muted uppercase">{title}</h4>
      <div className={cn("flex flex-wrap items-center gap-3", className)}>{children}</div>
    </div>
  );
}

/** One section rendered in both themes side by side (stacked below `xl`). */
function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: string;
  children: (theme: Theme) => ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="text-h2 text-fg">
          {title}
        </h2>
        {note && <p className="max-w-prose text-small text-fg-muted">{note}</p>}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {(["light", "dark"] as const).map((theme) => (
          <div
            key={theme}
            className={cn(
              theme,
              "flex min-w-0 flex-col gap-6 rounded-lg border border-border bg-bg p-6 text-fg",
            )}
          >
            <h3 className="text-micro text-fg-muted uppercase">{theme} theme</h3>
            {children(theme)}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgressDemo() {
  const [value, setValue] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setValue((current) => {
        const next = Math.min(1, current + 0.1);
        if (next >= 1) setRunning(false);
        return next;
      });
    }, 300);
    return () => clearInterval(timer);
  }, [running]);

  return (
    <div className="flex w-full flex-col gap-3">
      <ProgressBar label="Demo job" value={value} showValue completeLabel="Demo job complete" />
      <Button
        size="sm"
        className="self-start"
        onClick={() => {
          setValue(0);
          setRunning(true);
        }}
        disabled={running}
      >
        <RotateCcw aria-hidden />
        Run demo job
      </Button>
    </div>
  );
}

export function Gallery() {
  const [segment, setSegment] = useState("encode");

  return (
    <div className="flex flex-col gap-16">
      <Section
        id="foundations-color"
        title="Color"
        note="Semantic tokens (design-system §2). Contrast of every text pair is checked in src/styles/tokens.test.ts."
      >
        {() => (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COLOR_TOKENS.map(([name, swatch]) => (
              <div key={name} className="flex items-center gap-2">
                <span className={cn("size-8 shrink-0 rounded-sm border border-border", swatch)} />
                <span className="font-mono text-small text-fg-muted">{name}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="foundations-type" title="Typography" note="Geist Sans and Geist Mono (§3).">
        {() => (
          <div className="flex flex-col gap-4">
            {TYPE_SCALE.map(([token, classes, sample]) => (
              <div key={token} className="flex flex-col gap-1">
                <span className="font-mono text-micro text-fg-muted">{token}</span>
                <span className={cn("text-fg", classes)}>{sample}</span>
              </div>
            ))}
            <div className="flex flex-col gap-1">
              <span className="font-mono text-micro text-fg-muted">tabular-nums</span>
              <span className="font-mono text-code text-fg tabular-nums">
                1,204,118 → 340,021 bytes
              </span>
            </div>
          </div>
        )}
      </Section>

      <Section
        id="foundations-shape"
        title="Radius and elevation"
        note="§5. Dark mode uses borders instead of the resting shadow."
      >
        {() => (
          <div className="flex flex-wrap gap-4">
            {(
              ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl", "rounded-full"] as const
            ).map((radius) => (
              <div
                key={radius}
                className={cn(
                  "flex size-20 items-end border border-border-strong bg-surface p-2",
                  radius,
                )}
              >
                <span className="font-mono text-micro text-fg-muted">
                  {radius.replace("rounded-", "")}
                </span>
              </div>
            ))}
            {(["shadow-1", "shadow-2", "shadow-3"] as const).map((shadow) => (
              <div
                key={shadow}
                className={cn(
                  "flex size-20 items-end rounded-lg border border-border bg-surface p-2",
                  shadow,
                )}
              >
                <span className="font-mono text-micro text-fg-muted">{shadow}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section id="brand" title="Brand" note="Logo mark and wordmark (brand-identity.md).">
        {() => (
          <div className="flex flex-wrap items-center gap-8">
            <Logo />
            <LogoMark className="size-12" />
            <LogoMark className="size-4" />
          </div>
        )}
      </Section>

      <Section
        id="buttons"
        title="Buttons"
        note="Hover, press (scale 0.98) and focus-visible are interactive: use the mouse and Tab key. Loading keeps the width."
      >
        {() => (
          <>
            {(["primary", "secondary", "ghost", "danger"] as const).map((variant) => (
              <Demo key={variant} title={variant}>
                <Button variant={variant} size="sm">
                  Small
                </Button>
                <Button variant={variant}>
                  <Download aria-hidden />
                  Medium
                </Button>
                <Button variant={variant} size="lg">
                  Large
                </Button>
                <Button variant={variant} disabled>
                  Disabled
                </Button>
                <Button variant={variant} loading>
                  Loading
                </Button>
              </Demo>
            ))}
            <Demo title="As link">
              <Button asChild variant="secondary">
                <a href="#buttons">
                  Link styled as button
                  <ArrowRight aria-hidden />
                </a>
              </Button>
            </Demo>
            <Demo title="Icon buttons (tooltip on hover and focus)">
              <IconButton label="Settings" icon={<Settings aria-hidden />} />
              <IconButton label="Upload" variant="secondary" icon={<Upload aria-hidden />} />
              <IconButton label="Download" variant="primary" icon={<Download aria-hidden />} />
              <IconButton label="Delete" variant="danger" icon={<Trash2 aria-hidden />} />
              <IconButton label="Small" size="sm" icon={<Settings aria-hidden />} />
              <IconButton
                label="Large"
                size="lg"
                variant="secondary"
                icon={<Settings aria-hidden />}
              />
              <IconButton label="Disabled" disabled icon={<Settings aria-hidden />} />
              <IconButton label="Busy" loading icon={<Settings aria-hidden />} />
            </Demo>
          </>
        )}
      </Section>

      <Section id="badges" title="Badge, Kbd, Tooltip">
        {() => (
          <>
            <Demo title="Badge tones">
              <Badge>Neutral</Badge>
              <Badge tone="accent">New</Badge>
              <Badge tone="success">Done</Badge>
              <Badge tone="warning">Large file</Badge>
              <Badge tone="danger">Failed</Badge>
              <Badge tone="info">Beta</Badge>
            </Demo>
            <Demo title="Kbd">
              <span className="inline-flex gap-1">
                <Kbd>Ctrl</Kbd>
                <Kbd>K</Kbd>
              </span>
              <Kbd>Esc</Kbd>
              <Kbd>↵</Kbd>
            </Demo>
          </>
        )}
      </Section>

      <Section id="inputs" title="Text inputs">
        {() => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="File name" description="Used for the downloaded file.">
              <Input placeholder="merged.pdf" />
            </Field>
            <Field
              label="Page range"
              error="Enter pages like 1-3, 5. Page 12 doesn’t exist (the PDF has 10 pages)."
            >
              <Input defaultValue="1-3, 12" />
            </Field>
            <Field label="Disabled">
              <Input disabled defaultValue="Not editable" />
            </Field>
            <Field label="Read-only">
              <Input readOnly defaultValue="2026-10-13T00:00:00Z" className="font-mono" />
            </Field>
            <Field label="JSON input" className="sm:col-span-2">
              <Textarea placeholder='{ "paste": "JSON here" }' className="font-mono" />
            </Field>
            <Field
              label="Textarea with error"
              error="Unexpected token at line 2, column 5. Check for a missing comma."
              className="sm:col-span-2"
            >
              <Textarea defaultValue={'{\n  "a": 1\n  "b": 2\n}'} className="font-mono" />
            </Field>
          </div>
        )}
      </Section>

      <Section
        id="selects"
        title="Select and Combobox"
        note="Keyboard: arrows, type-ahead, Enter, Esc."
      >
        {() => (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Output format">
              <Select options={SELECT_OPTIONS} defaultValue="webp" />
            </Field>
            <Field label="Placeholder">
              <Select options={SELECT_OPTIONS} placeholder="Choose a format" />
            </Field>
            <Field label="Disabled">
              <Select options={SELECT_OPTIONS} defaultValue="png" disabled />
            </Field>
            <Field label="Error" error="Choose a format to continue.">
              <Select options={SELECT_OPTIONS} placeholder="Choose a format" />
            </Field>
            <Field label="Time zone">
              <Combobox
                options={TIMEZONES}
                placeholder="Choose a time zone"
                searchPlaceholder="Search time zones…"
              />
            </Field>
            <Field label="Time zone (selected)">
              <Combobox
                options={TIMEZONES}
                defaultValue="asia-karachi"
                searchPlaceholder="Search time zones…"
              />
            </Field>
          </div>
        )}
      </Section>

      <Section id="choices" title="Checkbox, Radio, Switch">
        {() => (
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-3">
              <Checkbox label="Unchecked" />
              <Checkbox label="Checked" defaultChecked />
              <Checkbox label="Indeterminate" checked="indeterminate" />
              <Checkbox label="Disabled" disabled />
              <Checkbox label="Disabled, checked" disabled defaultChecked />
            </div>
            <RadioGroup defaultValue="medium" aria-label="Quality">
              <Radio value="low" label="Low" />
              <Radio value="medium" label="Medium" />
              <Radio value="high" label="High" />
              <Radio value="lossless" label="Lossless (disabled)" disabled />
            </RadioGroup>
            <div className="flex flex-col gap-3">
              <Switch label="Off" />
              <Switch label="On" defaultChecked />
              <Switch label="Disabled" disabled />
              <Switch label="Disabled, on" disabled defaultChecked />
            </div>
          </div>
        )}
      </Section>

      <Section
        id="slider"
        title="Slider and SegmentedControl"
        note="Slider: arrows step, Page Up/Down step ×10, Home/End. Segmented control: arrows move the selection; the pill slides."
      >
        {() => (
          <>
            <Slider label="Quality" defaultValue={80} formatValue={(value) => `${value}%`} />
            <Slider label="Disabled" defaultValue={30} disabled />
            <Demo title="Segmented control">
              <SegmentedControl
                label="Mode"
                value={segment}
                onValueChange={setSegment}
                options={[
                  { value: "encode", label: "Encode" },
                  { value: "decode", label: "Decode" },
                ]}
              />
              <SegmentedControl
                label="Indent"
                size="sm"
                defaultValue="2"
                options={[
                  { value: "2", label: "2 spaces" },
                  { value: "4", label: "4 spaces" },
                  { value: "tab", label: "Tabs" },
                  { value: "min", label: "Minify", disabled: true },
                ]}
              />
            </Demo>
          </>
        )}
      </Section>

      <Section id="tabs" title="Tabs" note="Arrow keys move between tabs; the underline slides.">
        {() => (
          <Tabs defaultValue="how">
            <TabsList aria-label="Tool information">
              <TabsTrigger value="how">How to use</TabsTrigger>
              <TabsTrigger value="formats">Formats & limits</TabsTrigger>
              <TabsTrigger value="faq">FAQ</TabsTrigger>
              <TabsTrigger value="soon" disabled>
                Disabled
              </TabsTrigger>
            </TabsList>
            <TabsContent value="how" className="text-body text-fg-muted">
              Drop your PDFs, put them in order, then download the merged file.
            </TabsContent>
            <TabsContent value="formats" className="text-body text-fg-muted">
              PDF files up to 500 MB in total on desktop.
            </TabsContent>
            <TabsContent value="faq" className="text-body text-fg-muted">
              Your files never leave your device.
            </TabsContent>
          </Tabs>
        )}
      </Section>

      <Section
        id="overlays"
        title="Menus, popover, dialog, sheet"
        note="Overlays open in the page theme. Dialogs trap focus, close on Esc and return focus to the trigger. Below sm the dialog is a bottom sheet."
      >
        {() => (
          <Demo title="Triggers">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>Dropdown menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>File</DropdownMenuLabel>
                <DropdownMenuItem shortcut="Ctrl O">
                  <FolderOpen aria-hidden />
                  Open
                </DropdownMenuItem>
                <DropdownMenuItem shortcut="Ctrl S">
                  <Download aria-hidden />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <FileText aria-hidden />
                  Disabled item
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem defaultChecked>Keep metadata</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button>Popover</Button>
              </PopoverTrigger>
              <PopoverContent className="flex flex-col gap-2">
                <p className="text-ui text-fg">Nothing is uploaded</p>
                <p className="text-small text-fg-muted">
                  Open your browser’s network tab while using a tool: no request carries your files.
                </p>
              </PopoverContent>
            </Popover>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Dialog</Button>
              </DialogTrigger>
              <DialogContent
                title="Remove all files?"
                description="This clears the 3 files you added. Your originals stay on your device."
              >
                <DialogFooter>
                  <DialogClose asChild>
                    <Button>Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button variant="danger">Remove files</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button>Sheet</Button>
              </DialogTrigger>
              <SheetContent title="Options" description="Settings for this tool.">
                <Field label="File name">
                  <Input defaultValue="merged.pdf" />
                </Field>
                <Switch label="Keep bookmarks" defaultChecked />
              </SheetContent>
            </Dialog>
          </Demo>
        )}
      </Section>

      <Section
        id="feedback"
        title="Toast, progress, skeleton"
        note="Toasts: bottom-right on desktop, bottom-centre on mobile; errors stay until closed."
      >
        {() => (
          <>
            <Demo title="Toasts">
              <Button
                size="sm"
                onClick={() =>
                  notify.success("Merged 3 PDFs", { description: "merged.pdf · 4.2 MB" })
                }
              >
                Success
              </Button>
              <Button size="sm" onClick={() => notify.info("Tip: press Ctrl+K to find a tool")}>
                Info
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  notify.warning("Large file", {
                    description: "This may take a minute on a phone.",
                  })
                }
              >
                Warning
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  notify.error("This PDF is password-protected", {
                    description: "Remove the password in your PDF app, then add the file again.",
                  })
                }
              >
                Error
              </Button>
            </Demo>
            <Demo title="Progress" className="flex-col items-stretch">
              <ProgressBar label="Determinate" value={0.35} showValue />
              <ProgressBar label="Complete" value={1} showValue />
              <ProgressBar label="Indeterminate" />
              <ProgressDemo />
            </Demo>
            <Demo title="Skeleton" className="flex-col items-stretch">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </Demo>
          </>
        )}
      </Section>

      <Section id="states" title="Empty and error states, copy">
        {() => (
          <>
            <EmptyState
              icon={<Upload aria-hidden />}
              title="No files yet"
              description="Drop PDFs here, or choose files from your device."
              action={<Button variant="primary">Choose files</Button>}
            />
            <ErrorState
              title="This file isn’t a PDF"
              description="photo.heic looks like an image. Choose a PDF file, or use JPG to PDF to convert images."
              action={
                <Button size="sm">
                  <RotateCcw aria-hidden />
                  Choose another file
                </Button>
              }
            />
            <Demo title="Copy button">
              <CopyButton value="eyJhbGciOiJIUzI1NiJ9" />
              <CopyButton value="eyJhbGciOiJIUzI1NiJ9" label="Copy token" iconOnly />
              <CopyButton value="" disabled />
            </Demo>
          </>
        )}
      </Section>

      <Section id="layout" title="Breadcrumbs">
        {() => (
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "PDF tools", href: "/pdf-tools" },
              { label: "Merge PDF" },
            ]}
          />
        )}
      </Section>
    </div>
  );
}
