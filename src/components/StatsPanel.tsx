import type { AlgorithmResult } from '../algorithms'
import { computeMarketFairnessGini } from '../algorithms'
import type { Firm } from '../data'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, BarChart3 } from 'lucide-react'

interface StatsPanelProps {
  rtbResult: AlgorithmResult
  gsResult: AlgorithmResult
  firms: Firm[]
}

// Recharts의 formatter/tickFormatter는 value를 number | string | undefined 등으로 전달할 수 있으므로
// 타입을 any로 넉넉하게 두고 내부에서 숫자로 변환합니다.
const formatPercent = (value: any): string => {
  const num = typeof value === 'number' ? value : Number(value ?? 0)
  const safe = Number.isNaN(num) ? 0 : num
  return `${(safe * 100).toFixed(1)}%`
}

export function StatsPanel({ rtbResult, gsResult, firms }: StatsPanelProps) {
  const rtbGini = computeMarketFairnessGini(rtbResult, firms)
  const gsGini = computeMarketFairnessGini(gsResult, firms)

  const fairnessData = [
    { name: 'RTB', value: rtbGini },
    { name: 'Gale-Shapley', value: gsGini },
  ]

  const satisfactionData = [
    { name: 'RTB', value: rtbResult.totalSatisfaction },
    { name: 'Gale-Shapley', value: gsResult.totalSatisfaction },
  ]

  const improvement =
    rtbResult.totalSatisfaction === 0
      ? 0
      : (gsResult.totalSatisfaction - rtbResult.totalSatisfaction) /
        Math.max(rtbResult.totalSatisfaction, 1)

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr,1.2fr,0.9fr]">
      <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-gradient-to-b from-red-950/70 to-slate-950/90 p-4 shadow-lg shadow-red-900/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-red-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600/80 text-slate-50">
            <Activity className="h-3 w-3" />
          </span>
          지니 계수
        </div>
        <p className="hidden text-[11px] leading-relaxed text-slate-300 md:block">
          낮을수록 광고 노출이 공정한 것이고 높을수록 광고 시장이 독점 형태를 띕니다.
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fairnessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#cbd5f5', fontSize: 11 }} />
              <YAxis
                domain={[0, 1]}
                // value 타입이 number | string | undefined 일 수 있으므로 any 사용
                tickFormatter={(value: any) => formatPercent(value)}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
              />
              <Tooltip
                // value 타입을 any 로 받아 안전하게 처리
                formatter={(value: any) => formatPercent(value)}
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#1e293b',
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="value"
                radius={4}
                fill="#ef4444"
                background={{ fill: '#020617' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/60 to-slate-950/90 p-4 shadow-lg shadow-emerald-900/20">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600/80 text-slate-50">
            <BarChart3 className="h-3 w-3" />
          </span>
          광고 노출 총 적합도
        </div>
        <p className="hidden text-[11px] leading-relaxed text-slate-300 md:block">
          광고 노출 결과에 대한 적합도 점수의 합계 값
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={satisfactionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" tick={{ fill: '#cbd5f5', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip
                // value 가 number | string | undefined 일 수 있으므로 any 로 받고 숫자로 변환
                formatter={(value: any) => {
                  const num = typeof value === 'number' ? value : Number(value ?? 0)
                  const safe = Number.isNaN(num) ? 0 : num
                  return safe.toFixed(1)
                }}
                contentStyle={{
                  backgroundColor: '#020617',
                  borderColor: '#1e293b',
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="value"
                radius={4}
                fill="#22c55e"
                background={{ fill: '#020617' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div>
          <p className="text-xs font-semibold text-slate-200">해석</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            * 기존 RTB 방식은 고예산 광고주에 광고 노출이 집중되면서 지니 계수가 높게 나타남.
            * Gale-Shapley 방식은 매체와 광고주의 양방향 선호를 반영하여 지니 계수가 낮게 나타남.
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-900/10 px-3 py-2 text-[11px] text-emerald-100">
          <p className="font-semibold">Gale-Shapley 방식 광고 노출 만족도 개선</p>
          <p className="mt-1">
            광고 노출 만족도 비율:{' '}
            <span className="font-semibold">
              {formatPercent(Math.max(0, improvement))}
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default StatsPanel


