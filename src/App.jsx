import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, FileUp, Loader2, Play } from "lucide-react"

import { detectMode, loadSamples, loadWorkOrders, processFile, processText } from "@/lib/api"
import { STATUS } from "@/lib/fields"
import XRay from "@/components/dino/XRay"
import PlanBoard from "@/components/dino/PlanBoard"
import Analysis, { Section } from "@/components/dino/Analysis"

const BASE = import.meta.env.BASE_URL

export default function App() {
  const [mode, setMode] = useState(null)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [workOrders, setWorkOrders] = useState([])
  const [draft, setDraft] = useState("")
  const [error, setError] = useState(null)
  const [hover, setHover] = useState(null)
  const fileRef = useRef(null)
  const reportRef = useRef(null)

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
  const scored = done.filter((i) => i.result.assessment)
  const avgRisk = scored.length ? Math.round(scored.reduce((t, i) => t + i.result.assessment.risk_score, 0) / scored.length) : null
  const current = items.find((i) => i.id === selected)
  const result = current?.result
  const live = mode === "live"

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1400px] px-5 py-6">
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b pb-4">
          <div className="flex items-center gap-3">
            <img src={`${BASE}logo.png`} alt="" className="h-9 w-9 dark:hidden" />
            <img src={`${BASE}logo-dark.png`} alt="" className="hidden h-9 w-9 dark:block" />
            <div>
              <h1 className="text-xl font-semibold leading-none tracking-tight">Dino</h1>
              <p className="mt-1 text-sm text-muted-foreground">Shop-floor reports, matched to the right work order.</p>
            </div>
          </div>
          <p className="text-sm tabular-nums text-muted-foreground">
            {done.length} reports · {count("matched")} matched · {count("review")} need review
            {avgRisk != null && <> · avg risk {avgRisk}</>}
            <span className="mx-2">|</span>
            {mode == null ? "connecting" : live ? "live backend" : "demo snapshot"}
          </p>
        </header>

        {mode === "demo" && (
          <p className="mt-4 rounded-md border bg-muted px-4 py-2.5 text-sm text-muted-foreground">
            No backend reachable, so these are precomputed results for the bundled samples. To analyse your own reports, run{" "}
            <code className="font-mono text-foreground">uvicorn dino.api:app</code> in <code className="font-mono text-foreground">backend/</code>.
          </p>
        )}

        <div className="grid gap-x-8 gap-y-8 pt-6 lg:grid-cols-[260px_minmax(0,1fr)_380px]">
          {/* REPORTS */}
          <aside>
            <Section title="Reports" aside={`${items.length}`}>
              <ul className="-mx-2">
                {items.map((it) => {
                  const st = it.result && STATUS[it.result.match.status]
                  return (
                    <li key={it.id}>
                      <button
                        onClick={() => {
                          setSelected(it.id)
                          // On a phone the report sits below this list, so bring it into view.
                          if (window.innerWidth < 1024) reportRef.current?.scrollIntoView({ behavior: "smooth" })
                        }}
                        className={`w-full border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-muted ${it.id === selected ? "border-[var(--accent-ink)] bg-muted" : "border-transparent"}`}
                      >
                        <p className="text-sm font-medium leading-snug">{it.title}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                          {it.state === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
                          {it.state === "idle" && "Queued"}
                          {it.state === "error" && <span style={{ color: "var(--bad)" }}>Failed</span>}
                          {st && (
                            <>
                              <span className="font-medium" style={{ color: st.color }}>{st.label}</span>
                              <span className="tabular-nums">{Math.round(it.result.match.confidence * 100)}%</span>
                              {it.result.assessment && <span className="tabular-nums">· risk {it.result.assessment.risk_score}</span>}
                            </>
                          )}
                        </p>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button onClick={runAll} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                <Play className="h-3 w-3" /> Re-run all samples
              </button>
            </Section>

            <Section title="Add a report">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!live}
                placeholder={live ? "Paste report text" : "Needs the live backend"}
                rows={4}
                className="w-full resize-none rounded-md border bg-card p-3 font-mono text-xs outline-none placeholder:text-muted-foreground focus:border-[var(--accent-ink)] disabled:opacity-50"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={submitDraft}
                  disabled={!live || !draft.trim()}
                  className="flex-1 rounded-md bg-foreground py-2 text-xs font-medium text-background transition-opacity hover:opacity-85 disabled:opacity-30"
                >
                  Analyse
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={!live}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (live) onFile(e.dataTransfer.files?.[0]) }}
                  className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors hover:bg-muted disabled:opacity-40"
                >
                  <FileUp className="h-3.5 w-3.5" /> Upload
                </button>
                <input ref={fileRef} type="file" accept=".txt,.pdf,.png,.jpg,.jpeg" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = "" }} />
              </div>
              {live && <p className="mt-2 text-xs text-muted-foreground">Text, PDF with a text layer, PNG or JPG.</p>}
              {error && (
                <p className="mt-3 flex gap-2 text-xs" style={{ color: "var(--bad)" }}>
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}
                </p>
              )}
            </Section>
          </aside>

          {/* REPORT + PLAN */}
          <div ref={reportRef} className="min-w-0 scroll-mt-4">
            <Section title={current?.title ?? "Report"} aside={result ? `read as ${result.source}` : undefined}>
              {result ? (
                <>
                  <XRay text={result.text} spans={result.spans} hover={hover} onHover={setHover} />
                  <p className="mt-2 text-xs text-muted-foreground">
                    <span className="mark-id">Underlined</span> identifiers, <span className="mark-qty">highlighted</span> quantities, <span className="mark-cause">italic</span> downtime cause. Hover a field to locate it.
                  </p>
                </>
              ) : (
                <p className="py-10 text-sm text-muted-foreground">
                  {current?.state === "running" ? "Reading report…" : "Select a report."}
                </p>
              )}
            </Section>
            <Section title="Plan" aside="matched work order filled, runners-up outlined">
              <PlanBoard workOrders={workOrders} match={result?.match} />
            </Section>
          </div>

          {/* ANALYSIS */}
          <div>{result && <Analysis result={result} hover={hover} onHover={setHover} />}</div>
        </div>

        <p className="mt-10 border-t pt-4 text-xs text-muted-foreground">
          Rule-based extraction on synthetic work orders. Check matches and risk flags against the original report before acting on them.
        </p>
      </div>
    </main>
  )
}
