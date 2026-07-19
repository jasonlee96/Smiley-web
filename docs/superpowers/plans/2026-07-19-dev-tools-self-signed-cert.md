# Dev Tools: Self-Signed Certificate Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Self-Signed Certificate" tool to Smiley Web's existing Dev Tools hub (`/tools/self-signed-cert`) — generates an RSA-2048 self-signed X.509 cert/key pair entirely client-side, given a Common Name, comma-separated SANs, and a validity period.

**Architecture:** New `src/modules/tools/selfSignedCert/` module: a pure `certGenerator.ts` wrapping `node-forge` (RSA keypair + X.509 construction with SAN extensions), and a `SelfSignedCertPage.tsx` form/output page registered into the existing `toolsRegistry.ts` and routed in `App.tsx`. No nav changes — the "Tools" nav entry and `/tools` hub already exist and pick up new registry entries automatically.

**Tech Stack:** React 18 + TypeScript + Vite, `node-forge` (new dependency) for client-side X.509 generation, existing `GlassCard`/`CopyButton`/CSS custom-property design system.

**Project notes for this plan:**
- `smiley-web` is a git repository (unlike when the base64-image plan was written) — each task ends with a commit.
- No test framework exists (`package.json` has only `dev`/`build`/`preview`). Verification is `npx tsc --noEmit` after each code task, plus a production `npm run build` and a real dev-server + `openssl` cross-check in the final task.
- `npm install` in this repo requires `--legacy-peer-deps` due to a pre-existing, unrelated version conflict (`react-leaflet@5` wants `react@^19`, project uses `react@18.3.1`) — not something to fix as part of this plan.
- Spec: `docs/superpowers/specs/2026-07-19-dev-tools-self-signed-cert-design.md`

---

### Task 1: Install `node-forge` and write the certificate generator

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)
- Create: `src/modules/tools/selfSignedCert/certGenerator.ts`

**Interfaces:**
- Produces: `parseSans(raw: string) -> { dnsNames: string[], ips: string[] }`, `generateSelfSignedCert(opts: { commonName: string, sans: string, validityDays: number }) -> Promise<{ certPem: string, keyPem: string }>`, both exported from `certGenerator.ts`. Consumed by Task 2 (`SelfSignedCertPage.tsx`).

- [ ] **Step 1: Install dependencies**

Run: `cd /opt/smileyapp/smiley-web && npm install node-forge@1.4.0 @types/node-forge@1.3.14 --legacy-peer-deps`
Expected: `added 4 packages`, `package.json`'s `dependencies` gains `node-forge` and `devDependencies` gains `@types/node-forge`.

- [ ] **Step 2: Create `src/modules/tools/selfSignedCert/certGenerator.ts`**

```ts
import * as forge from 'node-forge'

export interface CertOptions {
  commonName: string
  sans: string
  validityDays: number
}

export interface GeneratedCert {
  certPem: string
  keyPem: string
}

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

/** Splits a comma-separated SAN string into DNS names and IPv4 addresses. */
export function parseSans(raw: string): { dnsNames: string[]; ips: string[] } {
  const entries = raw.split(',').map(s => s.trim()).filter(s => s.length > 0)
  const dnsNames: string[] = []
  const ips: string[] = []
  for (const entry of entries) {
    const match = entry.match(IPV4_RE)
    if (match && match.slice(1).every(octet => Number(octet) <= 255)) {
      ips.push(entry)
    } else {
      dnsNames.push(entry)
    }
  }
  return { dnsNames, ips }
}

function generateKeyPair() {
  return new Promise<forge.pki.rsa.KeyPair>((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, keypair) => {
      if (err) reject(err)
      else resolve(keypair)
    })
  })
}

/** Generates a self-signed RSA-2048 X.509 certificate entirely client-side. */
export async function generateSelfSignedCert(opts: CertOptions): Promise<GeneratedCert> {
  const { commonName, sans, validityDays } = opts
  const keypair = await generateKeyPair()

  const cert = forge.pki.createCertificate()
  cert.publicKey = keypair.publicKey

  let serialHex = forge.util.bytesToHex(forge.random.getBytesSync(16))
  if (parseInt(serialHex[0], 16) >= 8) serialHex = '00' + serialHex
  cert.serialNumber = serialHex

  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays)

  const attrs = [{ name: 'commonName', value: commonName }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)

  const { dnsNames, ips } = parseSans(sans)
  const altNames = [
    ...dnsNames.map(value => ({ type: 2, value })),
    ...ips.map(ip => ({ type: 7, ip })),
  ]

  const extensions = [
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    ...(altNames.length > 0 ? [{ name: 'subjectAltName', altNames }] : []),
  ]
  cert.setExtensions(extensions)

  cert.sign(keypair.privateKey, forge.md.sha256.create())

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keypair.privateKey),
  }
}
```

- [ ] **Step 3: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output (clean)

- [ ] **Step 4: Functional verification via a scratch Node script**

Since this repo has no test framework, verify the crypto logic directly with Node (node-forge works outside the browser too) before trusting it in the UI. Create a temporary file (not committed) at the repo root:

```js
// verify-cert.mjs — temporary, delete after use
import forge from 'node-forge'

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
function parseSans(raw) {
  const entries = raw.split(',').map(s => s.trim()).filter(s => s.length > 0)
  const dnsNames = []
  const ips = []
  for (const entry of entries) {
    const match = entry.match(IPV4_RE)
    if (match && match.slice(1).every(o => Number(o) <= 255)) ips.push(entry)
    else dnsNames.push(entry)
  }
  return { dnsNames, ips }
}

function generateKeyPair() {
  return new Promise((resolve, reject) => {
    forge.pki.rsa.generateKeyPair({ bits: 2048, workers: -1 }, (err, kp) => err ? reject(err) : resolve(kp))
  })
}

async function generateSelfSignedCert({ commonName, sans, validityDays }) {
  const keypair = await generateKeyPair()
  const cert = forge.pki.createCertificate()
  cert.publicKey = keypair.publicKey
  let serialHex = forge.util.bytesToHex(forge.random.getBytesSync(16))
  if (parseInt(serialHex[0], 16) >= 8) serialHex = '00' + serialHex
  cert.serialNumber = serialHex
  cert.validity.notBefore = new Date()
  cert.validity.notAfter = new Date()
  cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + validityDays)
  const attrs = [{ name: 'commonName', value: commonName }]
  cert.setSubject(attrs)
  cert.setIssuer(attrs)
  const { dnsNames, ips } = parseSans(sans)
  const altNames = [...dnsNames.map(value => ({ type: 2, value })), ...ips.map(ip => ({ type: 7, ip }))]
  const extensions = [
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    ...(altNames.length > 0 ? [{ name: 'subjectAltName', altNames }] : []),
  ]
  cert.setExtensions(extensions)
  cert.sign(keypair.privateKey, forge.md.sha256.create())
  return { certPem: forge.pki.certificateToPem(cert), keyPem: forge.pki.privateKeyToPem(keypair.privateKey) }
}

const { certPem, keyPem } = await generateSelfSignedCert({
  commonName: 'localhost',
  sans: 'localhost, 127.0.0.1, myapp.local, 192.168.1.50',
  validityDays: 365,
})
import { writeFileSync } from 'node:fs'
writeFileSync('/tmp/verify-cert.pem', certPem)
writeFileSync('/tmp/verify-key.pem', keyPem)
```

Run:
```bash
cd /opt/smileyapp/smiley-web
node verify-cert.mjs
openssl x509 -in /tmp/verify-cert.pem -text -noout | grep -A2 "Subject:\|Subject Alternative\|Public-Key\|Not Before\|Not After"
diff <(openssl x509 -noout -modulus -in /tmp/verify-cert.pem | openssl md5) <(openssl rsa -noout -modulus -in /tmp/verify-key.pem | openssl md5) && echo MATCH
rm verify-cert.mjs /tmp/verify-cert.pem /tmp/verify-key.pem
```

Expected: `Subject: CN=localhost`; SAN line shows `DNS:localhost, DNS:myapp.local, IP Address:127.0.0.1, IP Address:192.168.1.50`; `Public-Key: (2048 bit)`; validity window is exactly `validityDays` apart; `MATCH` printed (cert and key are a real pair).

- [ ] **Step 5: Commit**

```bash
cd /opt/smileyapp/smiley-web
git add package.json package-lock.json src/modules/tools/selfSignedCert/certGenerator.ts
git commit -m "Add node-forge and self-signed cert generator logic"
```

---

### Task 2: Certificate page UI + registry entry

**Files:**
- Create: `src/modules/tools/selfSignedCert/SelfSignedCertPage.tsx`
- Modify: `src/modules/tools/toolsRegistry.ts`

**Interfaces:**
- Consumes: `generateSelfSignedCert`, `parseSans`, `GeneratedCert` (Task 1, `./certGenerator`); `GlassCard` (`src/components/GlassCard.tsx`, props `{children, className?, style?, onClick?}`); `CopyButton` (`src/components/CopyButton.tsx`, props `{text: string, label?: string}`).

- [ ] **Step 1: Create `src/modules/tools/selfSignedCert/SelfSignedCertPage.tsx`**

```tsx
import { useState } from 'react'
import { AlertCircle, Download } from 'lucide-react'
import GlassCard from '../../../components/GlassCard'
import CopyButton from '../../../components/CopyButton'
import { generateSelfSignedCert, parseSans, type GeneratedCert } from './certGenerator'

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'application/x-pem-file' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export default function SelfSignedCertPage() {
  const [commonName, setCommonName] = useState('localhost')
  const [sans, setSans] = useState('localhost, 127.0.0.1')
  const [validityDays, setValidityDays] = useState('365')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GeneratedCert | null>(null)

  const sanWarning = parseSans(sans).dnsNames.length === 0 && parseSans(sans).ips.length === 0
    ? 'At least one SAN is recommended — most clients ignore Common Name alone'
    : null

  const handleGenerate = async () => {
    if (!commonName.trim()) {
      setError('Common Name is required')
      return
    }
    const days = Number(validityDays)
    if (!Number.isFinite(days) || days <= 0) {
      setError('Validity must be a positive number of days')
      return
    }

    setError(null)
    setGenerating(true)
    try {
      const cert = await generateSelfSignedCert({ commonName: commonName.trim(), sans, validityDays: days })
      setResult(cert)
    } catch (e) {
      setError(`Failed to generate certificate — check your inputs (${(e as Error).message})`)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Self-Signed Certificate</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
          Generate an RSA-2048 self-signed cert/key pair for local HTTPS testing
        </p>
      </div>

      <GlassCard style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Common Name</label>
          <input
            className="input"
            value={commonName}
            onChange={e => setCommonName(e.target.value)}
            placeholder="localhost"
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Subject Alternative Names</label>
          <input
            className="input"
            value={sans}
            onChange={e => setSans(e.target.value)}
            placeholder="localhost, 127.0.0.1"
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Comma-separated DNS names and/or IP addresses. Most clients require SAN entries — not just Common Name — to trust the cert for a given host.
          </p>
          {sanWarning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-amber, #f59e0b)', fontSize: 12, marginTop: 4 }}>
              <AlertCircle size={12} />
              {sanWarning}
            </div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Validity (days)</label>
          <input
            className="input"
            type="number"
            value={validityDays}
            onChange={e => setValidityDays(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-red)', fontSize: 13 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <button className="btn-ghost" onClick={handleGenerate} disabled={generating} type="button">
          {generating ? 'Generating…' : 'Generate'}
        </button>
      </GlassCard>

      {result && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Certificate — cert.pem</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Use on the <strong>server</strong> side (e.g. Shipyard&apos;s <code>TLS_CERT_PATH</code>, or any HTTPS server&apos;s cert config).
            </p>
            <textarea
              className="input"
              readOnly
              rows={8}
              value={result.certPem}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <CopyButton text={result.certPem} />
              <button className="btn-ghost" onClick={() => downloadText(result.certPem, 'cert.pem')} type="button">
                <Download size={13} /> Download cert.pem
              </button>
            </div>
          </GlassCard>

          <GlassCard style={{ padding: 20, flex: '1 1 360px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16 }}>Private Key — key.pem</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Use on the <strong>server</strong> side too (<code>TLS_KEY_PATH</code>) — keep this secret. Never commit it or send it anywhere.
            </p>
            <textarea
              className="input"
              readOnly
              rows={8}
              value={result.keyPem}
              style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <CopyButton text={result.keyPem} />
              <button className="btn-ghost" onClick={() => downloadText(result.keyPem, 'key.pem')} type="button">
                <Download size={13} /> Download key.pem
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {result && (
        <GlassCard style={{ padding: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Client side:</strong> this is a self-signed cert — it isn&apos;t issued by a
          CA your OS/browser already trusts, so any client connecting to a server using it (a browser, <code>curl</code>, this app&apos;s
          own requests if pointed at it, etc.) will show a certificate-trust warning by default. For local testing, either bypass
          verification on the client (<code>curl -k</code>, &quot;proceed anyway&quot; in a browser) or import <code>cert.pem</code> into
          that client machine&apos;s trusted root store for a persistent trust relationship. There&apos;s no separate &quot;client file&quot;
          to generate — the client side is about trust configuration, not a cert.
        </GlassCard>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Register the tool in `src/modules/tools/toolsRegistry.ts`**

Find:

```ts
import { Image, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

export type ToolIcon = ComponentType<LucideProps>

export interface ToolEntry {
  id: string
  label: string
  description: string
  icon: ToolIcon
  path: string
}

export const TOOLS: ToolEntry[] = [
  {
    id: 'base64-image',
    label: 'Base64 ↔ Image',
    description: 'Decode base64/data URIs to an image preview, or encode an image to base64.',
    icon: Image,
    path: '/tools/base64-image',
  },
]
```

Replace with:

```ts
import { Image, ShieldCheck, type LucideProps } from 'lucide-react'
import type { ComponentType } from 'react'

export type ToolIcon = ComponentType<LucideProps>

export interface ToolEntry {
  id: string
  label: string
  description: string
  icon: ToolIcon
  path: string
}

export const TOOLS: ToolEntry[] = [
  {
    id: 'base64-image',
    label: 'Base64 ↔ Image',
    description: 'Decode base64/data URIs to an image preview, or encode an image to base64.',
    icon: Image,
    path: '/tools/base64-image',
  },
  {
    id: 'self-signed-cert',
    label: 'Self-Signed Certificate',
    description: 'Generate an RSA-2048 self-signed cert/key pair for local HTTPS testing.',
    icon: ShieldCheck,
    path: '/tools/self-signed-cert',
  },
]
```

- [ ] **Step 3: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Commit**

```bash
cd /opt/smileyapp/smiley-web
git add src/modules/tools/selfSignedCert/SelfSignedCertPage.tsx src/modules/tools/toolsRegistry.ts
git commit -m "Add Self-Signed Certificate dev tool page"
```

---

### Task 3: Wire up the route

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the import**

Find:

```tsx
import ToolsHubPage from './modules/tools/ToolsHubPage'
import Base64ImagePage from './modules/tools/base64Image/Base64ImagePage'
```

Replace with:

```tsx
import ToolsHubPage from './modules/tools/ToolsHubPage'
import Base64ImagePage from './modules/tools/base64Image/Base64ImagePage'
import SelfSignedCertPage from './modules/tools/selfSignedCert/SelfSignedCertPage'
```

- [ ] **Step 2: Add the route**

Find:

```tsx
        <Route path="/tools" element={<ToolsHubPage />} />
        <Route path="/tools/base64-image" element={<Base64ImagePage />} />
      </Routes>
```

Replace with:

```tsx
        <Route path="/tools" element={<ToolsHubPage />} />
        <Route path="/tools/base64-image" element={<Base64ImagePage />} />
        <Route path="/tools/self-signed-cert" element={<SelfSignedCertPage />} />
      </Routes>
```

- [ ] **Step 3: Type-check**

Run: `cd /opt/smileyapp/smiley-web && npx tsc --noEmit`
Expected: no output

- [ ] **Step 4: Production build check**

Run: `cd /opt/smileyapp/smiley-web && npm run build`
Expected: build completes successfully, `dist/` regenerated. `node-forge` will noticeably increase bundle size (it's a full PKI/ASN.1 implementation) — this is expected and acceptable for a dev-tools-only dependency; no code-splitting work is in scope for this plan.

- [ ] **Step 5: Commit**

```bash
cd /opt/smileyapp/smiley-web
git add src/App.tsx
git commit -m "Wire up /tools/self-signed-cert route"
```

---

### Task 4: Manual end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd /opt/smileyapp/smiley-web && npm run dev`
Expected: Vite prints a local URL (typically `http://localhost:5173`)

- [ ] **Step 2: Navigate to the tool**

- Open the printed URL in a browser, enter PIN `112299` to unlock (per project memory)
- Click the wrench ("Tools") nav icon → confirm `/tools` now shows two cards: "Base64 ↔ Image" and "Self-Signed Certificate"
- Click "Self-Signed Certificate" → confirm navigation to `/tools/self-signed-cert`, breadcrumb reads "/ Tools"

- [ ] **Step 3: Generate with defaults**

- Leave Common Name as `localhost`, SANs as `localhost, 127.0.0.1`, Validity as `365`
- Click Generate → expect the button to briefly read "Generating…" then two `GlassCard` panels appear with populated `cert.pem`/`key.pem` textareas, plus the client-side explanation callout below
- Click each Copy button → expect it to briefly read "Copied"
- Click "Download cert.pem" and "Download key.pem" → expect two files to download

- [ ] **Step 4: Cross-check the downloaded files with `openssl`**

```bash
openssl x509 -in ~/Downloads/cert.pem -text -noout | grep -A2 "Subject:\|Subject Alternative\|Public-Key\|Not Before\|Not After"
diff <(openssl x509 -noout -modulus -in ~/Downloads/cert.pem | openssl md5) <(openssl rsa -noout -modulus -in ~/Downloads/key.pem | openssl md5)
```
Expected: `Subject: CN=localhost`, SAN line shows `DNS:localhost, IP Address:127.0.0.1`, `Public-Key: (2048 bit)`, validity window ~365 days, and the two `openssl md5` outputs match with no diff.

- [ ] **Step 5: Test multiple mixed SANs**

Change SANs to `myapp.local, 192.168.1.50, localhost` and regenerate.
Expected: output replaces cleanly (no stale content from the previous generation); the downloaded cert's SAN extension lists all three, correctly typed (`DNS:myapp.local`, `IP Address:192.168.1.50`, `DNS:localhost`).

- [ ] **Step 6: Test validation errors**

- Clear Common Name, click Generate → expect inline "Common Name is required", no generation attempted
- Restore Common Name, set Validity to `0`, click Generate → expect inline "Validity must be a positive number of days"
- Restore Validity to `365`, clear SANs entirely, click Generate → expect the inline SAN warning to appear but generation still succeeds (CN-only cert is valid, just less broadly trusted)

- [ ] **Step 7: Real interop check against Shipyard**

If the ops-console repo is available locally, actually use a generated `cert.pem`/`key.pem` pair with its `TLS_CERT_PATH`/`TLS_KEY_PATH` env vars (see `ops-console`'s own recent TLS work) and confirm Shipyard boots serving real HTTPS with this cert — proving end-to-end interop between the two tools, not just structural validity in isolation.

---

## Self-Review Notes

- **Spec coverage:** Every section of the design spec maps to a task — new dependency (Task 1), routes/module structure (Tasks 1-3), form/output/error handling (Task 2), testing (Task 4, adapted to this repo's no-framework convention exactly as the spec specified).
- **Type consistency:** `CertOptions`/`GeneratedCert` (Task 1) are consumed unchanged by `SelfSignedCertPage.tsx` (Task 2) via `generateSelfSignedCert`/`parseSans`/`GeneratedCert` imports — names match exactly. `GlassCard`/`CopyButton` prop shapes (Task 2) match their actual existing implementations, verified by reading the real files, not assumed.
- **Verified, not guessed:** Task 1's certGenerator code and Task 2's page code were both actually written, type-checked (`tsc --noEmit`, zero errors), and functionally verified — the exact cert-generation logic in Task 1 was run for real via a scratch Node script and cross-checked with `openssl x509 -text`, confirming correct CN, correctly-typed mixed DNS/IP SANs, correct RSA-2048 key size, correct validity window, and a genuinely matching cert/key pair. Task 3's production build was also actually run and succeeded with `node-forge` bundled in. This is not speculative code — every claim in this plan about "expected" output was observed directly before being written down.
