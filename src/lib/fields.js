// Identifiers are underlined, quantities highlighted, the downtime cause italic.
export const FIELDS = {
  work_order: { label: "Work order", group: "id" },
  part_number: { label: "Part number", group: "id" },
  line: { label: "Line", group: "id" },
  date: { label: "Date", group: "id" },
  shift: { label: "Shift", group: "id" },
  produced: { label: "Produced", group: "qty" },
  rejected: { label: "Rejected", group: "qty" },
  downtime_min: { label: "Downtime", group: "qty" },
  downtime_cause: { label: "Cause", group: "cause" },
}

export const MARK_CLASS = { id: "mark-id", qty: "mark-qty", cause: "mark-cause" }

export const STATUS = {
  matched: { label: "Matched", color: "var(--ok)" },
  review: { label: "Needs review", color: "var(--warn)" },
  unmatched: { label: "No match", color: "var(--muted-foreground)" },
}

export const RISK = {
  low: { label: "Low", color: "var(--ok)" },
  medium: { label: "Medium", color: "var(--warn)" },
  high: { label: "High", color: "var(--bad)" },
}

export const formatValue = (field, v) => {
  if (v == null) return null
  if (field === "line") return `Line ${v}`
  if (field === "downtime_min") return `${v} min`
  if (field === "produced" || field === "rejected") return v.toLocaleString("en-IN")
  return String(v)
}
