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
