import { useCallback, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { AlertTriangle, FileUp, Lightbulb, Loader2, Play, Radar, Send } from "lucide-react"

import { detectMode, loadSamples, loadWorkOrders, processFile, processText } from "@/lib/api"
import { STATUS } from "@/lib/fields"
import XRay from "@/components/dino/XRay"
import FloorGrid from "@/components/dino/FloorGrid"
import Verdict from "@/components/dino/Verdict"
import Gauges from "@/components/dino/Gauges"
import MatchRace from "@/components/dino/MatchRace"

const BASE = import.meta.env.BASE_URL

function Panel({ title, hint, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-400">{title}</h2>
        {hint && <span className="text-[11px] text-zinc-600">{hint}</span>}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, tone = "text-zinc-100" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
    </div>
  )
}

export default function App() {
  const [mode, setMode] = useState(null)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [draft, setDraft] = useState("")
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  const patch = useCallback((id, change) => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...change } : x))), [])

  const run = useCallback(
    async (item, m, action) => {
      patch(item.id, { state: "running" })
      try {
        const result = await action()
        patch(item.id, { state: "done", result, text: result.text })
      } catch (err) {
        patch(item.id, { state: "error", message: err.message })
        setError(err.message)
      }
    },
    [patch]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const m = await detectMode()
      const [samples, wos] = await Promise.all([loadSamples(m), loadWorkOrders(m)])
      if (cancelled) return
      setMode(m)
      setWorkOrders(wos)
      const inbox = samples.map((s) => ({ id: s.id, title: s.title, text: s.text, state: "idle", sample: true }))
      setItems(inbox)
      setSelected(inbox[0]?.id ?? null)
      for (const item of inbox) {
        if (cancelled) return
        await run(item, m, () => processText(m, item.text, item.id))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [run])

  const runAll = async () => {
    setError(null)
    for (const item of items.filter((i) => i.sample)) await run(item, mode, () => processText(mode, item.text, item.id))
  }

  const addAndRun = (title, action) => {
    const item = { id: `u-${Date.now()}`, title, state: "idle" }
    setItems((xs) => [...xs, item])
    setSelected(item.id)
    setError(null)
    run(item, mode, action)
  }

  const submitDraft = () => {
    const text = draft.trim()
    if (!text) return
    setDraft("")
    addAndRun("Pasted report", () => processText(mode, text))
  }

  const onFile = (file) => file && addAndRun(file.name, () => processFile(file))

  const done = items.filter((i) => i.result)
  const count = (s) => done.filter((i) => i.result.match.status === s).length
  const avgRisk = done.filter((i) => i.result.assessment).length
    ? Math.round(done.reduce((t, i) => t + (i.result.assessment?.risk_score ?? 0), 0) / done.filter((i) => i.result.assessment).length)
    : "–"
  const current = items.find((i) => i.id === selected)
  const result = current?.result
  const live = mode === "live"

  return (
    <main className="min-h-screen bg-[#08090c] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.10),transparent_55%),linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:auto,44px_44px,44px_44px]" />

      <div className="relative mx-auto max-w-[1500px] px-5 py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={`${BASE}logo-dark.png`} alt="" className="h-11 w-11" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dino</h1>
              <p className="text-sm text-zinc-500">Shop-floor reports, matched to the right work order.</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ${live ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30" : "bg-amber-500/10 text-amber-300 ring-amber-500/30"}`}>
              <span className={`h-2 w-2 rounded-full ${mode == null ? "bg-zinc-500" : live ? "animate-pulse bg-emerald-400" : "bg-amber-400"}`} />
              {mode == null ? "Connecting…" : live ? "Live backend" : "Demo snapshot"}
            </span>
          </div>
        </header>

        {mode === "demo" && (
          <p className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-200/90">
            No backend reachable, so you're seeing precomputed results for the bundled sample reports. To analyse your own reports run{" "}
            <code className="rounded bg-black/40 px-1.5 py-0.5 text-amber-100">uvicorn dino.api:app</code> in <code className="rounded bg-black/40 px-1.5 py-0.5 text-amber-100">backend/</code>.
          </p>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Reports" value={done.length} />
          <Stat label="Matched" value={count("matched")} tone="text-emerald-300" />
          <Stat label="Needs review" value={count("review")} tone="text-amber-300" />
          <Stat label="No match" value={count("unmatched")} tone="text-zinc-300" />
          <Stat label="Avg risk" value={avgRisk} tone="text-rose-300" />
        </div>

        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
          {/* INBOX */}
          <Panel title="Inbox" hint={`${items.length} reports`} className="lg:row-span-2">
            <ul className="space-y-2">
              {items.map((it) => {
                const st = it.result && STATUS[it.result.match.status]
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setSelected(it.id)}
                      className={`w-full rounded-xl border px-3.5 py-3 text-left transition ${
                        it.id === selected ? "border-amber-400/60 bg-amber-400/10" : "border-white/10 hover:bg-white/[0.04]"
                      }`}
                    >
                      <p className="line-clamp-2 text-sm font-medium">{it.title}</p>
                      <div className="mt-2 flex items-center gap-2 text-[11px]">
                        {it.state === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />}
                        {it.state === "idle" && <span className="text-zinc-600">Queued</span>}
                        {it.state === "error" && <span className="text-rose-300">Failed</span>}
                        {st && <span className={`rounded-full px-2 py-0.5 ring-1 ${st.chip}`}>{st.label} · {Math.round(it.result.match.confidence * 100)}%</span>}
                        {it.result?.assessment && <span className="text-zinc-500">risk {it.result.assessment.risk_score}</span>}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>

            <button
              onClick={runAll}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2 text-xs text-zinc-400 transition hover:bg-white/[0.04]"
            >
              <Play className="h-3.5 w-3.5" /> Re-run all samples
            </button>

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="mb-2 text-[11px] uppercase tracking-wider text-zinc-500">Analyse your own</p>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!live}
                placeholder={live ? "Paste report text…" : "Needs the live backend"}
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs outline-none placeholder:text-zinc-600 focus:border-amber-400/50 disabled:opacity-50"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={submitDraft}
                  disabled={!live || !draft.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 py-2 text-xs font-semibold text-black transition hover:bg-amber-300 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" /> Analyse
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!live}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (live) onFile(e.dataTransfer.files?.[0])
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs transition hover:bg-white/[0.04] disabled:opacity-40"
                >
                  <FileUp className="h-3.5 w-3.5" /> File
                </button>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = "" }} />
              </div>
              {error && <p className="mt-3 flex gap-2 text-xs text-rose-300"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
            </div>
          </Panel>

          {/* X-RAY */}
          <Panel title="X-ray" hint="every highlight is evidence pulled from the report">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key={current.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <XRay text={result.text} spans={result.spans} extracted={result.extracted} />
                </motion.div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                  {current?.state === "running" ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-2"><Radar className="h-4 w-4" />Select a report</span>}
                </div>
              )}
            </AnimatePresence>
          </Panel>

          {/* VERDICT */}
          <div className="space-y-5 lg:row-span-2">
            {result && (
              <>
                <Panel title="Verdict"><Verdict match={result.match} /></Panel>
                {result.match.notes.length > 0 && (
                  <Panel title="Needs a human">
                    <ul className="space-y-2 text-sm text-amber-200/90">
                      {result.match.notes.map((n) => <li key={n} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{n}</li>)}
                    </ul>
                  </Panel>
                )}
                <Panel title="Why this work order" hint="evidence per field"><MatchRace candidates={result.match.candidates} /></Panel>
                {result.assessment && (
                  <Panel title="Against the plan">
                    <Gauges a={result.assessment} />
                    {result.assessment.deviations.length > 0 && (
                      <ul className="mt-5 space-y-2.5">
                        {result.assessment.deviations.map((d) => (
                          <li key={d.type} className={`rounded-xl border px-3.5 py-2.5 text-sm ${d.severity === "high" ? "border-rose-400/30 bg-rose-400/5 text-rose-100" : "border-amber-400/25 bg-amber-400/5 text-amber-100"}`}>
                            <span className="mr-2 text-[10px] font-semibold uppercase tracking-wider opacity-70">{d.type.replace("_", " ")} · {d.severity}</span>
                            {d.message}
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.assessment.recommendations.map((r) => (
                      <p key={r} className="mt-3 flex gap-2 text-sm text-zinc-300"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />{r}</p>
                    ))}
                  </Panel>
                )}
              </>
            )}
          </div>

          {/* PLAN BOARD */}
          <Panel title="Plan board" hint="matched work order glows, runners-up show their score">
            <FloorGrid workOrders={workOrders} match={result?.match} />
          </Panel>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          Rule-based extraction on synthetic work orders. Verify matches and risk flags against the original report before acting on them.
        </p>
      </div>
    </main>
  )
}
