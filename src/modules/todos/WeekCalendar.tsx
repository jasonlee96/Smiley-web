import { useState, useRef } from 'react'
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
  useDroppable, useDraggable, closestCenter,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths,
  eachDayOfInterval, format, isToday, isSameDay,
  isSameMonth, parseISO, getDay, differenceInDays,
  isBefore, isAfter, addDays,
} from 'date-fns'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import Spinner from '../../components/Spinner'
import type { Todo } from '../../types/todos'

type CalView = 'month' | 'week'

const WS_COLOR = (ws: string) => ws === 'work' ? '#f59e0b' : '#a78bfa'

/* ── helpers ──────────────────────────────────────────────────── */

function todoStart(t: Todo): Date | null {
  return t.planned_date ? parseISO(t.planned_date.slice(0, 10)) : null
}

function todoEnd(t: Todo): Date | null {
  if (t.planned_date_end) return parseISO(t.planned_date_end.slice(0, 10))
  if (t.planned_date) return parseISO(t.planned_date.slice(0, 10))
  return null
}

function isMultiDay(t: Todo): boolean {
  const s = todoStart(t), e = todoEnd(t)
  return !!(s && e && !isSameDay(s, e))
}

function overlapsDay(t: Todo, day: Date): boolean {
  const s = todoStart(t), e = todoEnd(t)
  if (!s) return false
  const d = e ?? s
  return !isAfter(s, day) && !isBefore(d, day)
}

/* ── Span bar (multi-day event across a week row) ─────────────── */
function SpanBar({
  todo, colStart, colEnd, totalCols,
  continueLeft, continueRight, isDragging, onToggle,
}: {
  todo: Todo; colStart: number; colEnd: number; totalCols: number
  continueLeft: boolean; continueRight: boolean
  isDragging?: boolean; onToggle?: (id: number) => void
}) {
  const c = WS_COLOR(todo.workspace)
  const isDone = todo.status === 'done'
  const spanCols = colEnd - colStart + 1

  return (
    <div title={todo.title} style={{
      gridColumn: `${colStart + 1} / span ${spanCols}`,
      height: 22,
      background: `${c}22`,
      border: `1px solid ${c}55`,
      borderRadius: continueLeft && continueRight ? 0
        : continueLeft ? '0 11px 11px 0'
        : continueRight ? '11px 0 0 11px'
        : 11,
      borderLeft: continueLeft ? `1px solid ${c}33` : `3px solid ${c}`,
      borderRight: continueRight ? `1px solid ${c}33` : `1px solid ${c}55`,
      display: 'flex', alignItems: 'center', paddingLeft: continueLeft ? 6 : 8,
      paddingRight: 6,
      gap: 5,
      cursor: 'grab',
      opacity: isDragging ? 0.4 : isDone ? 0.5 : 1,
      overflow: 'hidden',
      userSelect: 'none',
      transition: 'opacity 0.15s',
      margin: '1px 2px',
    }}>
      {onToggle && !continueLeft && (
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggle(todo.id) }}
          style={{
            width: 12, height: 12, flexShrink: 0,
            border: `1.5px solid ${isDone ? '#10b981' : 'rgba(255,255,255,0.3)'}`,
            borderRadius: 3, background: isDone ? 'rgba(16,185,129,0.2)' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#10b981', fontSize: 8,
          }}
        >
          {isDone && '✓'}
        </button>
      )}
      {!continueLeft && (
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {todo.title}
        </span>
      )}
      {continueLeft && (
        <span style={{ fontSize: 10, color: `${c}cc`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {todo.title}
        </span>
      )}
      {continueRight && (
        <span style={{ fontSize: 10, color: `${c}99`, flexShrink: 0 }}>›</span>
      )}
    </div>
  )
}

/* ── Draggable span bar wrapper ───────────────────────────────── */
function DraggableSpanBar(props: Parameters<typeof SpanBar>[0]) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: props.todo.id,
    data: { todo: props.todo },
  })
  return (
    <div ref={setNodeRef} style={{ display: 'contents' }} {...attributes} {...listeners}>
      <SpanBar {...props} isDragging={isDragging} />
    </div>
  )
}

/* ── Single-day pill ──────────────────────────────────────────── */
function DraggablePill({ todo, onToggle }: { todo: Todo; onToggle?: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: todo.id, data: { todo },
  })
  const c = WS_COLOR(todo.workspace)
  const isDone = todo.status === 'done'
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      {...attributes} {...listeners}
    >
      <div title={todo.title} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: `${c}18`, border: `1px solid ${c}33`, borderLeft: `3px solid ${c}`,
        borderRadius: 5, padding: '3px 7px', marginBottom: 3,
        cursor: 'grab', userSelect: 'none',
        opacity: isDone ? 0.55 : 1,
      }}>
        {onToggle && (
          <button
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onToggle(todo.id) }}
            style={{
              width: 12, height: 12, flexShrink: 0,
              border: `1.5px solid ${isDone ? '#10b981' : 'rgba(255,255,255,0.25)'}`,
              borderRadius: 3, background: isDone ? 'rgba(16,185,129,0.2)' : 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10b981', fontSize: 8,
            }}
          >
            {isDone && '✓'}
          </button>
        )}
        <span style={{
          fontSize: 11, fontWeight: 500,
          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isDone ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
          lineHeight: 1.3,
        }}>
          {todo.title}
        </span>
      </div>
    </div>
  )
}

/* ── Week row with spanning support ──────────────────────────── */
function WeekRow({
  days, todos, overId, isCurrentMonth, view, onToggle, onAddClick, expandedDays, onToggleExpand,
}: {
  days: Date[]
  todos: Todo[]
  overId: string | null
  isCurrentMonth: boolean
  view: CalView
  onToggle?: (id: number) => void
  onAddClick?: (date: Date) => void
  expandedDays?: Set<string>
  onToggleExpand?: (dateStr: string) => void
}) {
  // Split: multi-day vs single-day
  const multiDayTodos = todos.filter(t => isMultiDay(t) && todoStart(t) && days.some(d => overlapsDay(t, d)))
  const singleDayTodos = days.map(day => ({
    day,
    todos: todos.filter(t => !isMultiDay(t) && overlapsDay(t, day)),
  }))

  // Build span info for each multi-day todo in this week
  const spanRows: Array<{ todo: Todo; colStart: number; colEnd: number; continueLeft: boolean; continueRight: boolean }[]> = []

  for (const todo of multiDayTodos) {
    const s = todoStart(todo)!
    const e = todoEnd(todo)!
    const weekStart = days[0]
    const weekEnd = days[days.length - 1]
    const continueLeft = isBefore(s, weekStart)
    const continueRight = isAfter(e, weekEnd)
    const colStart = continueLeft ? 0 : differenceInDays(s, weekStart)
    const colEnd = continueRight ? days.length - 1 : differenceInDays(e, weekStart)

    // Place in first available row slot
    let placed = false
    for (const row of spanRows) {
      const overlapsRow = row.some(item => !(item.colEnd < colStart || item.colStart > colEnd))
      if (!overlapsRow) {
        row.push({ todo, colStart, colEnd, continueLeft, continueRight })
        placed = true
        break
      }
    }
    if (!placed) spanRows.push([{ todo, colStart, colEnd, continueLeft, continueRight }])
  }

  const MAX_SINGLE = view === 'month' ? 2 : 10

  return (
    <div style={{
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      background: 'rgba(255,255,255,0.015)',
    }}>
      {/* Multi-day event rows */}
      {spanRows.length > 0 && (
        <div style={{ padding: '4px 0 0' }}>
          {spanRows.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                minHeight: 26,
              }}
            >
              {row.map(item => (
                <DraggableSpanBar
                  key={item.todo.id}
                  todo={item.todo}
                  colStart={item.colStart}
                  colEnd={item.colEnd}
                  totalCols={days.length}
                  continueLeft={item.continueLeft}
                  continueRight={item.continueRight}
                  onToggle={onToggle}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {singleDayTodos.map(({ day, todos: dayTodos }, di) => {
          const dropId = format(day, 'yyyy-MM-dd')
          const isOver = overId === dropId
          const today = isToday(day)
          const isWeekend = getDay(day) === 0 || getDay(day) === 6
          const inMonth = view === 'week' || isSameMonth(day, days[3])
          const overflow = dayTodos.length - MAX_SINGLE

          const isExpanded = expandedDays?.has(dropId) ?? false
          const visibleTodos = isExpanded ? dayTodos : dayTodos.slice(0, MAX_SINGLE)

          return (
            <DroppableCell key={day.toISOString()} id={dropId}>
              <div style={{
                minHeight: view === 'month' ? 90 : 120,
                padding: '6px 5px 5px',
                borderRight: di < days.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                borderTop: `2px solid ${today ? 'var(--accent-cyan)' : 'transparent'}`,
                background: isOver ? 'rgba(6,182,212,0.05)' : 'transparent',
                opacity: inMonth ? 1 : 0.3,
                transition: 'background 0.15s',
                position: 'relative',
                minWidth: 0,
                overflow: 'hidden',
              }}
              className="cal-day-cell"
              >
                {/* Date number */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%',
                    background: today ? 'var(--accent-cyan)' : 'transparent',
                    color: today ? '#080b12' : isWeekend ? '#a78bfa' : 'var(--text-secondary)',
                    fontSize: 11, fontFamily: 'IBM Plex Mono', fontWeight: today ? 700 : 400,
                    flexShrink: 0,
                  }}>
                    {format(day, 'd')}
                  </span>
                  {onAddClick && (
                    <button
                      className="cell-add-btn"
                      onPointerDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); onAddClick(day) }}
                      style={{
                        opacity: 0, width: 18, height: 18, borderRadius: 4,
                        border: '1px solid var(--border)', background: 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-muted)', transition: 'opacity 0.15s',
                      }}
                    >
                      <Plus size={10} />
                    </button>
                  )}
                </div>

                {/* Single-day pills */}
                {visibleTodos.map(t => (
                  <DraggablePill key={t.id} todo={t} onToggle={onToggle} />
                ))}
                {overflow > 0 && (
                  <button
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onToggleExpand?.(dropId) }}
                    style={{
                      fontSize: 10, color: 'var(--accent-cyan)', fontFamily: 'IBM Plex Mono',
                      padding: '1px 3px', background: 'transparent', border: 'none',
                      cursor: 'pointer', textDecoration: 'underline dotted',
                    }}
                  >
                    {isExpanded ? '− less' : `+${overflow} more`}
                  </button>
                )}
                {isOver && dayTodos.length === 0 && multiDayTodos.filter(t => !days.some(d => isSameDay(d, day) && !overlapsDay(t, d))).length === 0 && (
                  <div style={{ height: 20, borderRadius: 4, border: '1.5px dashed var(--accent-cyan)', opacity: 0.35, marginTop: 4 }} />
                )}
              </div>
            </DroppableCell>
          )
        })}
      </div>
    </div>
  )
}

function DroppableCell({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id })
  return <div ref={setNodeRef} style={{ minWidth: 0 }}>{children}</div>
}

/* ── Unscheduled sidebar ──────────────────────────────────────── */
function UnscheduledSidebar({ todos, isOver, onToggle }: {
  todos: Todo[]; isOver: boolean; onToggle?: (id: number) => void
}) {
  const { setNodeRef } = useDroppable({ id: 'unscheduled' })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ padding: '4px 8px' }}>
        <div style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>Unscheduled</div>
        <div style={{ fontSize: 18, fontFamily: 'Syne', fontWeight: 700, color: 'var(--text-muted)' }}>{todos.length}</div>
      </div>
      <div ref={setNodeRef} style={{
        flex: 1, minHeight: 120, padding: '6px',
        borderRadius: 8, overflowY: 'auto', maxHeight: 500,
        background: isOver ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.015)',
        border: `1px dashed ${isOver ? 'rgba(167,139,250,0.5)' : 'rgba(255,255,255,0.05)'}`,
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        {todos.map(todo => <DraggablePill key={todo.id} todo={todo} onToggle={onToggle} />)}
        {isOver && todos.length === 0 && (
          <div style={{ height: 28, borderRadius: 5, border: '1.5px dashed #a78bfa', opacity: 0.4 }} />
        )}
      </div>
    </div>
  )
}

/* ── Overlay pill ─────────────────────────────────────────────── */
function OverlayPill({ todo }: { todo: Todo }) {
  const c = WS_COLOR(todo.workspace)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'var(--bg-elevated)', border: `1px solid ${c}66`, borderLeft: `3px solid ${c}`,
      borderRadius: 6, padding: '5px 10px', width: 200,
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'grabbing',
    }}>
      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {todo.title}
      </span>
    </div>
  )
}

/* ── Main export ──────────────────────────────────────────────── */
export default function WeekCalendar({
  todos, loading, onSchedule, onToggle, onAddWithDate,
}: {
  todos: Todo[]
  loading: boolean
  onSchedule: (id: number, date: string | null, endDate?: string | null) => void
  onToggle?: (id: number, status: 'not_started' | 'in_progress' | 'done') => void
  onAddWithDate?: (date: string) => void
}) {
  const [view, setView] = useState<CalView>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [activeId, setActiveId] = useState<number | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const toggleDayExpand = (dateStr: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev)
      if (next.has(dateStr)) next.delete(dateStr)
      else next.add(dateStr)
      return next
    })
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  let days: Date[]
  let headerLabel: string

  if (view === 'month') {
    const mStart = startOfMonth(anchor)
    const mEnd = endOfMonth(anchor)
    const calStart = startOfWeek(mStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(mEnd, { weekStartsOn: 1 })
    days = eachDayOfInterval({ start: calStart, end: calEnd })
    headerLabel = format(anchor, 'MMMM yyyy')
  } else {
    const ws = startOfWeek(anchor, { weekStartsOn: 1 })
    const we = endOfWeek(anchor, { weekStartsOn: 1 })
    days = eachDayOfInterval({ start: ws, end: we })
    headerLabel = `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
  }

  const weeks = view === 'month'
    ? Array.from({ length: days.length / 7 }, (_, i) => days.slice(i * 7, i * 7 + 7))
    : [days]

  const activeTodo = activeId ? todos.find(t => t.id === activeId) : null
  const unscheduled = todos.filter(t => !t.planned_date)

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    setActiveId(null); setOverId(null)
    if (!over) return
    const todoId = Number(active.id)
    const target = String(over.id)
    if (target === 'unscheduled') {
      onSchedule(todoId, null, null)
      return
    }
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return
    const newStart = target // "yyyy-MM-dd"
    // Preserve duration if multi-day
    if (todo.planned_date && todo.planned_date_end) {
      const duration = differenceInDays(parseISO(todo.planned_date_end), parseISO(todo.planned_date))
      const newEnd = format(addDays(parseISO(newStart), duration), 'yyyy-MM-dd')
      onSchedule(todoId, newStart, newEnd)
    } else {
      onSchedule(todoId, newStart, null)
    }
  }

  const goBack = () => view === 'month' ? setAnchor(d => subMonths(d, 1)) : setAnchor(d => subWeeks(d, 1))
  const goForward = () => view === 'month' ? setAnchor(d => addMonths(d, 1)) : setAnchor(d => addWeeks(d, 1))

  const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="animate-fade-in">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={goBack}><ChevronLeft size={14} /></button>
          <button className="btn-ghost" style={{ padding: '6px 8px' }} onClick={goForward}><ChevronRight size={14} /></button>
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', color: 'var(--text-primary)', minWidth: 180 }}>
            {headerLabel}
          </span>
          {loading && <Spinner size={14} />}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setAnchor(new Date())}>Today</button>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
            {(['month', 'week'] as CalView[]).map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, fontFamily: 'Inter', textTransform: 'capitalize',
                background: view === v ? 'var(--accent-cyan-dim)' : 'transparent',
                color: view === v ? 'var(--accent-cyan)' : 'var(--text-muted)',
                transition: 'all 0.15s',
              }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e: DragStartEvent) => setActiveId(Number(e.active.id))}
        onDragOver={(e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null)}
        onDragEnd={handleDragEnd}
      >
        <div style={{ display: 'grid', gridTemplateColumns: view === 'week' ? '110px 1fr' : '1fr', gap: 10 }}>
          {/* Unscheduled (week view only) */}
          {view === 'week' && (
            <UnscheduledSidebar todos={unscheduled} isOver={overId === 'unscheduled'} onToggle={onToggle ? (id) => onToggle(id, 'done') : undefined} />
          )}

          {/* Calendar */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, overflow: 'hidden' }}>
            {/* Day-of-week header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {DAYS_OF_WEEK.map((d, i) => (
                <div key={d} style={{
                  padding: '8px 0', textAlign: 'center',
                  fontSize: 10, fontFamily: 'IBM Plex Mono', textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: (i === 5 || i === 6) ? '#a78bfa' : 'var(--text-muted)',
                  borderRight: i < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Week rows */}
            {weeks.map((week, wi) => (
              <WeekRow
                key={wi}
                days={week}
                todos={todos}
                overId={overId}
                isCurrentMonth={true}
                view={view}
                onToggle={onToggle ? (id) => onToggle(id, 'done') : undefined}
                onAddClick={onAddWithDate ? (d) => onAddWithDate(format(d, 'yyyy-MM-dd')) : undefined}
                expandedDays={expandedDays}
                onToggleExpand={toggleDayExpand}
              />
            ))}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeTodo && <OverlayPill todo={activeTodo} />}
        </DragOverlay>
      </DndContext>

      {/* Legend */}
      <div style={{ marginTop: 10, display: 'flex', gap: 16, justifyContent: 'flex-end', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        <span>Drag to reschedule · preserves duration</span>
        <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} /> Work
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: '#a78bfa', marginLeft: 4 }} /> Personal
        </span>
      </div>
    </div>
  )
}
