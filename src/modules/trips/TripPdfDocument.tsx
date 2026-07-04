import {
  Document, Page, View, Text, Image, Font, StyleSheet,
} from '@react-pdf/renderer'
import type { Trip } from '../../types/trips'

// Full Latin+CJK font so Chinese names (name_zh) and any Chinese text the
// user types render correctly — the standard Helvetica fonts have no CJK glyphs.
Font.register({
  family: 'NotoSansCJKsc',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Regular.otf', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/gh/notofonts/noto-cjk@main/Sans/OTF/SimplifiedChinese/NotoSansCJKsc-Bold.otf', fontWeight: 'bold' },
  ],
})

const S = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansCJKsc',
    backgroundColor: '#ffffff',
    paddingTop: 48, paddingBottom: 56, paddingLeft: 44, paddingRight: 44,
    fontSize: 10, color: '#1a1a2e',
  },

  // ── Cover ──────────────────────────────────────────────────────────
  coverEmoji: { fontSize: 32, marginBottom: 8 },
  coverTitle: { fontSize: 20, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold', marginBottom: 5, lineHeight: 1.2 },
  coverDest:  { fontSize: 12, color: '#444', marginBottom: 3 },
  coverMeta:  { fontSize: 10, color: '#666', marginBottom: 6 },
  coverStatus: { fontSize: 8, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, color: '#06b6d4', marginBottom: 20 },

  // ── Section header ─────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 12, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold',
    borderLeftWidth: 3, borderLeftColor: '#06b6d4',
    paddingLeft: 7, paddingTop: 1, paddingBottom: 1,
    marginTop: 18, marginBottom: 8, color: '#06b6d4',
  },

  // ── Brief ──────────────────────────────────────────────────────────
  briefText: { fontSize: 10, lineHeight: 1.65, color: '#333', marginBottom: 6 },

  // ── Accommodation ──────────────────────────────────────────────────
  accRow: {
    borderBottomWidth: 0.5, borderBottomColor: '#e0e0e0',
    paddingTop: 6, paddingBottom: 6,
    marginBottom: 0,
  },
  accName:  { fontSize: 10, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold', color: '#111', marginBottom: 2 },
  accDates: { fontSize: 9, color: '#555', marginBottom: 1 },
  accMeta:  { fontSize: 9, color: '#777' },

  // ── Itinerary ──────────────────────────────────────────────────────
  dayHeader: {
    fontSize: 10, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold',
    backgroundColor: '#f4f4f4',
    paddingTop: 5, paddingBottom: 5, paddingLeft: 8, paddingRight: 8,
    marginTop: 10, marginBottom: 2, color: '#222',
  },
  actRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderBottomWidth: 0.5, borderBottomColor: '#eeeeee',
    paddingTop: 4, paddingBottom: 4,
  },
  actImageCol: { width: 44, marginRight: 8, flexShrink: 0, alignItems: 'center' },
  actImage: { width: 44, height: 44, borderRadius: 4, objectFit: 'cover' },
  actImageCaption: { fontSize: 5.5, color: '#bbb', marginTop: 2, textAlign: 'center' },
  actTime: { width: 34, fontSize: 8, color: '#999', paddingTop: 1, flexShrink: 0 },
  actType: { width: 72, fontSize: 8, color: '#666', textTransform: 'capitalize', paddingTop: 1, flexShrink: 0 },
  actBody: { flex: 1 },
  actTitle: { fontSize: 9, color: '#111', lineHeight: 1.4 },
  actNameZh: { fontSize: 8, color: '#999', marginTop: 1, lineHeight: 1.4 },
  actNotes: { fontSize: 8, color: '#777', marginTop: 2, lineHeight: 1.4 },
  actLocation: { fontSize: 8, color: '#888', marginTop: 1 },

  // ── Packing ────────────────────────────────────────────────────────
  catHeader:  { fontSize: 9, fontFamily: 'NotoSansCJKsc', fontWeight: 'bold', color: '#444', marginTop: 8, marginBottom: 3 },
  packRow:    { flexDirection: 'row', flexWrap: 'wrap' },
  packItem:   { width: '48%', flexDirection: 'row', alignItems: 'center', paddingTop: 2, paddingBottom: 2, marginRight: '2%' },
  checkbox:   { width: 7, height: 7, borderWidth: 0.75, borderColor: '#aaa', marginRight: 5, flexShrink: 0 },
  packLabel:  { fontSize: 8, color: '#333', flex: 1, lineHeight: 1.3 },

  // ── Footer ─────────────────────────────────────────────────────────
  footer: {
    position: 'absolute', bottom: 20, left: 44, right: 44,
    flexDirection: 'row', justifyContent: 'space-between',
    borderTopWidth: 0.5, borderTopColor: '#e0e0e0',
    paddingTop: 4,
  },
  footerText: { fontSize: 7.5, color: '#bbb' },
})

function parseDateStr(s: string) { return new Date(s.split('T')[0] + 'T00:00:00') }

function fmtDate(s: string, opts?: Intl.DateTimeFormatOptions) {
  return parseDateStr(s).toLocaleDateString('en-GB', opts ?? { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function duration(start: string, end: string) {
  const d = Math.round((parseDateStr(end).getTime() - parseDateStr(start).getTime()) / 86400000) + 1
  return d > 1 ? `${d}D / ${d - 1}N` : `${d}D`
}

export function TripPdfDocument({ trip }: { trip: Trip }) {
  const days = trip.days ?? []
  const generatedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const brief: any         = (trip as any).__brief ?? null
  const packing: any[]     = (trip as any).__packing ?? []
  const accommodations: any[] = (trip as any).__accommodations ?? []

  return (
    <Document title={trip.name} author="Smiley Web">
      <Page size="A4" style={S.page}>

        {/* ── Cover ── */}
        <Text style={S.coverTitle}>{trip.name}</Text>
        <Text style={S.coverDest}>
          {trip.destination_city}{trip.destination_country ? `, ${trip.destination_country}` : ''}
        </Text>
        <Text style={S.coverMeta}>
          {fmtDate(trip.start_date)} to {fmtDate(trip.end_date)}  |  {duration(trip.start_date, trip.end_date)}
        </Text>
        <Text style={S.coverStatus}>{trip.status}</Text>

        {/* ── AI Brief ── */}
        {brief && (
          <>
            <Text style={S.sectionHeader}>Travel Brief</Text>
            {brief.weather_summary
              ? <Text style={S.briefText}>{brief.weather_summary}</Text>
              : null}
            {brief.budget_notes
              ? <Text style={S.briefText}>{brief.budget_notes}</Text>
              : null}
          </>
        )}

        {/* ── Accommodations ── */}
        {accommodations.length > 0 && (
          <>
            <Text style={S.sectionHeader}>Accommodations</Text>
            {accommodations.map((acc: any) => {
              const nights = Math.round(
                (new Date(acc.check_out).getTime() - new Date(acc.check_in).getTime()) / 86400000
              )
              return (
                <View key={acc.id} style={S.accRow} wrap={false}>
                  <Text style={S.accName}>
                    {acc.hotel_name}
                    {acc.status === 'suggested' ? '  (suggested - not yet booked)' : ''}
                  </Text>
                  <Text style={S.accDates}>
                    {fmtDate(acc.check_in)} to {fmtDate(acc.check_out)}  ({nights} night{nights !== 1 ? 's' : ''})
                  </Text>
                  {acc.location
                    ? <Text style={S.accMeta}>Location: {acc.location}</Text>
                    : null}
                  {acc.confirmation_ref
                    ? <Text style={S.accMeta}>Ref: {acc.confirmation_ref}</Text>
                    : null}
                  {acc.notes
                    ? <Text style={S.accMeta}>{acc.notes}</Text>
                    : null}
                </View>
              )
            })}
          </>
        )}

        {/* ── Itinerary ── */}
        {days.length > 0 && (
          <>
            <Text style={S.sectionHeader}>Itinerary</Text>
            {days.map(day => {
              const sorted = [...(day.activities ?? [])].sort((a, b) => {
                if (!a.start_time && !b.start_time) return 0
                if (!a.start_time) return 1
                if (!b.start_time) return -1
                return a.start_time.localeCompare(b.start_time)
              })
              const dayLabel = fmtDate(day.day_date, { weekday: 'short', day: 'numeric', month: 'short' })
              return (
                <View key={day.id} wrap={false}>
                  <Text style={S.dayHeader}>
                    {'Day '}{day.day_number}{'  -  '}{dayLabel}{day.title ? `  |  ${day.title}` : ''}
                  </Text>
                  {sorted.length === 0 && (
                    <Text style={{ fontSize: 8, color: '#bbb', paddingLeft: 8, paddingTop: 4 }}>
                      No activities planned
                    </Text>
                  )}
                  {sorted.map(act => (
                    <View key={act.id} style={S.actRow}>
                      <View style={S.actImageCol}>
                        {act.image_url ? (
                          <>
                            <Image style={S.actImage} src={act.image_url} />
                            {act.image_attribution
                              ? <Text style={S.actImageCaption}>{act.image_attribution}</Text>
                              : null}
                          </>
                        ) : null}
                      </View>
                      <Text style={S.actTime}>
                        {act.start_time ? act.start_time.slice(0, 5) : ''}
                      </Text>
                      <Text style={S.actType}>{act.activity_type}</Text>
                      <View style={S.actBody}>
                        <Text style={S.actTitle}>{act.title}</Text>
                        {act.name_zh
                          ? <Text style={S.actNameZh}>{act.name_zh}</Text>
                          : null}
                        {act.location
                          ? <Text style={S.actLocation}>{act.location}</Text>
                          : null}
                        {act.notes
                          ? <Text style={S.actNotes}>{act.notes}</Text>
                          : null}
                      </View>
                    </View>
                  ))}
                </View>
              )
            })}
          </>
        )}

        {/* ── Packing List ── */}
        {packing.length > 0 && (
          <>
            <Text style={S.sectionHeader}>Packing List</Text>
            {(() => {
              const bycat: Record<string, any[]> = {}
              for (const item of packing) {
                if (!bycat[item.category]) bycat[item.category] = []
                bycat[item.category].push(item)
              }
              return Object.entries(bycat).map(([cat, catItems]) => (
                <View key={cat}>
                  <Text style={S.catHeader}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</Text>
                  <View style={S.packRow}>
                    {catItems.map((item: any) => (
                      <View key={item.id} style={S.packItem}>
                        <View style={{
                          ...S.checkbox,
                          backgroundColor: item.packed ? '#10b981' : 'transparent',
                        }} />
                        <Text style={S.packLabel}>{item.item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            })()}
          </>
        )}

        {/* ── Footer ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>Generated by Smiley Web · {generatedDate}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>

      </Page>
    </Document>
  )
}
