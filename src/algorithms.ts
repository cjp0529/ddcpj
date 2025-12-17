import type { Firm, Website } from './data'
import { calculateAffinity } from './data'

export interface Match {
  firm: Firm
  website: Website
  /** 입찰 단가 (시장 관점에서의 가격 신호) */
  bidPrice: number
  /** AI 기반 적합도 점수 (0~100) */
  affinity: number
  /** Firm → Site 관점의 선호 점수 (0~1, 주로 affinity 기반) */
  firmScore: number
  /** Site → Firm 관점의 선호 점수 (0~1, affinity + bid 조합) */
  siteScore: number
}

export interface AlgorithmResult {
  matches: Match[]
  /** 전체 생태계 만족도 (모든 매칭의 affinity 합산) */
  totalSatisfaction: number
}

const firmPreferenceScore = (firm: Firm, site: Website): number => {
  const affinity01 = calculateAffinity(firm, site) / 100
  return affinity01
}

const sitePreferenceScore = (firm: Firm, site: Website, maxBid: number): number => {
  const affinity01 = calculateAffinity(firm, site) / 100
  const bidScore = maxBid > 0 ? firm.bid / maxBid : 0
  const categoryBonus = firm.category === site.category ? 0.15 : 0
  return 0.6 * affinity01 + 0.3 * bidScore + 0.1 * categoryBonus
}

const computeMatchMetrics = (
  firm: Firm,
  site: Website,
  maxBid: number,
): { affinity: number; firmScore: number; siteScore: number } => {
  const affinity = calculateAffinity(firm, site)
  const affinity01 = affinity / 100
  const bidScore = maxBid > 0 ? firm.bid / maxBid : 0

  const firmScore = affinity01
  const siteScore = 0.6 * affinity01 + 0.4 * bidScore

  return { affinity, firmScore, siteScore }
}

export const runRTB = (firms: Firm[], websites: Website[]): AlgorithmResult => {
  const matches: Match[] = []
  const maxBid = firms.reduce((max, f) => (f.bid > max ? f.bid : max), 0)

  for (const site of websites) {
    let winner: Firm | null = null

    for (const firm of firms) {
      if (!winner) {
        winner = firm
        continue
      }
      if (firm.bid > winner.bid) {
        winner = firm
      } else if (firm.bid === winner.bid) {
        const currentScore = firmPreferenceScore(winner, site)
        const challengerScore = firmPreferenceScore(firm, site)
        if (challengerScore > currentScore) {
          winner = firm
        }
      }
    }

    if (winner) {
      const { affinity, firmScore, siteScore } = computeMatchMetrics(winner, site, maxBid)
      matches.push({
        firm: winner,
        website: site,
        bidPrice: winner.bid,
        affinity,
        firmScore,
        siteScore,
      })
    }
  }

  const totalSatisfaction = matches.reduce((sum, m) => sum + m.affinity, 0)
  return { matches, totalSatisfaction }
}

export const runGaleShapley = (firms: Firm[], websites: Website[]): AlgorithmResult => {
  const maxBid = firms.reduce((max, f) => (f.bid > max ? f.bid : max), 0)

  const firmPrefs = new Map<string, string[]>()
  const sitePrefScores = new Map<string, Map<string, number>>()

  for (const firm of firms) {
    const scores = websites
      .map((site) => ({
        siteId: site.id,
        score: firmPreferenceScore(firm, site),
      }))
      .sort((a, b) => b.score - a.score)
    firmPrefs.set(
      firm.id,
      scores.map((s) => s.siteId),
    )
  }

  for (const site of websites) {
    const scores = firms
      .map((firm) => ({
        firmId: firm.id,
        score: sitePreferenceScore(firm, site, maxBid),
      }))
      .sort((a, b) => b.score - a.score)
    sitePrefScores.set(
      site.id,
      new Map(scores.map((s) => [s.firmId, s.score])),
    )
  }

  const firmNextIndex = new Map<string, number>()
  const freeFirms = new Set<string>()
  const engagements = new Map<string, string>() // websiteId -> firmId

  for (const firm of firms) {
    firmNextIndex.set(firm.id, 0)
    freeFirms.add(firm.id)
  }

  const getNextFreeFirm = (): string | null => {
    for (const firmId of freeFirms) {
      const prefs = firmPrefs.get(firmId) ?? []
      const idx = firmNextIndex.get(firmId) ?? 0
      if (idx < prefs.length) return firmId
    }
    return null
  }

  while (true) {
    const firmId = getNextFreeFirm()
    if (!firmId) break

    const prefs = firmPrefs.get(firmId) ?? []
    const idx = firmNextIndex.get(firmId) ?? 0
    const websiteId = prefs[idx]
    firmNextIndex.set(firmId, idx + 1)

    const currentFiance = engagements.get(websiteId)
    if (!currentFiance) {
      engagements.set(websiteId, firmId)
      freeFirms.delete(firmId)
    } else {
      const siteScores = sitePrefScores.get(websiteId) ?? new Map()
      const currentScore = siteScores.get(currentFiance) ?? 0
      const challengerScore = siteScores.get(firmId) ?? 0

      if (challengerScore > currentScore) {
        engagements.set(websiteId, firmId)
        freeFirms.delete(firmId)
        freeFirms.add(currentFiance)
      }
    }
  }

  const firmMap = new Map(firms.map((f) => [f.id, f]))
  const siteMap = new Map(websites.map((s) => [s.id, s]))

  const matches: Match[] = []
  for (const [websiteId, firmId] of engagements.entries()) {
    const firm = firmMap.get(firmId)
    const site = siteMap.get(websiteId)
    if (!firm || !site) continue
    const { affinity, firmScore, siteScore } = computeMatchMetrics(firm, site, maxBid)
    matches.push({
      firm,
      website: site,
      bidPrice: firm.bid,
      affinity,
      firmScore,
      siteScore,
    })
  }

  matches.sort((a, b) => a.website.id.localeCompare(b.website.id))

  const totalSatisfaction = matches.reduce((sum, m) => sum + m.affinity, 0)
  return { matches, totalSatisfaction }
}

const computeGiniIndex = (values: number[]): number => {
  const filtered = values.filter((v) => v >= 0)
  const n = filtered.length
  if (n === 0) return 0
  const sorted = [...filtered].sort((a, b) => a - b)
  const sum = sorted.reduce((acc, v) => acc + v, 0)
  if (sum === 0) return 0

  let weightedSum = 0
  for (let i = 0; i < n; i += 1) {
    weightedSum += (i + 1) * sorted[i]
  }

  const gini = (2 * weightedSum) / (n * sum) - (n + 1) / n
  return gini
}

/**
 * 각 알고리즘 결과에 대해 "시장 공정성"을 나타내는 지니 계수(0~1)를 계산합니다.
 * 여기서는 각 광고주가 가져가는 매체 개수 분포를 기준으로 집중도를 측정합니다.
 */
export const computeMarketFairnessGini = (result: AlgorithmResult, firms: Firm[]): number => {
  const counts = firms.map(
    (firm) => result.matches.filter((m) => m.firm.id === firm.id).length,
  )
  return computeGiniIndex(counts)
}

