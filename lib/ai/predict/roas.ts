export type RoasForecast = {
  forecastRoas: number
  trend: 'up' | 'down' | 'flat'
  confidenceScore: number
  dataPoints: number
}

type MetricRow = {
  date: string
  roas: number | null
  conversions: number
  spend: number
}

const TREND_THRESHOLD = 0.1

export function forecastRoas(series: MetricRow[]): RoasForecast {
  const valid = series
    .filter((r) => r.roas !== null && r.spend > 0)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (valid.length === 0) {
    return { forecastRoas: 0, trend: 'flat', confidenceScore: 0, dataPoints: 0 }
  }

  // Weighted moving average: weight = index + 1 (mais recente tem peso maior)
  const totalWeight = valid.reduce((sum, _, i) => sum + (i + 1), 0)
  const weightedSum = valid.reduce((sum, r, i) => sum + r.roas! * (i + 1), 0)
  const forecastRoas = Math.round((weightedSum / totalWeight) * 10000) / 10000

  // Trend: comparar primeira metade vs segunda metade
  const mid = Math.floor(valid.length / 2)
  const firstHalf = valid.slice(0, mid)
  const secondHalf = valid.slice(mid)

  const avgFirst =
    firstHalf.length > 0
      ? firstHalf.reduce((s, r) => s + r.roas!, 0) / firstHalf.length
      : forecastRoas
  const avgSecond =
    secondHalf.length > 0
      ? secondHalf.reduce((s, r) => s + r.roas!, 0) / secondHalf.length
      : forecastRoas

  let trend: RoasForecast['trend'] = 'flat'
  if (avgFirst > 0) {
    const delta = (avgSecond - avgFirst) / avgFirst
    if (delta > TREND_THRESHOLD) trend = 'up'
    else if (delta < -TREND_THRESHOLD) trend = 'down'
  }

  const confidenceScore = Math.min(1, valid.length / 7)

  return { forecastRoas, trend, confidenceScore, dataPoints: valid.length }
}
