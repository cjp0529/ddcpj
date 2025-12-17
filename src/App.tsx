import { useMemo, useState } from 'react'
import { Activity, BarChart3 } from 'lucide-react'
import { firms as ALL_FIRMS, websites as ALL_WEBSITES, type Firm, type Website } from './data'
import { runRTB, runGaleShapley, type AlgorithmResult } from './algorithms'
import MatchingGraph from './components/MatchingGraph'
import StatsPanel from './components/StatsPanel'

const MAX_SELECTION = 4

function App() {
  const [selectedFirmIds, setSelectedFirmIds] = useState<string[]>([])
  const [selectedWebsiteIds, setSelectedWebsiteIds] = useState<string[]>([])
  const [rtbResult, setRtbResult] = useState<AlgorithmResult | null>(null)
  const [gsResult, setGsResult] = useState<AlgorithmResult | null>(null)

  const selectedFirms = useMemo(
    () => ALL_FIRMS.filter((f) => selectedFirmIds.includes(f.id)),
    [selectedFirmIds],
  )
  const selectedWebsites = useMemo(
    () => ALL_WEBSITES.filter((w) => selectedWebsiteIds.includes(w.id)),
    [selectedWebsiteIds],
  )

  const canRun =
    selectedFirms.length === MAX_SELECTION && selectedWebsites.length === MAX_SELECTION

  const handleToggleFirm = (id: string) => {
    setSelectedFirmIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, id]
    })
  }

  const handleToggleWebsite = (id: string) => {
    setSelectedWebsiteIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id)
      }
      if (prev.length >= MAX_SELECTION) return prev
      return [...prev, id]
    })
  }

  const handleRunSimulation = () => {
    if (!canRun) return
    const rtb = runRTB(selectedFirms, selectedWebsites)
    const gs = runGaleShapley(selectedFirms, selectedWebsites)
    setRtbResult(rtb)
    setGsResult(gs)
  }

  const monopolyFirmId = useMemo(() => {
    if (!rtbResult) return null
    const counts = new Map<string, number>()
    for (const match of rtbResult.matches) {
      const current = counts.get(match.firm.id) ?? 0
      counts.set(match.firm.id, current + 1)
    }
    let maxId: string | null = null
    let maxCount = 0
    for (const [id, count] of counts.entries()) {
      if (count > maxCount) {
        maxCount = count
        maxId = id
      }
    }
    return maxCount > 1 ? maxId : null
  }, [rtbResult])

  const hasMonopoly = !!monopolyFirmId

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(circle_at_top,_#1e293b_0,_#020617_52%,_#020617_100%)]">
      <main className="mx-auto flex max-w-7xl flex-col gap-7 px-4 py-6 md:py-8">
        {/* 상단 헤더 */}
        <header className="rounded-3xl border border-slate-800/80 bg-slate-950/70 px-4 py-4 shadow-lg shadow-slate-900/40 backdrop-blur">
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-300">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 ring-1 ring-sky-500/40">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
            </div>
            <span className="font-medium tracking-tight">K-AdX Research Console</span>
          </div>
          <div className="space-y-2 border-t border-slate-800/60 pt-4">
            <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl lg:text-3xl">
              DDC: 광고 시장 독점 개선 및 Gale-Shapley 방식 제안
            </h1>
            <p className="max-w-3xl text-[13px] leading-relaxed text-slate-300 md:text-sm">
              실제 브랜드를 가상 예산 및 입찰 데이터로 모델링하여
              RTB 방식과 Gale-Shapley 방식의
              광고 노출 차이를 비교하는 시뮬레이션
            </p>
          </div>
        </header>

        {/* 컨트롤 패널 */}
        <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-900/40 backdrop-blur-sm md:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/90 text-slate-50">
                <BarChart3 className="h-4 w-4" />
              </span>
              브랜드&매체 제어 패널
            </div>
            <p className="hidden text-[11px] text-slate-400 md:block">
              * 선택한 결과에 따라 RTB 방식과 Gale-Shapley 방식이 동시에 갱신됨.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2.2fr,1.3fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <SelectorPanel
                title="브랜드"
                items={ALL_FIRMS}
                selectedIds={selectedFirmIds}
                onToggle={handleToggleFirm}
                maxSelection={MAX_SELECTION}
              />
              <SelectorPanel
                title="매체"
                items={ALL_WEBSITES}
                selectedIds={selectedWebsiteIds}
                onToggle={handleToggleWebsite}
                maxSelection={MAX_SELECTION}
              />
            </div>

            <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4">
              <div className="space-y-2 text-sm text-slate-200">
                <p className="font-semibold">시뮬레이션 현황</p>
                <p className="text-xs text-slate-300">
                  브랜드:{' '}
                  <span className="font-semibold text-sky-300">{selectedFirms.length}</span> /{' '}
                  {MAX_SELECTION} · 매체:{' '}
                  <span className="font-semibold text-sky-300">{selectedWebsites.length}</span> /{' '}
                  {MAX_SELECTION}
                </p>
                <p className="hidden text-[11px] leading-relaxed text-slate-400 md:block">
                  설명: 독점 기업은 고예산&고입찰의 형태를 띄어 낮은 적합도의 매체의 광고 노출을 점한다.
                  RTB 방식에서는 독점 기업이 여러 매체를 독점하는 반면,
                  Gale-Shapley 방식은 각 매체에 적합한 브랜드가 노출된다.
                </p>
              </div>

              <div className="flex flex-col gap-2 text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handleRunSimulation}
                  disabled={!canRun}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    canRun
                      ? 'bg-sky-500 text-white hover:bg-sky-400'
                      : 'cursor-not-allowed bg-slate-800 text-slate-500'
                  }`}
                >
                  시뮬레이션
                </button>
                <span className="text-[11px] leading-relaxed">
                  각각 4개의 브랜드와 매체를 선택하세요.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 결과 영역 */}
        {rtbResult && gsResult ? (
          <>
            {/* 네트워크 그래프 */}
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-red-500/40 bg-gradient-to-b from-red-950/70 via-slate-950/80 to-slate-950/90 p-4 shadow-xl shadow-red-900/30">
                <div className="mb-3 flex items-center justify-between text-xs text-red-200">
                  <div className="space-y-1">
                    <p className="font-semibold">RTB 방식 독점 현황</p>
                    <p className="text-[11px] text-red-100/80">
                      * 입찰을 기준으로 하는 RTB 방식에서 고예산 브랜드가 광고 노출을 독점함.
                    </p>
                  </div>
                  <div className="rounded-full bg-red-900/60 px-3 py-1 text-[10px] text-red-100">
                    독점 위험도:{' '}
                    <span className="font-semibold">{hasMonopoly ? '높음' : '낮음'}</span>
                  </div>
                </div>
                <MatchingGraph
                  mode="RTB"
                  firms={selectedFirms}
                  websites={selectedWebsites}
                  matches={rtbResult.matches}
                />
              </div>

              <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/60 via-slate-950/80 to-slate-950/90 p-4 shadow-xl shadow-emerald-900/30">
                <div className="mb-3 flex items-center justify-between text-xs text-emerald-100">
                  <div className="space-y-1">
                    <p className="font-semibold">Gale-Shapley 방식 안정 현황</p>
                    <p className="text-[11px] text-emerald-100/80">
                      * 양방향 선호를 반영한 일 대 일 안정 매칭에 따라 각 매체가
                      가장 잘 맞는 브랜드와 연결되어 광고 노출이 고르게 분배됨.
                    </p>
                  </div>
                  <div className="rounded-full bg-emerald-900/60 px-3 py-1 text-[10px] text-emerald-100">
                    Gale-Shapley
                  </div>
                </div>
                <MatchingGraph
                  mode="GS"
                  firms={selectedFirms}
                  websites={selectedWebsites}
                  matches={gsResult.matches}
                />
              </div>
            </section>

            {/* 메트릭 대시보드 */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-slate-900/40">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-100">시뮬레이션 보드</p>
                  <p className="text-[11px] text-slate-400">
                    * 두 차트는 지니 계수와 광고 시장 생태계 만족도를 보여줌.
                  </p>
                </div>
              </div>
              <StatsPanel rtbResult={rtbResult} gsResult={gsResult} firms={selectedFirms} />
            </section>
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
            <p className="font-medium text-slate-200">시뮬레이션이 실행되지 않았습니다.</p>
            <p className="mt-1 text-[12px]">
              * 제어 패널에서 각각 4개의 브랜드와 매체를 채택한 뒤{' '}
              <span className="font-semibold text-sky-400">시뮬레이션</span>버튼을 누르면
              RTB 방식과 Gale-Shapley 방식의 결과가 네트워크 그래프와 시뮬레이션 보드에 동시에 표시됨.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

type SelectorItem = Firm | Website

interface SelectorPanelProps {
  title: string
  items: SelectorItem[]
  selectedIds: string[]
  onToggle: (id: string) => void
  maxSelection: number
}

function SelectorPanel({ title, items, selectedIds, onToggle, maxSelection }: SelectorPanelProps) {
  const remaining = maxSelection - selectedIds.length

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-100 md:text-base">{title}</h2>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] text-slate-300">
          선택 {selectedIds.length}/{maxSelection}
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        {remaining > 0
          ? `추가로 ${remaining}개까지 선택할 수 있습니다.`
          : '최대 개수에 도달했습니다. 선택을 변경하려면 기존 선택을 해제하세요.'}
      </p>
      <div className="mt-1 grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id)
          const disabled = !isSelected && selectedIds.length >= maxSelection

          const categoryLabel =
            item.category === 'Fashion/Shop'
              ? '패션·쇼핑'
              : item.category === 'Living/Health'
                ? '생활·건강'
                : '취미·여가'

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggle(item.id)}
              disabled={disabled}
              className={`flex flex-col items-start rounded-lg border px-3 py-2 text-left text-[11px] transition sm:text-xs ${
                isSelected
                  ? 'border-sky-400 bg-sky-500/10 text-sky-50'
                  : disabled
                    ? 'cursor-not-allowed border-slate-800 bg-slate-950 text-slate-500'
                    : 'border-slate-800 bg-slate-950 text-slate-200 hover:border-sky-500 hover:bg-slate-900'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="max-w-[70%] truncate font-semibold" title={item.name}>
                  {item.name}
                </span>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] text-slate-200">
                  {categoryLabel}
                </span>
              </div>
              {'budget' in item && (
                <span className="mt-1 text-[10px] text-slate-300">
                  예산: ${item.budget.toLocaleString()} · 입찰가: ${item.bid.toFixed(2)} · 타겟 연령:{' '}
                  {item.targetAgeRange[0]}–{item.targetAgeRange[1]}
                </span>
              )}
              {'authority' in item && (
                <span className="mt-1 text-[10px] text-slate-300">
                  권위도: {(item.authority * 100).toFixed(0)}점 · 연령대:{' '}
                  {item.audienceAgeRange[0]}–{item.audienceAgeRange[1]}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default App
