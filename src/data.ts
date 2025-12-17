export type CategoryType = 'Living/Health' | 'Hobby/Fun' | 'Fashion/Shop'

export interface Firm {
  id: string
  name: string
  category: CategoryType
  /** 대표 타겟 연령 (단일 값) */
  targetAge: number
  /** 타겟 연령대 (center ± 5 정도의 단순 범위) */
  targetAgeRange: [number, number]
  /** 전체 캠페인 예산(상대값) */
  budget: number
  /** 입찰 단가 (예: CPM 또는 CPC 개념의 상대 값) */
  bid: number
}

export interface Website {
  id: string
  name: string
  category: CategoryType
  /** 주요 방문자 평균 연령 */
  audienceAge: number
  /** 방문자 연령대 (center ± 5 정도의 단순 범위) */
  audienceAgeRange: [number, number]
  /** 0~1 사이의 권위도 점수 */
  authority: number
}

const makeRange = (age: number, spread = 5): [number, number] => [age - spread, age + spread]

export const firms: Firm[] = [
  {
    id: '1',
    name: '아모레퍼시픽',
    category: 'Fashion/Shop',
    targetAge: 25,
    targetAgeRange: makeRange(25),
    budget: 100_000,
    bid: 150,
  },
  {
    id: '2',
    name: '젠틀몬스터',
    category: 'Living/Health',
    targetAge: 45,
    targetAgeRange: makeRange(45),
    budget: 800,
    bid: 20,
  },
  {
    id: '3',
    name: '적십자제약',
    category: 'Living/Health',
    targetAge: 55,
    targetAgeRange: makeRange(55),
    budget: 2_000,
    bid: 35,
  },
  {
    id: '4',
    name: '하츄핑',
    category: 'Hobby/Fun',
    targetAge: 32, // 부모 타겟
    targetAgeRange: makeRange(32),
    budget: 1_000,
    bid: 25,
  },
  {
    id: '5',
    name: '소니',
    category: 'Hobby/Fun',
    targetAge: 30,
    targetAgeRange: makeRange(30),
    budget: 1_200,
    bid: 30,
  },
  {
    id: '6',
    name: '종근당비타민',
    category: 'Living/Health',
    targetAge: 38,
    targetAgeRange: makeRange(38),
    budget: 900,
    bid: 22,
  },
  {
    id: '7',
    name: '넥슨',
    category: 'Hobby/Fun',
    targetAge: 18,
    targetAgeRange: makeRange(18),
    budget: 3_000,
    bid: 40,
  },
  {
    id: '8',
    name: '무신사',
    category: 'Fashion/Shop',
    targetAge: 20,
    targetAgeRange: makeRange(20),
    budget: 1_500,
    bid: 18,
  },
]

export const websites: Website[] = [
  {
    id: '1',
    name: '나무위키',
    category: 'Hobby/Fun',
    audienceAge: 22,
    audienceAgeRange: makeRange(22),
    authority: 0.9,
  },
  {
    id: '2',
    name: '밴드',
    category: 'Living/Health',
    audienceAge: 48,
    audienceAgeRange: makeRange(48),
    authority: 0.7,
  },
  {
    id: '3',
    name: '네이버웹툰',
    category: 'Hobby/Fun',
    audienceAge: 16,
    audienceAgeRange: makeRange(16),
    authority: 0.8,
  },
  {
    id: '4',
    name: '연합뉴스',
    category: 'Living/Health',
    audienceAge: 52,
    audienceAgeRange: makeRange(52),
    authority: 0.8,
  },
  {
    id: '5',
    name: '디시인사이드',
    category: 'Hobby/Fun',
    audienceAge: 26,
    audienceAgeRange: makeRange(26),
    authority: 0.6,
  },
  {
    id: '6',
    name: '와플래시',
    category: 'Hobby/Fun',
    audienceAge: 12,
    audienceAgeRange: makeRange(12),
    authority: 0.3,
  },
  {
    id: '7',
    name: '쿠팡',
    category: 'Fashion/Shop',
    audienceAge: 34,
    audienceAgeRange: makeRange(34),
    authority: 0.9,
  },
  {
    id: '8',
    name: '위버스',
    category: 'Fashion/Shop',
    audienceAge: 16,
    audienceAgeRange: makeRange(16),
    authority: 0.5,
  },
]

const normalizeAge = (age: number): number => {
  const clamped = Math.min(65, Math.max(10, age))
  return (clamped - 10) / (65 - 10)
}

const categoryVector = (category: CategoryType): [number, number, number] => {
  switch (category) {
    case 'Living/Health':
      return [1, 0, 0]
    case 'Hobby/Fun':
      return [0, 1, 0]
    case 'Fashion/Shop':
      return [0, 0, 1]
  }
}

const dot = (a: number[], b: number[]): number => a.reduce((sum, v, i) => sum + v * b[i], 0)

const magnitude = (v: number[]): number => Math.sqrt(dot(v, v))

const buildFirmVector = (firm: Firm): number[] => {
  const age = normalizeAge(firm.targetAge)
  const [c1, c2, c3] = categoryVector(firm.category)
  const budgetNorm = Math.min(1, firm.budget / 100_000)
  return [age * 0.9, c1, c2, c3, budgetNorm * 0.4]
}

const buildWebsiteVector = (site: Website): number[] => {
  const age = normalizeAge(site.audienceAge)
  const [c1, c2, c3] = categoryVector(site.category)
  const authority = site.authority
  return [age * 0.9, c1, c2, c3, authority * 0.6]
}

const baseAffinity01 = (firm: Firm, site: Website): number => {
  const fVec = buildFirmVector(firm)
  const sVec = buildWebsiteVector(site)
  const denom = magnitude(fVec) * magnitude(sVec)
  const cosine = denom === 0 ? 0 : dot(fVec, sVec) / denom

  const ageDiff = Math.abs(firm.targetAge - site.audienceAge)
  const ageSim = Math.max(0, 1 - ageDiff / 40)

  const blend = 0.7 * cosine + 0.2 * ageSim + 0.1 * site.authority
  return Math.max(0, Math.min(1, blend))
}

const contextMultiplier = (firm: Firm, site: Website): number => {
  let mult = 1

  const isWhale = firm.id === '1'

  if (isWhale) {
    if (site.category === 'Fashion/Shop') {
      mult *= 1.1
    } else {
      // 화장품 대형 광고주는 비패션/쇼핑 매체와의 맥락 적합도가 낮다
      mult *= 0.25
    }
  }

  // 건강/의학 광고가 플래시 게임(6번 사이트)이나 아주 어린 연령대 매체에 노출될 때 큰 페널티
  const isYoungAudience = site.audienceAge <= 14
  if (firm.category === 'Living/Health' && (site.id === '6' || isYoungAudience)) {
    mult *= 0.3
  }

  // 패션/쇼핑 광고가 순수 헬스/뉴스 사이트에 들어갈 때 약한 페널티
  if (firm.category === 'Fashion/Shop' && site.category === 'Living/Health') {
    mult *= 0.7
  }

  return mult
}

/**
 * 딥러닝 추천 모델을 흉내 내는 "AI Affinity Score" (0~100).
 * - 벡터 유사도(코사인) + 연령/카테고리/권위도 조합
 * - 맥락적으로 어색한 조합(예: 헬스 광고 x 플래시 게임)에 강한 페널티
 * - Whale(Global Cosmetics)는 비패션 사이트에 대해 의도적으로 낮은 점수를 갖도록 조정
 */
export const calculateAffinity = (firm: Firm, website: Website): number => {
  const base = baseAffinity01(firm, website)
  const mult = contextMultiplier(firm, website)
  const score01 = Math.max(0, Math.min(1, base * mult))
  return score01 * 100
}

