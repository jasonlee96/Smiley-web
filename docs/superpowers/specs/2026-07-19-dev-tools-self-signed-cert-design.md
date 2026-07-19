# Dev Tools: Self-Signed Certificate Generator — Smiley Web Design Spec

**Date:** 2026-07-19
**Status:** Approved

## Overview

Add a new Dev Tools entry: a self-signed TLS certificate generator. Given a Common Name, one or more Subject Alternative Names (DNS names and/or IPs), and a validity period, it generates an RSA 2048 key pair and a self-signed X.509 certificate — entirely client-side, using `node-forge` for the crypto/ASN.1 work. No backend/API changes, no new env vars, matching the existing Base64 ↔ Image tool's all-client-side pattern.

Primary use case: quickly producing a `cert.pem`/`key.pem` pair for local HTTPS testing — e.g. Shipyard's `TLS_CERT_PATH`/`TLS_KEY_PATH` env vars, or any other local dev server that needs a cert.

---

## New Dependency

`node-forge` (+ `@types/node-forge`) — pure-JS PKI library, generates RSA key pairs and constructs self-signed X.509 certificates with SAN extensions, works unmodified in the browser via Vite's bundling. No other browser-crypto tool in this ecosystem offers as complete X.509-with-extensions support with as little integration work.

---

## Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/tools/self-signed-cert` | `SelfSignedCertPage` | Cert generator form + output |

Added to `src/App.tsx` alongside the existing `/tools/base64-image` route, and to `toolsRegistry.ts`'s `TOOLS` array (new entry, `ShieldCheck` icon from `lucide-react`). No nav changes needed — `/tools` hub page picks it up automatically from the registry.

---

## Module Structure

```
src/
  modules/tools/
    toolsRegistry.ts              # +1 entry
    selfSignedCert/
      SelfSignedCertPage.tsx      # form + output page shell
      certGenerator.ts            # generateSelfSignedCert() — pure, node-forge wrapper
```

`certGenerator.ts` exports:

```ts
export interface CertOptions {
  commonName: string
  sans: string          // raw comma-separated input, e.g. "localhost, 127.0.0.1"
  validityDays: number
}

export interface GeneratedCert {
  certPem: string
  keyPem: string
}

export async function generateSelfSignedCert(opts: CertOptions): Promise<GeneratedCert>

// exported for isolated testing/reuse — not part of the primary public API surface
export function parseSans(raw: string): { dnsNames: string[]; ips: string[] }
```

`parseSans` splits on commas, trims whitespace, drops empty entries, and classifies each entry as an IP (matches a basic IPv4 dotted-quad regex) or a DNS name (everything else) — feeding forge's SAN extension format, which requires IPs and DNS names to be tagged with different `type` values (`type: 2` for DNS, `type: 7` for IP).

`generateSelfSignedCert` is `async` because RSA 2048 key generation runs through forge's async API (`forge.pki.rsa.generateKeyPair({ bits: 2048 }, callback)`, wrapped in a Promise) rather than the sync one — this keeps the ~1-2s generation off the main thread's synchronous execution path so the UI can show a "Generating…" state instead of freezing.

---

## Self-Signed Cert Page (`/tools/self-signed-cert`)

### Form

- **Common Name** — text input, default `localhost`
- **Subject Alternative Names** — single text input, default `localhost, 127.0.0.1`, helper text: "Comma-separated DNS names and/or IP addresses. Most clients require SAN entries — not just Common Name — to trust the cert for a given host."
- **Validity (days)** — number input, default `365`
- Key type is fixed at RSA 2048, not exposed as a control
- **Generate** button — disabled while generating, label changes to "Generating…"

### Output (shown after first successful generation)

Two `GlassCard` sections, each with a read-only PEM `<textarea>`, a `CopyButton` (existing shared component), and a "Download" button (Blob + object URL, matching the Base64 tool's download pattern):

- **Certificate — `cert.pem`**
  Label: "Use on the **server** side (e.g. Shipyard's `TLS_CERT_PATH`, or any HTTPS server's cert config)."
- **Private Key — `key.pem`**
  Label: "Use on the **server** side too (`TLS_KEY_PATH`) — keep this secret. Never commit it or send it anywhere."

Below both, a third, visually distinct callout (no textarea — this isn't a generated artifact) explaining the **client** side:

> This is a self-signed cert — it isn't issued by a CA your OS/browser already trusts, so any client connecting to a server using it (a browser, `curl`, this app's own `axios` calls if you point them at it, etc.) will show a certificate-trust warning by default. For local testing, either bypass verification on the client (`curl -k`, "proceed anyway" in a browser) or import `cert.pem` into that client machine's trusted root store for a persistent trust relationship. There's no separate "client file" to generate — the client side is about trust configuration, not a cert.

Regenerating (changing form fields and clicking Generate again) replaces the output in place; it does not append a history of previously generated certs.

---

## Error Handling

- Empty Common Name on submit → inline "Common Name is required", generation not attempted (matches the existing tool's inline-error style, not a toast/alert)
- Empty SANs after parsing (e.g. input was all whitespace/commas) → inline warning "At least one SAN is recommended — most clients ignore Common Name alone" but generation is still allowed to proceed (a CN-only self-signed cert is valid, just less broadly trusted by strict clients)
- Validity days ≤ 0 or non-numeric → inline "Validity must be a positive number of days", generation not attempted
- forge's key generation or cert construction throwing (should be rare — only from a malformed SAN string that neither the DNS-name nor IP branch can express) → inline "Failed to generate certificate — check your inputs" with the caught error's message appended for debugging

---

## Testing

No automated test framework exists in `smiley-web` (confirmed: no vitest/jest, no `__tests__` anywhere). Verification is manual via `npm run dev`, plus cross-checking generated output with `openssl`:

- Generate with defaults (`localhost`, `localhost, 127.0.0.1`, 365 days) → both PEM blocks populate, copy buttons work, downloads produce `cert.pem`/`key.pem` files
- Pipe the downloaded `cert.pem` through `openssl x509 -text -noout` → confirm CN matches, SAN extension lists both `DNS:localhost` and `IP Address:127.0.0.1`, validity period is ~365 days from generation time, key is RSA 2048
- Confirm `key.pem` and `cert.pem` are a matching pair: `openssl x509 -noout -modulus -in cert.pem | openssl md5` equals `openssl rsa -noout -modulus -in key.pem | openssl md5`
- Multiple SANs, mixed DNS/IP (e.g. `myapp.local, 192.168.1.50, localhost`) → all three appear correctly typed in the SAN extension
- Empty Common Name → inline error, no generation attempted
- Non-numeric/negative validity days → inline error, no generation attempted
- Regenerate after changing inputs → output replaces cleanly, no stale state
- Verify `/tools` hub shows the new card and navigates correctly; breadcrumb shows "/ Tools" on `/tools/self-signed-cert`
- Actually use a generated cert/key pair with the ops-console `TLS_CERT_PATH`/`TLS_KEY_PATH` env vars to confirm real interop end-to-end, not just structural validity
