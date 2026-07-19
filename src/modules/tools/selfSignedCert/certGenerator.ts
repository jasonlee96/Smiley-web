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
