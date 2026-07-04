import { Link } from 'react-router-dom'
import GlassCard from '../../components/GlassCard'
import { TOOLS } from './toolsRegistry'

export default function ToolsHubPage() {
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 28, letterSpacing: '-0.03em' }}>Dev Tools</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>Small utilities for everyday dev tasks</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {TOOLS.map(tool => {
          const Icon = tool.icon
          return (
            <Link key={tool.id} to={tool.path} style={{ textDecoration: 'none' }}>
              <GlassCard style={{ padding: 20, cursor: 'pointer', height: '100%' }}>
                <Icon size={20} color="var(--accent-cyan)" />
                <p style={{ fontWeight: 600, fontSize: 14, marginTop: 10, marginBottom: 4 }}>{tool.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tool.description}</p>
              </GlassCard>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
