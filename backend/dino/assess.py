"""Score a matched report against the production plan."""
from __future__ import annotations


def assess(fields: dict, wo: dict) -> dict:
    planned = wo["planned_qty"]
    produced, rejected = fields.get("produced"), fields.get("rejected")
    downtime = fields.get("downtime_min")
    cause = fields.get("downtime_cause")
    deviations: list[dict] = []
    actions: list[str] = []
    risk = 0

    shortfall = planned - produced if produced is not None else None
    shortfall_pct = round(100 * shortfall / planned, 1) if shortfall is not None else None
    reject_pct = round(100 * rejected / produced, 1) if produced and rejected is not None else None

    if produced is None:
        deviations.append({"type": "missing_qty", "severity": "medium",
                           "message": "No produced quantity was found in the report."})
        risk += 15
    elif shortfall_pct >= 5:
        sev, pts = ("high", 40) if shortfall_pct >= 15 else ("medium", 20)
        deviations.append({"type": "shortfall", "severity": sev,
                           "message": f"Output is {shortfall} units ({shortfall_pct}%) below the plan of {planned} for {wo['id']}."})
        actions.append(f"Reschedule the remaining {shortfall} units into the next shift on Line {wo['line']}, or flag {wo['id']} for partial completion.")
        risk += pts
    elif shortfall_pct <= -10:
        deviations.append({"type": "overproduction", "severity": "low",
                           "message": f"Output is {-shortfall} units ({-shortfall_pct}%) above plan."})
        risk += 5

    if reject_pct is not None and reject_pct > wo["max_reject_pct"]:
        high = reject_pct > 2 * wo["max_reject_pct"]
        deviations.append({"type": "rejects", "severity": "high" if high else "medium",
                           "message": f"Reject rate {reject_pct}% exceeds the {wo['max_reject_pct']}% allowance ({rejected} units)."})
        actions.append("Hold the rejected lot for inspection and check the process settings before the next run.")
        risk += 30 if high else 15

    if downtime is not None and downtime > wo["max_downtime_min"]:
        high = downtime > 1.5 * wo["max_downtime_min"]
        why = f" Notes attribute it to {cause}." if cause else ""
        deviations.append({"type": "downtime", "severity": "high" if high else "medium",
                           "message": f"Downtime of {downtime} min exceeds the {wo['max_downtime_min']} min allowance.{why}"})
        if cause == "changeover":
            actions.append("Review changeover practice on this line; consider pre-staging tooling to cut setup time.")
        elif cause == "breakdown":
            actions.append("Raise a maintenance ticket for the line and check for repeat failures.")
        risk += 30 if high else 15

    risk = min(100, risk)
    level = "high" if risk >= 50 else "medium" if risk >= 20 else "low"
    return {
        "planned": planned, "produced": produced, "rejected": rejected,
        "good": produced - rejected if produced is not None and rejected is not None else None,
        "shortfall": shortfall, "shortfall_pct": shortfall_pct, "reject_pct": reject_pct,
        "downtime_min": downtime, "downtime_allowance_min": wo["max_downtime_min"],
        "deviations": deviations, "recommendations": actions,
        "risk_score": risk, "risk_level": level,
    }
