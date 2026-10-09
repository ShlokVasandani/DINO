import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  FileUp,
  FileCheck2,
  Loader2,
  Sparkles,
  CircleCheck,
  AlertTriangle,
  Lightbulb,
  Search,
  ArrowRight,
  FileText,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"
const BASE = import.meta.env.BASE_URL

const fmt = (n) => (n == null ? "—" : n.toLocaleString("en-IN"))
const SHIFT_HOURS = { A: "06:00 – 14:00", B: "14:00 – 22:00", C: "22:00 – 06:00" }

function App() {
  const [file, setFile] = useState(null)
  const [label, setLabel] = useState("")
  const [status, setStatus] = useState("idle")
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [samples, setSamples] = useState([])

  const inputRef = useRef(null)

  useEffect(() => {
    fetch(`${API}/api/samples`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSamples)
      .catch(() => setSamples([]))
  }, [])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setLabel(selectedFile.name)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      setLabel(droppedFile.name)
    }
  }

  const run = async (body, name) => {
    setStatus("processing")
    setError(null)
    setLabel(name)
    try {
      const res = await fetch(`${API}/api/process`, { method: "POST", body })
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}))
        throw new Error(detail.detail || `Request failed (${res.status})`)
      }
      setResult(await res.json())
      setStatus("complete")
    } catch (err) {
      setError(
        err instanceof TypeError
          ? `Can't reach the Dino backend at ${API}. Start it with: cd backend && uvicorn dino.api:app`
          : err.message
      )
      setStatus("idle")
    }
  }

  const handleProcess = () => {
    if (!file) return
    const body = new FormData()
    body.append("file", file)
    run(body, file.name)
  }

  const handleSample = (sample) => {
    const body = new FormData()
    body.append("text", sample.text)
    run(body, sample.title)
  }

  const handleReset = () => {
    setFile(null)
    setLabel("")
    setResult(null)
    setError(null)
    setStatus("idle")
    if (inputRef.current) {
      inputRef.current.value = ""
    }
  }

  const isComplete = status === "complete"

  return (
    <main className="min-h-screen bg-background px-6 py-12">

      <div className="mx-auto max-w-6xl">

        {/* HEADER */}
        <header className="mb-12 text-center">
          <div className="mb-3 flex items-center justify-center gap-3">
            <img
              src={`${BASE}logo.png`}
              alt="Dino logo"
              className="h-14 w-14 dark:hidden"
            />
            <img
              src={`${BASE}logo-dark.png`}
              alt=""
              aria-hidden="true"
              className="hidden h-14 w-14 dark:block"
            />
            <h1 className="text-5xl font-bold tracking-tight">
              Dino
            </h1>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Shop-floor reports, matched to the right work order.
          </p>
        </header>


        {/* ===================================================== */}
        {/* MAIN CONTENT */}
        {/* ===================================================== */}

        <div
          className={`
            flex items-center justify-center gap-6
            transition-all duration-500
            ${isComplete ? "flex-row" : "flex-col"}
          `}
        >

          {/* ================================================= */}
          {/* UPLOAD / REPORT CARD */}
          {/* ================================================= */}

          <motion.div
            layout
            initial={false}
            animate={{
              width: isComplete ? "50%" : "520px",
            }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="w-full"
          >

            <Card className="h-[560px] overflow-hidden rounded-2xl shadow-sm">

              <AnimatePresence mode="wait">


                {/* ========================= */}
                {/* UPLOAD */}
                {/* ========================= */}

                {status === "idle" && (
                  <motion.div
                    key="upload"
                    initial={{
                      opacity: 0,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.96,
                    }}
                    transition={{
                      duration: 0.35,
                    }}
                    className="h-full"
                  >

                    <CardHeader className="text-center">

                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/50">
                        <FileUp className="h-6 w-6" />
                      </div>

                      <CardTitle>
                        Upload a production report
                      </CardTitle>

                      <CardDescription>
                        Drop a shift or operator report — Dino extracts the
                        details and matches it to the right work order.
                      </CardDescription>

                    </CardHeader>


                    <CardContent className="flex h-[420px] flex-col items-center justify-center">

                      {/* DROP ZONE */}

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => inputRef.current?.click()}
                        className="flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition hover:bg-muted/40"
                      >

                        <FileUp className="mb-4 h-8 w-8 text-muted-foreground" />

                        {file ? (
                          <>
                            <p className="font-medium">
                              {file.name}
                            </p>

                            <p className="mt-1 text-xs text-muted-foreground">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">
                              Drop your report here
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              or click to browse
                            </p>

                            <p className="mt-4 text-xs text-muted-foreground">
                              Handwritten notes, scans or exports — PDF, PNG, JPG
                            </p>
                          </>
                        )}

                        <input
                          ref={inputRef}
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                      </div>


                      <Button
                        onClick={handleProcess}
                        disabled={!file}
                        className="mt-6"
                      >
                        Extract &amp; Match

                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>

                      {error && (
                        <Alert variant="destructive" className="mt-4 max-w-md">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Couldn't process the report</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {samples.length > 0 && (
                        <div className="mt-6 w-full max-w-md">
                          <p className="mb-2 text-center text-xs text-muted-foreground">
                            or try a sample report
                          </p>
                          <div className="flex flex-wrap justify-center gap-2">
                            {samples.map((sample) => (
                              <Button
                                key={sample.id}
                                variant="outline"
                                size="sm"
                                onClick={() => handleSample(sample)}
                              >
                                <FileText className="mr-1 h-3 w-3" />
                                {sample.title.split(":")[0]}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                    </CardContent>

                  </motion.div>
                )}


                {/* ========================= */}
                {/* PROCESSING */}
                {/* ========================= */}

                {status === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{
                      opacity: 0,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    className="h-full"
                  >

                    <CardContent className="flex h-full flex-col items-center justify-center text-center">

                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border bg-muted/50">

                        <Loader2 className="h-7 w-7 animate-spin" />

                      </div>


                      <h2 className="text-xl font-semibold">
                        Matching report to plan...
                      </h2>


                      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                        Reading the report, pulling out quantities and part
                        numbers, then matching them against open work orders.
                      </p>


                    </CardContent>

                  </motion.div>
                )}


                {/* ========================= */}
                {/* COMPLETED REPORT */}
                {/* ========================= */}

                {status === "complete" && (
                  <motion.div
                    key="report"
                    initial={{
                      opacity: 0,
                      x: -40,
                    }}
                    animate={{
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.5,
                      delay: 0.15,
                    }}
                    className="h-full"
                  >

                    <CardHeader>

                      <div className="flex items-start justify-between gap-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50">

                            <FileCheck2 className="h-5 w-5" />

                          </div>

                          <div>

                            <CardTitle>
                              Structured Report
                            </CardTitle>

                            <CardDescription>
                              {label}
                            </CardDescription>

                          </div>

                        </div>


                        <MatchBadge match={result.match} />

                      </div>

                    </CardHeader>


                    <Separator />


                    <ScrollArea className="h-[420px]">

                      <CardContent className="space-y-6 pt-6">

                        <ReportSection
                          title="Extracted from report"
                          items={[
                            ["Date", result.extracted.date ?? "Not found"],
                            ["Shift", result.extracted.shift ? `${result.extracted.shift} (${SHIFT_HOURS[result.extracted.shift]})` : "Not found"],
                            ["Work order cited", result.extracted.work_order ?? "None"],
                            ["Part number", result.extracted.part_number ?? "Not found"],
                            ["Line", result.extracted.line ? `Line ${result.extracted.line}` : "Not found"],
                          ]}
                        />

                        {result.match.work_order ? (
                          <ReportSection
                            title="Matched work order"
                            items={[
                              ["Work order", result.match.work_order.id],
                              ["Part", `${result.match.work_order.part_number} · ${result.match.work_order.part_name}`],
                              ["Line", `Line ${result.match.work_order.line}`],
                              ["Planned", `${result.match.work_order.date}, shift ${result.match.work_order.shift}`],
                            ]}
                          />
                        ) : (
                          <ReportSection
                            title="Matched work order"
                            content="No work order fits this report well enough. Check the part number, line and date."
                          />
                        )}

                        {result.assessment && (
                          <ReportSection
                            title="Output vs plan"
                            items={[
                              ["Planned", `${fmt(result.assessment.planned)} units`],
                              ["Reported", result.assessment.produced == null ? "Not found" : `${fmt(result.assessment.produced)} units`],
                              ["Rejected", result.assessment.rejected == null ? "Not found" : `${fmt(result.assessment.rejected)} units`],
                              ["Downtime", result.assessment.downtime_min == null ? "None reported" : `${result.assessment.downtime_min} min`],
                            ]}
                          />
                        )}

                        <ReportSection title="Source text" content={result.text} />

                      </CardContent>

                    </ScrollArea>


                    <div className="border-t px-6 py-3">

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                      >
                        Process another report
                      </Button>

                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </Card>

          </motion.div>


          {/* ================================================= */}
          {/* AI CARD */}
          {/* ================================================= */}

          <AnimatePresence>

            {isComplete && (

              <motion.div
                initial={{
                  opacity: 0,
                  x: 80,
                  scale: 0.96,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                }}
                transition={{
                  duration: 0.65,
                  delay: 0.15,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="w-full md:w-1/2"
              >

                <Card className="h-[560px] overflow-hidden rounded-2xl shadow-sm">

                  <CardHeader>

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50">

                        <Sparkles className="h-5 w-5" />

                      </div>


                      <div>

                        <CardTitle>
                          Match &amp; Risk Analysis
                        </CardTitle>

                        <CardDescription>
                          How this report scores against the production plan
                        </CardDescription>

                      </div>

                    </div>

                  </CardHeader>


                  <Separator />


                  <ScrollArea className="h-[475px]">

                    <CardContent className="space-y-4 pt-6">


                      {result.assessment ? (
                        <>
                          <SuggestionCard
                            icon={<Sparkles className="h-4 w-4" />}
                            title={`Risk: ${result.assessment.risk_level} (${result.assessment.risk_score}/100)`}
                            description={
                              result.assessment.deviations.length
                                ? `${result.assessment.deviations.length} deviation(s) from the production plan.`
                                : "No deviations from the production plan."
                            }
                          />

                          {result.assessment.deviations.map((d) => (
                            <Alert key={d.type} variant={d.severity === "high" ? "destructive" : undefined}>
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle className="capitalize">{d.type.replace("_", " ")} · {d.severity}</AlertTitle>
                              <AlertDescription>{d.message}</AlertDescription>
                            </Alert>
                          ))}

                          {result.assessment.recommendations.map((r) => (
                            <SuggestionCard
                              key={r}
                              icon={<Lightbulb className="h-4 w-4" />}
                              title="Recommended action"
                              description={r}
                            />
                          ))}
                        </>
                      ) : (
                        <SuggestionCard
                          icon={<Search className="h-4 w-4" />}
                          title="No assessment"
                          description="A report can only be scored against the plan once it is matched to a work order."
                        />
                      )}

                      {result.match.notes.map((n) => (
                        <SuggestionCard
                          key={n}
                          icon={<Search className="h-4 w-4" />}
                          title="Needs review"
                          description={n}
                        />
                      ))}

                      {result.match.candidates.length > 1 && (
                        <ReportSection
                          title="Other candidates"
                          items={result.match.candidates.slice(1).map((c) => [
                            c.work_order.id,
                            `${Math.round(c.confidence * 100)}%`,
                          ])}
                        />
                      )}

                    </CardContent>

                  </ScrollArea>

                </Card>

              </motion.div>

            )}

          </AnimatePresence>

        </div>


        {/* FOOTER */}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Matches and risk flags are AI-generated — verify against the original report before acting on them.
        </p>

      </div>

    </main>
  )
}


function MatchBadge({ match }) {
  const pct = Math.round(match.confidence * 100)
  if (match.status === "matched") {
    return (
      <Badge variant="secondary">
        <CircleCheck className="mr-1 h-3 w-3" />
        Matched · {pct}%
      </Badge>
    )
  }
  return (
    <Badge variant="outline">
      <AlertTriangle className="mr-1 h-3 w-3" />
      {match.status === "review" ? "Needs review" : "No match"} · {pct}%
    </Badge>
  )
}


/* ============================================================= */
/* REPORT SECTION */
/* ============================================================= */

function ReportSection({ title, items, content }) {
  return (
    <section>

      <h3 className="mb-3 text-sm font-semibold">
        {title}
      </h3>


      {items ? (

        <div className="space-y-2 rounded-xl border p-4">

          {items.map(([label, value]) => (

            <div
              key={label}
              className="flex justify-between gap-4 text-sm"
            >

              <span className="text-muted-foreground">
                {label}
              </span>

              <span className="text-right font-medium">
                {value}
              </span>

            </div>

          ))}

        </div>

      ) : (

        <p className="rounded-xl border p-4 text-sm leading-6 text-muted-foreground">
          {content}
        </p>

      )}

    </section>
  )
}


/* ============================================================= */
/* AI SUGGESTION */
/* ============================================================= */

function SuggestionCard({ icon, title, description }) {
  return (
    <div className="rounded-xl border p-4 transition hover:bg-muted/30">

      <div className="flex gap-3">

        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">

          {icon}

        </div>


        <div>

          <h3 className="text-sm font-semibold">
            {title}
          </h3>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>

        </div>

      </div>

    </div>
  )
}


export default App