const slotLabel = (date, shift) =>
  `${new Date(`${date}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${shift}`

/** Lines × (date, shift) slots. The matched work order is filled; other candidates show their score. */
export default function PlanBoard({ workOrders, match }) {
  const slots = [...new Set(workOrders.map((w) => `${w.date}|${w.shift}`))].sort()
  const lines = [...new Set(workOrders.map((w) => w.line))].sort((a, b) => a - b)
  const scores = Object.fromEntries((match?.candidates ?? []).map((c) => [c.work_order.id, c.confidence]))
  const winner = match?.work_order?.id

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-xs">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="w-16 py-2 pr-3 font-normal" />
            {slots.map((s) => (
              <th key={s} className="py-2 pr-3 font-normal tabular-nums">{slotLabel(...s.split("|"))}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line} className="border-t">
              <th className="py-2 pr-3 text-left font-normal text-muted-foreground">Line {line}</th>
              {slots.map((s) => {
                const [date, shift] = s.split("|")
                const wo = workOrders.find((w) => w.line === line && w.date === date && w.shift === shift)
                if (!wo) return <td key={s} className="py-2 pr-3 text-muted-foreground/40">·</td>
                const isWinner = wo.id === winner
                const score = scores[wo.id]
                return (
                  <td key={s} className="py-1.5 pr-2">
                    <div
                      title={`${wo.part_name}, plan ${wo.planned_qty}`}
                      className={`rounded px-2 py-1.5 ${isWinner ? "bg-[var(--accent-ink)] text-background" : score ? "border border-[var(--accent-ink)]" : "bg-muted"}`}
                    >
                      <span className="font-medium tabular-nums">{wo.id}</span>
                      <span className="block font-mono text-[10px] opacity-70">{wo.part_number}</span>
                      {score != null && <span className="text-[10px] tabular-nums">{Math.round(score * 100)}%</span>}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
