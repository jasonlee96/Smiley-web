const REASON_LABELS: Record<string, string> = {
  ABOVE_TARGET_NET: 'Above your target rate',
  BELOW_TARGET_NET: 'Below your target rate',
  TOP_25_PERCENTILE_30D: 'Top 25% of last 30 days',
  ABOVE_MEDIAN_30D: 'Above 30-day median',
  BOTTOM_35_PERCENTILE_30D: 'Bottom third of last 30 days',
  ABOVE_MEDIAN_90D: 'Above 90-day median',
  POSITIVE_MOMENTUM: 'Rate trending up',
  NEGATIVE_MOMENTUM: 'Rate trending down',
  MIXED_SIGNALS_SPLIT: 'Mixed signals',
}

export function reasonLabel(code: string | undefined): string | null {
  if (!code) return null
  return REASON_LABELS[code] ?? null
}
