import demo from "@/demo-data.json"

export const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000"

/** Resolve whether a live backend answers; otherwise fall back to the bundled snapshot. */
export async function detectMode() {
  try {
    const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok ? "live" : "demo"
  } catch {
    return "demo"
  }
}

export async function loadSamples(mode) {
  if (mode === "demo") return demo.samples
  const res = await fetch(`${API}/api/samples`)
  return res.json()
}

export async function loadWorkOrders(mode) {
  if (mode === "demo") return demo.workOrders
  const res = await fetch(`${API}/api/work-orders`)
  return res.json()
}

async function post(body) {
  const res = await fetch(`${API}/api/process`, { method: "POST", body })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail.detail || `Request failed (${res.status})`)
  }
  return res.json()
}

export async function processText(mode, text, sampleId) {
  if (mode === "demo") {
    const hit = sampleId && demo.results[sampleId]
    if (!hit) throw new Error("Demo snapshot: only the bundled samples can be analysed. Run the backend to analyse your own reports.")
    await new Promise((r) => setTimeout(r, 350))
    return hit
  }
  const body = new FormData()
  body.append("text", text)
  return post(body)
}

export async function processFile(file) {
  const body = new FormData()
  body.append("file", file)
  return post(body)
}
