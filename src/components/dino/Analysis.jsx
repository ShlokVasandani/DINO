import { AlertTriangle } from "lucide-react"
import { FIELDS, RISK, STATUS, formatValue } from "@/lib/fields"

const EVIDENCE = [["work_order", "WO"], ["part_number", "Part"], ["line", "Line"], ["date", "Date"], ["shift", "Shift"]]

export function Section({ title, aside, children }) {
  return (
    <section className="border-t py-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <span className="text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function Square({ v }) {
  const style = v == null ? "border border-border" : ""
  const color = v == null ? undefined : v >= 1 ? "var(--ok)" : v > 0 ? "var(--warn)" : "var(--bad)"
  const word = v == null ? "not in report" : v >= 1 ? "match" : v > 0 ? "near miss" : "mismatch"
  return <span title={word} className={`inline-block h-3 w-3 rounded-[2px] ${style}`} style={{ background: color }} />
}

function Bar({ label, value, fill, marker, color }) {
  return (
    <div className="py-1.5">
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, fill))}%`, background: color }} />
        <div className="absolute -top-0.5 h-2.5 w-px bg-foreground/60" style={{ left: `${marker}%` }} />
      </div>
    </div>
  )
}

export default function Analysis({ result, hover, onHover }) {
  const { match, assessment: a, extracted } = result
  const wo = match.work_order
  const status = STATUS[match.status]
  const pct = Math.round(match.confidence * 100)

  return (
    <div>
      <Section title="Match">
        {wo ? (
          <>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">{wo.id}</p>
            <p className="text-sm text-muted-foreground">{wo.part_number} · {wo.part_name}</p>
            <p className="text-sm text-muted-foreground">Line {wo.line} · {wo.date} · shift {wo.shift}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No work order fits well enough. Check the part number, line and date.</p>
        )}
        <p className="mt-3 text-sm">
          <span className="font-medium" style={{ color: status.color }}>{status.label}</span>
          <span className="text-muted-foreground"> · {pct}% confidence</span>
        </p>
        {match.notes.map((n) => (
          <p key={n} className="mt-2 flex gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--warn)" }} />
            {n}
          </p>
        ))}
      </Section>

      <Section title="Extracted" aside="hover to locate">
        <dl className="text-sm">
          {Object.entries(FIELDS).map(([field, { label }]) => {
            const v = formatValue(field, extracted[field])
            return (
              <div
                key={field}
                onMouseEnter={() => v && onHover(field)}
                onMouseLeave={() => onHover(null)}
                className={`flex justify-between rounded px-2 py-1 ${hover === field ? "bg-muted" : ""}`}
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className={v ? "font-mono text-[13px]" : "text-muted-foreground/60"}>{v ?? "not found"}</dd>
              </div>
            )
          })}
        </dl>
      </Section>

      <Section title="Why this work order" aside="evidence per field">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="pb-2 font-normal" />
              {EVIDENCE.map(([, l]) => <th key={l} className="pb-2 text-center font-normal">{l}</th>)}
              <th className="pb-2 text-right font-normal">Score</th>
            </tr>
          </thead>
          <tbody>
            {match.candidates.map((c, i) => (
              <tr key={c.work_order.id} className="border-t">
                <td className={`py-2 tabular-nums ${i === 0 ? "font-semibold" : "text-muted-foreground"}`}>{c.work_order.id}</td>
                {EVIDENCE.map(([f]) => <td key={f} className="py-2 text-center"><Square v={c.field_scores[f]} /></td>)}
                <td className="py-2 text-right tabular-nums">{Math.round(c.confidence * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-muted-foreground">
          Green: match. Amber: near miss. Red: mismatch. Outline: not in the report.
        </p>
      </Section>

      {a && (
        <Section title="Against the plan">
          {a.produced != null && (
            <Bar
              label="Output"
              value={`${a.produced.toLocaleString("en-IN")} of ${a.planned.toLocaleString("en-IN")}`}
              fill={(a.produced / a.planned) * (100 / 1.2)}
              marker={100 / 1.2}
              color={a.shortfall_pct >= 5 ? "var(--bad)" : "var(--ok)"}
            />
          )}
          {a.reject_pct != null && (
            <Bar
              label="Rejects"
              value={`${a.reject_pct}% (max ${a.reject_allowance_pct}%)`}
              fill={(a.reject_pct / (a.reject_allowance_pct * 2)) * 100}
              marker={50}
              color={a.reject_pct > a.reject_allowance_pct ? "var(--bad)" : "var(--ok)"}
            />
          )}
          {a.downtime_min != null && (
            <Bar
              label="Downtime"
              value={`${a.downtime_min} min (max ${a.downtime_allowance_min})`}
              fill={(a.downtime_min / (a.downtime_allowance_min * 2)) * 100}
              marker={50}
              color={a.downtime_min > a.downtime_allowance_min ? "var(--bad)" : "var(--ok)"}
            />
          )}
          <p className="mt-3 text-sm">
            <span className="text-muted-foreground">Risk </span>
            <span className="font-medium tabular-nums" style={{ color: RISK[a.risk_level].color }}>
              {a.risk_score}/100, {RISK[a.risk_level].label.toLowerCase()}
            </span>
          </p>
          {a.deviations.length > 0 && (
            <ul className="mt-3 space-y-2 text-sm">
              {a.deviations.map((d) => (
                <li key={d.type}>
                  <span className="font-medium" style={{ color: d.severity === "high" ? "var(--bad)" : "var(--warn)" }}>
                    {d.type.replace("_", " ")}
                  </span>{" "}
                  {d.message}
                </li>
              ))}
            </ul>
          )}
          {a.recommendations.length > 0 && (
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-foreground">
              {a.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ol>
          )}
        </Section>
      )}
    </div>
  )
}
