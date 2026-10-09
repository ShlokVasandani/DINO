// Full class strings (not interpolated) so Tailwind can see them.
export const FIELDS = {
  work_order: { label: "Work order", mark: "bg-amber-400/20 text-amber-100 ring-amber-400/60", dot: "bg-amber-400" },
  part_number: { label: "Part", mark: "bg-sky-400/20 text-sky-100 ring-sky-400/60", dot: "bg-sky-400" },
  line: { label: "Line", mark: "bg-violet-400/20 text-violet-100 ring-violet-400/60", dot: "bg-violet-400" },
  date: { label: "Date", mark: "bg-emerald-400/20 text-emerald-100 ring-emerald-400/60", dot: "bg-emerald-400" },
  shift: { label: "Shift", mark: "bg-teal-400/20 text-teal-100 ring-teal-400/60", dot: "bg-teal-400" },
  produced: { label: "Produced", mark: "bg-lime-400/20 text-lime-100 ring-lime-400/60", dot: "bg-lime-400" },
  rejected: { label: "Rejected", mark: "bg-orange-400/20 text-orange-100 ring-orange-400/60", dot: "bg-orange-400" },
  downtime_min: { label: "Downtime", mark: "bg-rose-400/20 text-rose-100 ring-rose-400/60", dot: "bg-rose-400" },
  downtime_cause: { label: "Cause", mark: "bg-pink-400/20 text-pink-100 ring-pink-400/60", dot: "bg-pink-400" },
}

export const STATUS = {
  matched: { label: "Matched", chip: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40", ring: "#34d399" },
  review: { label: "Needs review", chip: "bg-amber-500/15 text-amber-300 ring-amber-500/40", ring: "#fbbf24" },
  unmatched: { label: "No match", chip: "bg-zinc-500/15 text-zinc-300 ring-zinc-500/40", ring: "#a1a1aa" },
}

export const RISK = {
  low: { label: "Low", color: "#34d399" },
  medium: { label: "Medium", color: "#fbbf24" },
  high: { label: "High", color: "#f87171" },
}
