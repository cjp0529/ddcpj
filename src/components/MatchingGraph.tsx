import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Firm, Website } from '../data'
import type { Match } from '../algorithms'

export type GraphMode = 'RTB' | 'GS'

interface MatchingGraphProps {
  mode: GraphMode
  firms: Firm[]
  websites: Website[]
  matches: Match[]
}

interface PositionedNode {
  id: string
  x: number
  y: number
}

interface HoverInfo {
  match: Match
  x: number
  y: number
}

const GRAPH_WIDTH = 800
const GRAPH_HEIGHT = 360
const H_MARGIN = 80
const V_MARGIN = 40

const getShortName = (name: string): string => {
  if (name.length <= 20) return name
  return `${name.slice(0, 18)}…`
}

const buildPositions = (items: { id: string }[], x: number): Map<string, PositionedNode> => {
  const n = items.length
  if (n === 0) return new Map()
  const usableHeight = GRAPH_HEIGHT - V_MARGIN * 2
  const step = n === 1 ? 0 : usableHeight / (n - 1)

  const entries: [string, PositionedNode][] = items.map((item, index) => [
    item.id,
    {
      id: item.id,
      x,
      y: V_MARGIN + step * index,
    },
  ])

  return new Map(entries)
}

const findWhaleFirmId = (firms: Firm[]): string | null => {
  if (firms.length === 0) return null
  let maxId = firms[0].id
  let maxBudget = firms[0].budget
  for (const firm of firms) {
    if (firm.budget > maxBudget) {
      maxBudget = firm.budget
      maxId = firm.id
    }
  }
  return maxId
}

const formatAffinity = (affinity: number): string => affinity.toFixed(1)

const formatBid = (bid: number): string => bid.toFixed(2)

export function MatchingGraph({ mode, firms, websites, matches }: MatchingGraphProps) {
  const [hover, setHover] = useState<HoverInfo | null>(null)

  const sortedFirms = useMemo(
    () => [...firms].sort((a, b) => a.targetAge - b.targetAge),
    [firms],
  )
  const sortedSites = useMemo(
    () => [...websites].sort((a, b) => a.audienceAge - b.audienceAge),
    [websites],
  )

  const firmPositions = useMemo(
    () => buildPositions(sortedFirms, H_MARGIN),
    [sortedFirms],
  )
  const sitePositions = useMemo(
    () => buildPositions(sortedSites, GRAPH_WIDTH - H_MARGIN),
    [sortedSites],
  )

  const whaleFirmId = useMemo(() => findWhaleFirmId(firms), [firms])

  const isRTB = mode === 'RTB'
  const lineColorWhale = isRTB ? '#ef4444' : '#22c55e'
  const lineColorOther = isRTB ? '#f97316' : '#38bdf8'

  const handleLineEnter = (match: Match) => {
    const firmPos = firmPositions.get(match.firm.id)
    const sitePos = sitePositions.get(match.website.id)
    if (!firmPos || !sitePos) return
    setHover({
      match,
      x: (firmPos.x + sitePos.x) / 2,
      y: (firmPos.y + sitePos.y) / 2,
    })
  }

  const handleLineLeave = () => {
    setHover(null)
  }

  const tooltipStyle =
    hover &&
    ({
      left: `${(hover.x / GRAPH_WIDTH) * 100}%`,
      top: `${(hover.y / GRAPH_HEIGHT) * 100}%`,
    } as const)

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              isRTB ? 'bg-red-500 shadow-[0_0_8px_rgba(248,113,113,0.9)]' : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
            }`}
          />
          <span className="font-semibold">
            {isRTB ? 'RTB 입찰 흐름' : 'Gale-Shapley 안정 매칭'}
          </span>
        </div>
        <span className="text-[11px] text-slate-500">
          매칭 라인 위에 마우스를 올리면 입찰·AI 점수가 표시됩니다.
        </span>
      </div>

      <div className="absolute inset-4">
        <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} className="h-full w-full">
          {/* 연결선 */}
          {matches.map((match, index) => {
            const firmPos = firmPositions.get(match.firm.id)
            const sitePos = sitePositions.get(match.website.id)
            if (!firmPos || !sitePos) return null

            const isWhale = match.firm.id === whaleFirmId
            const stroke = isWhale ? lineColorWhale : lineColorOther
            const strokeWidth = isRTB ? (isWhale ? 4 : 1.6) : 2.4
            const opacity = isRTB && !isWhale ? 0.45 : 0.9

            return (
              <motion.line
                key={`${match.firm.id}-${match.website.id}-${mode}`}
                x1={firmPos.x}
                y1={firmPos.y}
                x2={sitePos.x}
                y2={sitePos.y}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                opacity={opacity}
                initial={
                  isRTB
                    ? { pathLength: 0, opacity: 0 }
                    : { pathLength: 0, opacity: 0 }
                }
                animate={{ pathLength: 1, opacity }}
                transition={
                  isRTB
                    ? { duration: 0.35, ease: 'easeOut' }
                    : { duration: 0.7, ease: 'easeInOut', delay: index * 0.12 }
                }
                onMouseEnter={() => handleLineEnter(match)}
                onMouseLeave={handleLineLeave}
              />
            )
          })}

          {/* Firm 노드 */}
          {sortedFirms.map((firm) => {
            const pos = firmPositions.get(firm.id)
            if (!pos) return null
            const isWhale = firm.id === whaleFirmId
            const radius = isWhale ? 14 : 9
            const fill = isWhale
              ? isRTB
                ? '#b91c1c'
                : '#16a34a'
              : '#0f172a'
            const stroke = isWhale
              ? isRTB
                ? '#f97373'
                : '#6ee7b7'
              : '#e5e7eb'
            const opacity = isRTB && !isWhale ? 0.5 : 1

            return (
              <g key={firm.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={radius}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={isWhale ? 2.4 : 1.4}
                  opacity={opacity}
                />
                <text
                  x={pos.x}
                  y={pos.y - radius - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#cbd5f5"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {getShortName(firm.name)}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + radius + 10}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  타깃 {firm.targetAge}세
                </text>
              </g>
            )
          })}

          {/* Website 노드 */}
          {sortedSites.map((site) => {
            const pos = sitePositions.get(site.id)
            if (!pos) return null
            return (
              <g key={site.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={8}
                  fill="#020617"
                  stroke={isRTB ? '#f97316' : '#22c55e'}
                  strokeWidth={1.4}
                />
                <text
                  x={pos.x}
                  y={pos.y - 14}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#e5e7eb"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {getShortName(site.name)}
                </text>
                <text
                  x={pos.x}
                  y={pos.y + 12}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  연령 {site.audienceAge}세
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {hover && tooltipStyle && (
        <div
          className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md border border-slate-700 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-100 shadow-xl"
          style={tooltipStyle}
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold">
              {hover.match.firm.name} → {hover.match.website.name}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                isRTB ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {isRTB ? 'RTB' : 'Gale-Shapley'}
            </span>
          </div>
          <p className="text-[10px] text-slate-300">
            입찰가:{' '}
            <span className={isRTB ? 'text-red-300' : 'text-slate-100'}>
              ${formatBid(hover.match.bidPrice)}
            </span>
          </p>
          <p className="text-[10px] text-slate-300">
            AI 적합도 점수:{' '}
            <span className={isRTB ? 'text-slate-100' : 'text-emerald-300'}>
              {formatAffinity(hover.match.affinity)} / 100
            </span>
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            {isRTB
              ? '높은 입찰가 때문에 낮은 적합도에도 불구하고 노출을 가져가는 구조입니다.'
              : '양측 선호와 AI 적합도를 반영하여 더 의미 있는 매칭만 남은 상태입니다.'}
          </p>
        </div>
      )}
    </div>
  )
}

export default MatchingGraph


