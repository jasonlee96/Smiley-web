import { useState } from 'react'
import { useTodos } from '../../hooks/useTodos'
import TodoItem from './TodoItem'
import AddTodoForm from './AddTodoForm'
import WeekCalendar from './WeekCalendar'
import GlassCard from '../../components/GlassCard'
import Spinner from '../../components/Spinner'
import { CheckSquare, Zap, ChevronDown, ChevronUp, RefreshCw, List, CalendarDays } from 'lucide-react'
import type { Todo } from '../../types/todos'

type View = 'list' | 'calendar'
type WorkspaceFilter = 'all' | 'work' | 'personal'

export default function TodosPage() {
  const [view, setView] = useState<View>('list')
  const [wsFilter, setWsFilter] = useState<WorkspaceFilter>('all')
  const { todayQuery, workloadQuery, weekQuery, createMutation, updateMutation, deleteMutation, scheduleMutation } = useTodos()
  const [showWorkload, setShowWorkload] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [prefilledDate, setPrefilledDate] = useState<string | undefined>()

  const allTodos = weekQuery.data ?? []
  const todos = wsFilter === 'all' ? allTodos : allTodos.filter(t => t.workspace === wsFilter)
  const work = allTodos.filter(t => t.workspace === 'work')
  const personal = allTodos.filter(t => t.workspace === 'personal')
  const pending = todos.filter(t => t.status === 'not_started')
  const inProgress = todos.filter(t => t.status === 'in_progress')
  const done = todos.filter(t => t.status === 'done')
  const doneCount = done.length
  const calTodos = wsFilter === 'all' ? allTodos : allTodos.filter(t => t.workspace === wsFilter)

  const handleAddWithDate = (date: string) => {
    setPrefilledDate(date)
    setShowAdd(true)
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
          }}>
            {view === 'list' ? 'All Tasks' : 'Week Planner'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {weekQuery.isFetching && <Spinner size={16} />}

          {/* Workspace filter */}
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
            {([
              { id: 'all',      label: 'All',      color: 'var(--accent-cyan)' },
              { id: 'work',     label: 'Work',     color: 'var(--accent-amber)' },
              { id: 'personal', label: 'Personal', color: '#a78bfa' },
            ] as const).map(({ id, label, color }) => (
              <button
                key={id}
                onClick={() => setWsFilter(id)}
                style={{
                  padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'Inter',
                  background: wsFilter === id ? `${color}20` : 'transparent',
                  color: wsFilter === id ? color : 'var(--text-muted)',
                  transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {wsFilter === id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />}
                {label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            {([
              { id: 'list', icon: List, label: 'List' },
              { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'Inter',
                  background: view === id ? 'var(--accent-cyan-dim)' : 'transparent',
                  color: view === id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <button className="btn-ghost" onClick={() => weekQuery.refetch()} style={{ padding: '6px 10px' }} title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button className="btn-primary" onClick={() => setShowAdd(v => !v)}>
            + Add Task
          </button>
        </div>
      </div>

      {/* Stats bar — always visible */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Total', value: todos.length, color: 'var(--text-secondary)' },
          { label: 'Done', value: doneCount, color: 'var(--accent-green)' },
          { label: 'Remaining', value: todos.length - doneCount, color: 'var(--accent-cyan)' },
          { label: 'Work', value: work.length, color: 'var(--accent-amber)' },
          { label: 'Personal', value: personal.length, color: '#a78bfa' },
        ].map(stat => (
          <GlassCard key={stat.label} style={{ padding: '12px 18px', flex: 1 }}>
            <div style={{ fontSize: 22, fontFamily: 'IBM Plex Mono', fontWeight: 500, color: stat.color }}>
              {weekQuery.isLoading ? '—' : stat.value}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {stat.label}
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Add form */}
      {showAdd && (
        <GlassCard style={{ padding: '20px 22px' }} className="animate-slide-up">
          <AddTodoForm
            onSubmit={async (data) => { await createMutation.mutateAsync(data); setShowAdd(false); setPrefilledDate(undefined) }}
            onCancel={() => { setShowAdd(false); setPrefilledDate(undefined) }}
            loading={createMutation.isPending}
            prefilledDate={prefilledDate}
          />
        </GlassCard>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <WeekCalendar
          todos={calTodos}
          loading={weekQuery.isLoading}
          onSchedule={(id, date, endDate) => scheduleMutation.mutate({ id, planned_date: date, planned_date_end: endDate ?? null })}
          onToggle={(id, status) => updateMutation.mutate({ id, data: { status } })}
          onAddWithDate={handleAddWithDate}
        />
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <>
          {/* Error */}
          {weekQuery.isError && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 10, padding: '12px 16px', color: 'var(--accent-red)', fontSize: 13,
            }}>
              Failed to load todos. Check your connection.
            </div>
          )}

          {/* Loading */}
          {weekQuery.isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--text-muted)' }}>
              <Spinner /> Loading tasks...
            </div>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <SectionHeader label="Pending" count={pending.length} color="var(--accent-cyan)" />
              <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {pending.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={(id, status) => updateMutation.mutate({ id, data: { status } })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onDateChange={(id, planned_date, planned_date_end) => updateMutation.mutate({ id, data: { planned_date: planned_date ?? undefined, planned_date_end: planned_date_end } })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* In Progress */}
          {inProgress.length > 0 && (
            <div>
              <SectionHeader label="In Progress" count={inProgress.length} color="var(--accent-amber)" />
              <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {inProgress.map(todo => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={(id, status) => updateMutation.mutate({ id, data: { status } })}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onDateChange={(id, planned_date, planned_date_end) => updateMutation.mutate({ id, data: { planned_date: planned_date ?? undefined, planned_date_end: planned_date_end } })}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Done — collapsed by default */}
          {done.length > 0 && (
            <div>
              <CollapsibleSectionHeader
                label="Done"
                count={done.length}
                color="var(--accent-green)"
                expanded={showDone}
                onToggle={() => setShowDone(v => !v)}
              />
              {showDone && (
                <div className="animate-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  {done.map(todo => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={(id, status) => updateMutation.mutate({ id, data: { status } })}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onDateChange={(id, planned_date, planned_date_end) => updateMutation.mutate({ id, data: { planned_date: planned_date ?? undefined, planned_date_end: planned_date_end } })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!weekQuery.isLoading && todos.length === 0 && (
            <GlassCard style={{ padding: '40px 24px', textAlign: 'center' }}>
              <CheckSquare size={28} style={{ margin: '0 auto 12px', color: 'var(--accent-green)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>All clear. Add a task to get started.</p>
            </GlassCard>
          )}

          {/* Workload summary */}
          <GlassCard style={{ overflow: 'hidden' }}>
            <button
              onClick={() => { setShowWorkload(v => !v); if (!showWorkload) workloadQuery.refetch() }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={14} style={{ color: 'var(--accent-cyan)' }} />
                AI Workload Summary
              </span>
              {showWorkload ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showWorkload && (
              <div style={{ padding: '0 18px 18px', borderTop: '1px solid var(--border)' }} className="animate-slide-up">
                {workloadQuery.isLoading && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <Spinner size={14} /> Generating summary...
                  </div>
                )}
                {workloadQuery.data && (
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: 13,
                    lineHeight: 1.7,
                    paddingTop: 14,
                    fontStyle: 'italic',
                  }}>
                    {workloadQuery.data.summary}
                  </p>
                )}
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  )
}

function SectionHeader({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2 }} />
      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
    </div>
  )
}

function CollapsibleSectionHeader({ label, count, color, expanded, onToggle }: {
  label: string; count: number; color: string; expanded: boolean; onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <div style={{ width: 3, height: 18, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, color: 'var(--text-muted)', marginLeft: 2 }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
      <span style={{ color: 'var(--text-muted)', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </span>
    </button>
  )
}
