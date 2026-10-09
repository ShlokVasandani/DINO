import { motion } from "framer-motion"
import { RISK } from "@/lib/fields"
import { Dial } from "./Verdict"

function Bar({ label, value, shown, fill, marker, bad }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={`font-medium tabular-nums ${bad ? "text-rose-300" : "text-zinc-200"}`}>{shown}</span>
      </div>
      <div className="relative h-2.5 rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full rounded-full ${bad ? "bg-rose-400" : "bg-emerald-400"}`}
          data-value={value}
        />
        <div className="absolute -top-1 h-4.5 w-px bg-zinc-300/70" style={{ left: `${marker}%` }} title="Plan / allowance" />
      </div>
    </div>
  )
}

export default function Gauges({ a }) {
  const risk = RISK[a.risk_level]
  const rejectBad = a.reject_pct != null && a.reject_pct > a.reject_allowance_pct
  const downBad = a.downtime_min != null && a.downtime_min > a.downtime_allowance_min
  return (
    <div className="flex items-center gap-5">
      <Dial value={a.risk_score} color={risk.color} label={`${risk.label} risk`} size={116} />
      <div className="flex-1 space-y-4">
        {a.produced != null && (
          <Bar
            label="Output vs plan"
            shown={`${a.produced.toLocaleString("en-IN")} / ${a.planned.toLocaleString("en-IN")}`}
            fill={(a.produced / a.planned) * 100 * (100 / 120)}
            marker={100 * (100 / 120)}
            bad={a.shortfall_pct >= 5}
          />
        )}
        {a.reject_pct != null && (
          <Bar
            label="Reject rate"
            shown={`${a.reject_pct}% (max ${a.reject_allowance_pct}%)`}
            fill={(a.reject_pct / (a.reject_allowance_pct * 2)) * 100}
            marker={50}
            bad={rejectBad}
          />
        )}
        {a.downtime_min != null && (
          <Bar
            label="Downtime"
            shown={`${a.downtime_min} min (max ${a.downtime_allowance_min})`}
            fill={(a.downtime_min / (a.downtime_allowance_min * 2)) * 100}
            marker={50}
            bad={downBad}
          />
        )}
      </div>
    </div>
  )
}
