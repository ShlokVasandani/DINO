import { motion } from "framer-motion"
import { FIELDS } from "@/lib/fields"

/** Split text into plain and highlighted segments, dropping overlapping spans. */
function segments(text, spans) {
  const hits = Object.entries(spans)
    .map(([field, [start, end]]) => ({ field, start, end }))
    .sort((a, b) => a.start - b.start)
  const out = []
  let cursor = 0
  for (const h of hits) {
    if (h.start < cursor) continue
    if (h.start > cursor) out.push({ text: text.slice(cursor, h.start) })
    out.push({ text: text.slice(h.start, h.end), field: h.field })
    cursor = h.end
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor) })
  return out
}

export default function XRay({ text, spans, extracted }) {
  const parts = segments(text, spans)
  let n = 0
  const missing = Object.keys(FIELDS).filter((f) => extracted[f] == null && f !== "downtime_cause")

  return (
    <div>
      <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-black/40 p-5 font-mono text-[13px] leading-8 text-zinc-300">
        {parts.map((p, i) =>
          p.field ? (
            <motion.mark
              key={`${text.length}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + n++ * 0.09, duration: 0.3 }}
              className={`rounded-md px-1.5 py-0.5 ring-1 ${FIELDS[p.field].mark}`}
            >
              {p.text}
              <sup className="ml-1 font-sans text-[9px] font-semibold uppercase tracking-wider opacity-80">
                {FIELDS[p.field].label}
              </sup>
            </motion.mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500">Not found in report:</span>
        {missing.length === 0 && <span className="text-emerald-400">nothing, every field was located</span>}
        {missing.map((f) => (
          <span key={f} className="rounded-md border border-dashed border-zinc-600 px-2 py-0.5 text-zinc-400">
            {FIELDS[f].label}
          </span>
        ))}
      </div>
    </div>
  )
}
