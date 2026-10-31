"use client";

import { CircleAlert, CircleCheck, CircleX, Eraser, ShieldAlert, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CodeEditor, type CodeEditorHandle } from "@/components/tool/CodeEditor";
import { ResultList, type ResultRow } from "@/components/tool/ResultList";
import { Workbench, WorkbenchPane } from "@/components/tool/Workbench";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Field } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatRelative } from "@/lib/time";
import { SAMPLE_SECRET, SAMPLE_TOKEN } from "./constants";
// logic.ts is small and has no dependencies; jose (verify.ts) loads on Verify.
import { decodeJwt, type DecodedJwt, type TimeStatus } from "./logic";
import type { VerifyOutcome } from "./verify";

/** Live update delay after typing (tool-specifications §2.3). */
const DEBOUNCE_MS = 150;

const STATUS: Record<TimeStatus, { label: string; tone: BadgeTone }> = {
  valid: { label: "Valid", tone: "success" },
  expired: { label: "Expired", tone: "danger" },
  "not-yet-valid": { label: "Not yet valid", tone: "warning" },
  "no-expiry": { label: "No expiry", tone: "neutral" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "long" });

const loadVerify = () => import("./verify");

export default function JwtDecoderUI() {
  // Tokens are content: in memory only, never stored or put in the URL (§5.2).
  const [input, setInput] = useState("");
  // The token after the debounce, with the time it was read: statuses are for that moment.
  const [live, setLive] = useState({ text: "", now: 0 });
  const editor = useRef<CodeEditorHandle>(null);
  const errorId = useId();

  useEffect(() => {
    const timer = setTimeout(() => setLive({ text: input, now: Date.now() }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  const { now } = live;
  const empty = live.text.trim() === "";
  const result = empty ? null : decodeJwt(live.text, now);
  const jwt = result?.ok ? result.jwt : null;
  const error = result && !result.ok ? result.error : null;

  return (
    <Workbench
      toolbar={
        <p className="flex items-center gap-2 text-small text-fg-muted">
          <ShieldAlert aria-hidden className="size-4 shrink-0" />
          Decoding shows what a token says; only verifying the signature shows that it’s genuine.
        </p>
      }
      footer={
        <>
          {error && (
            <div id={errorId}>
              <ErrorState
                title="This isn’t a valid JWT"
                description={`Line ${error.line}, column ${error.column}: ${error.message}`}
                action={
                  <Button size="sm" onClick={() => editor.current?.focusAt(error.offset)}>
                    Go to error
                  </Button>
                }
              />
            </div>
          )}
          {jwt ? (
            <VerifyPanel key={jwt.token} jwt={jwt} />
          ) : (
            !error && (
              <p className="text-small text-fg-muted">
                Verify the signature here once a token is decoded.
              </p>
            )
          )}
        </>
      }
    >
      <WorkbenchPane
        title="Token"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_TOKEN)}>
              <Sparkles aria-hidden />
              Sample
            </Button>
            <IconButton
              label="Clear input"
              icon={<Eraser aria-hidden />}
              size="sm"
              onClick={() => {
                setInput("");
                editor.current?.focus();
              }}
              disabled={input === ""}
            />
          </>
        }
        status={
          <span role="status">
            {empty ? (
              "Paste a JWT. “Bearer ” and line breaks are removed."
            ) : error ? (
              <span className="inline-flex items-center gap-1.5 text-danger">
                <CircleAlert aria-hidden className="size-4" />
                Invalid JWT: line {error.line}, column {error.column}
              </span>
            ) : jwt ? (
              `${jwt.alg ?? "No alg"} token, ${STATUS[jwt.status].label.toLowerCase()}`
            ) : (
              "Decoding…"
            )}
          </span>
        }
      >
        <CodeEditor
          ref={editor}
          value={input}
          onChange={setInput}
          label="JWT"
          language="text"
          wrap
          placeholder="eyJhbGciOi…"
          errorOffset={error?.offset ?? null}
          describedBy={error ? errorId : undefined}
          invalid={Boolean(error)}
        />
      </WorkbenchPane>

      <WorkbenchPane title="Decoded">
        {jwt ? (
          <Decoded jwt={jwt} now={now} />
        ) : (
          <div className="flex h-full items-center p-4">
            <EmptyState
              className="w-full"
              title={error ? "Fix the token to see its contents" : "Nothing to show yet"}
              description={
                error
                  ? "The first problem is highlighted in the input."
                  : "Paste a JWT. Its header, payload and claims appear here."
              }
              action={
                !error && (
                  <Button size="sm" onClick={() => setInput(SAMPLE_TOKEN)}>
                    Insert sample
                  </Button>
                )
              }
            />
          </div>
        )}
      </WorkbenchPane>
    </Workbench>
  );
}

function Decoded({ jwt, now }: { jwt: DecodedJwt; now: number }) {
  const status = STATUS[jwt.status];
  const statusText =
    jwt.status === "expired" && jwt.expiresMs !== null
      ? `Expired ${formatRelative(jwt.expiresMs, now)}`
      : jwt.status === "valid" && jwt.expiresMs !== null
        ? `Expires ${formatRelative(jwt.expiresMs, now)}`
        : jwt.status === "not-yet-valid" && jwt.notBeforeMs !== null
          ? `Valid ${formatRelative(jwt.notBeforeMs, now)}`
          : "The token has no exp claim";
  const rows: ResultRow[] = jwt.claims.map((claim) => ({
    label: claim.description ? `${claim.name} (${claim.description})` : claim.name,
    value: claim.value,
    shown:
      claim.timeMs !== null ? (
        <span className="flex flex-col">
          <span>{claim.value}</span>
          <span className="font-sans text-small text-fg-muted">
            {dateFormat.format(claim.timeMs)} · {formatRelative(claim.timeMs, now)}
          </span>
        </span>
      ) : undefined,
  }));

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-3 md:p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={status.tone}>{status.label}</Badge>
        <span className="text-small text-fg-muted">{statusText}. Time-based check only.</span>
      </div>
      {jwt.unsecured && (
        <p className="flex items-start gap-2 rounded-md border border-danger bg-danger-soft p-3 text-small text-fg">
          <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <span>
            This token uses <code className="font-mono">alg: none</code>: it isn’t signed, so anyone
            can change it. Never accept such tokens.
          </span>
        </p>
      )}
      <JsonBlock title="Header" json={jwt.headerJson} />
      {rows.length > 0 && (
        <section className="flex flex-col gap-2" aria-label="Claims">
          <h3 className="text-ui text-fg">Claims</h3>
          <ResultList rows={rows} />
        </section>
      )}
      <JsonBlock title={jwt.payload ? "Payload" : "Payload (not JSON)"} json={jwt.payloadJson} />
    </div>
  );
}

function JsonBlock({ title, json }: { title: string; json: string }) {
  const titleId = useId();
  return (
    <section className="flex flex-col gap-2" aria-labelledby={titleId}>
      <div className="flex items-center justify-between gap-2">
        <h3 id={titleId} className="text-ui text-fg">
          {title}
        </h3>
        <CopyButton value={json} label={`Copy ${title.toLowerCase()}`} variant="ghost" size="sm" />
      </div>
      {/* Focusable so keyboard users can scroll long values. */}
      <pre
        tabIndex={0}
        aria-labelledby={titleId}
        className="max-h-64 overflow-auto rounded-md border border-border bg-surface-2 p-3 font-mono text-code break-all whitespace-pre-wrap text-fg"
      >
        {json}
      </pre>
    </section>
  );
}

function VerifyPanel({ jwt }: { jwt: DecodedJwt }) {
  const [key, setKey] = useState("");
  const [outcome, setOutcome] = useState<VerifyOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const secret = jwt.alg !== null && /^HS/.test(jwt.alg);

  async function verify() {
    setBusy(true);
    try {
      const { verifySignature } = await loadVerify();
      setOutcome(await verifySignature(jwt.token, jwt.alg, key));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="text-ui text-fg">
        Verify signature{" "}
        <span className="text-fg-muted">
          ({jwt.unsecured ? "unsigned" : (jwt.alg ?? "no algorithm")})
        </span>
      </h2>
      {jwt.unsecured ? (
        <p className="text-small text-fg-muted">There is no signature to verify.</p>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          {secret ? (
            <Field
              label="Secret"
              description={
                jwt.token === SAMPLE_TOKEN
                  ? `The sample token’s secret is “${SAMPLE_SECRET}”.`
                  : "The shared secret, as text. Used in this page only and never stored."
              }
            >
              <Input
                value={key}
                onChange={(event) => {
                  setKey(event.target.value);
                  setOutcome(null);
                }}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
            </Field>
          ) : (
            <Field
              label="Public key"
              description="PEM (-----BEGIN PUBLIC KEY-----), a certificate, a JWK or a JWKS. Never paste a private key."
            >
              <Textarea
                value={key}
                onChange={(event) => {
                  setKey(event.target.value);
                  setOutcome(null);
                }}
                spellCheck={false}
                className="font-mono text-code"
              />
            </Field>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" size="sm" loading={busy}>
              Verify
            </Button>
            <span role="status" className="text-small">
              {outcome?.status === "verified" ? (
                <span className="inline-flex items-center gap-1.5 text-success">
                  <CircleCheck aria-hidden className="size-4" />
                  Signature verified
                </span>
              ) : outcome?.status === "invalid" ? (
                <span className="inline-flex items-center gap-1.5 text-danger">
                  <CircleX aria-hidden className="size-4" />
                  Invalid signature
                </span>
              ) : outcome?.status === "error" ? (
                <span className="inline-flex items-start gap-1.5 text-danger">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {outcome.message}
                </span>
              ) : null}
            </span>
          </div>
        </form>
      )}
    </section>
  );
}
