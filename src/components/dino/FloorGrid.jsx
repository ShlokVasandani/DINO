import { motion } from "framer-motion"

const fmtSlot = (date, shift) =>
  `${new Date(`${date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} · ${shift}`

/** Plan board: lines × (date, shift) slots. The matched work order glows; other candidates are ringed with their score. */
export default function FloorGrid({ workOrders, match }) {
  const slots = [...new Set(workOrders.map((w) => `${w.date}|${w.shift}`))].sort()
  const lines = [...new Set(workOrders.map((w) => w.line))].sort((a, b) => a - b)
  const scores = Object.fromEntries((match?.candidates ?? []).map((c) => [c.work_order.id, c.confidence]))
  const winner = match?.work_order?.id

  return (
    <div className="max-lg:overflow-x-auto">
      <div
        className="grid gap-2 max-lg:min-w-[560px]"
        style={{ gridTemplateColumns: `64px repeat(${slots.length}, minmax(0, 1fr))` }}
      >
        <div />
        {slots.map((s) => (
          <div key={s} className="text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            {fmtSlot(...s.split("|"))}
          </div>
        ))}

        {lines.map((line) => (
          <div key={line} className="contents">
            <div className="flex items-center text-xs font-semibold text-zinc-400">Line {line}</div>
            {slots.map((s) => {
              const [date, shift] = s.split("|")
              const wo = workOrders.find((w) => w.line === line && w.date === date && w.shift === shift)
              if (!wo) return <div key={s} className="h-14 rounded-lg border border-dashed border-white/5" />
              const isWinner = wo.id === winner
              const score = scores[wo.id]
              return (
                <motion.div
                  key={s}
                  layout
                  animate={{ scale: isWinner ? 1.04 : 1 }}
                  title={`${wo.id} · ${wo.part_name} · plan ${wo.planned_qty}`}
                  className={`flex h-14 flex-col justify-center rounded-lg border px-2.5 text-xs transition-colors ${
                    isWinner
                      ? "border-amber-400 bg-amber-400/15 shadow-[0_0_24px_-4px_rgba(251,191,36,0.6)]"
                      : score
                        ? "border-sky-400/50 bg-sky-400/5"
                        : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  <span className={`font-semibold ${isWinner ? "text-amber-200" : "text-zinc-300"}`}>{wo.id}</span>
                  <span className="truncate text-[10px] text-zinc-500">{wo.part_number}</span>
                  {score != null && (
                    <span className={`text-[10px] font-medium ${isWinner ? "text-amber-300" : "text-sky-300"}`}>
                      {Math.round(score * 100)}%
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
