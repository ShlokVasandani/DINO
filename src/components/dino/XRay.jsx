import { FIELDS, MARK_CLASS } from "@/lib/fields"

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

export default function XRay({ text, spans, hover, onHover }) {
  return (
    <pre className="whitespace-pre-wrap rounded-md border bg-card p-5 font-mono text-[13px] leading-7">
      {segments(text, spans).map((p, i) =>
        p.field ? (
          <mark
            key={i}
            title={FIELDS[p.field].label}
            onMouseEnter={() => onHover(p.field)}
            onMouseLeave={() => onHover(null)}
            className={`${MARK_CLASS[FIELDS[p.field].group]} ${hover === p.field ? "mark-active" : ""}`}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </pre>
  )
}
