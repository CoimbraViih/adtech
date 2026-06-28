export type PacingForecast = {
  projectedMonthSpend: number
  dailyBudget: number
  avgDailyBurn: number
  pacingRatio: number
  daysRemaining: number
  status: 'on_track' | 'overpace' | 'underpace'
  suggestedDailyBudget: number | null
}

type MetricRow = { date: string; spend: number }
type CampaignBudget = { dailyBudget: number; endDate?: string }

const OVERPACE_THRESHOLD = 1.2
const UNDERPACE_THRESHOLD = 0.8

export function forecastPacing(
  series: MetricRow[],
  budget: CampaignBudget,
  today: string = new Date().toISOString().slice(0, 10),
): PacingForecast {
  const todayDate = new Date(today)
  const endOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0)
  const endDate = budget.endDate ? new Date(budget.endDate) : endOfMonth
  const daysRemaining = Math.max(
    1,
    Math.ceil((endDate.getTime() - todayDate.getTime()) / 86_400_000),
  )

  const avgDailyBurn =
    series.length > 0
      ? series.reduce((sum, r) => sum + r.spend, 0) / series.length
      : 0

  const projectedMonthSpend = avgDailyBurn * daysRemaining
  const pacingRatio = budget.dailyBudget > 0 ? avgDailyBurn / budget.dailyBudget : 0

  let status: PacingForecast['status'] = 'on_track'
  let suggestedDailyBudget: number | null = null

  if (series.length > 0) {
    if (pacingRatio > OVERPACE_THRESHOLD) {
      status = 'overpace'
      suggestedDailyBudget = Math.round(budget.dailyBudget * 0.9 * 100) / 100
    } else if (pacingRatio < UNDERPACE_THRESHOLD) {
      status = 'underpace'
      suggestedDailyBudget = Math.round(budget.dailyBudget * 1.1 * 100) / 100
    }
  }

  return {
    projectedMonthSpend: Math.round(projectedMonthSpend * 100) / 100,
    dailyBudget: budget.dailyBudget,
    avgDailyBurn: Math.round(avgDailyBurn * 100) / 100,
    pacingRatio: Math.round(pacingRatio * 10000) / 10000,
    daysRemaining,
    status,
    suggestedDailyBudget,
  }
}
