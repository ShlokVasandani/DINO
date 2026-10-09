import { motion } from "framer-motion"

const LABELS = { work_order: "WO", part_number: "Part", line: "Line", date: "Date", shift: "Shift" }

/** Per-field evidence for each candidate work order: why one beat the others. */
export default function MatchRace({ candidates }) {
  return (
    <div className="space-y-4">
      {candidates.map((c, i) => (
        <div key={c.work_order.id}>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className={`text-sm font-semibold ${i === 0 ? "text-amber-200" : "text-zinc-300"}`}>
              {c.work_order.id}
              <span className="ml-2 text-xs font-normal text-zinc-500">{c.work_order.part_number} · L{c.work_order.line} · {c.work_order.shift}</span>
            </span>
            <span className="text-sm font-bold tabular-nums">{Math.round(c.confidence * 100)}%</span>
          </div>
          <div className="flex gap-1">
            {Object.entries(LABELS).map(([field, label]) => {
              const v = c.field_scores[field]
              return (
                <div key={field} className="flex-1" title={v == null ? `${label}: not in report` : `${label}: ${Math.round(v * 100)}%`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    {v != null && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${v * 100}%` }}
                        transition={{ delay: 0.1 + i * 0.12, duration: 0.7 }}
                        className={`h-full ${v >= 1 ? "bg-emerald-400" : v > 0 ? "bg-amber-400" : "bg-rose-500"}`}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-center text-[9px] uppercase tracking-wider text-zinc-600">{label}</p>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
