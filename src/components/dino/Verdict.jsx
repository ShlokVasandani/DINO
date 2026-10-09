import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { useEffect } from "react"
import { STATUS } from "@/lib/fields"

export function Dial({ value, color, size = 132, label }) {
  const r = (size - 14) / 2
  const c = 2 * Math.PI * r
  const mv = useMotionValue(0)
  const dash = useTransform(mv, (v) => `${(c * v) / 100} ${c}`)
  const text = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, value, { duration: 1.1, ease: [0.22, 1, 0.36, 1] })
    return controls.stop
  }, [value, mv])

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          style={{ strokeDasharray: dash, filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span className="text-3xl font-bold tabular-nums">{text}</motion.span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</span>
      </div>
    </div>
  )
}

export default function Verdict({ match }) {
  const s = STATUS[match.status]
  const wo = match.work_order
  return (
    <div className="flex items-center gap-5">
      <Dial value={Math.round(match.confidence * 100)} color={s.ring} label="% match" />
      <div className="min-w-0">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${s.chip}`}>{s.label}</span>
        {wo ? (
          <>
            <p className="mt-2 text-2xl font-bold tracking-tight">{wo.id}</p>
            <p className="truncate text-sm text-zinc-400">{wo.part_number} · {wo.part_name}</p>
            <p className="text-xs text-zinc-500">Line {wo.line} · {wo.date} · shift {wo.shift}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-zinc-400">No work order fits well enough. Check the part, line and date.</p>
        )}
      </div>
    </div>
  )
}
