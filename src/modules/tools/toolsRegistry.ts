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
