"""Build printable room schedules from programme.js (not for the website)."""
from __future__ import annotations

import re
from collections import defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "print" / "room-schedules"
PROGRAMME = ROOT / "js" / "programme.js"

WEEKDAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
]
MONTHS = [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
]


def unquote(value: str) -> str:
    value = value.strip()
    if value.startswith('"') and value.endswith('"'):
        value = value[1:-1]
    return (
        value.replace(r"\"", '"')
        .replace(r"\\", "\\")
        .replace(r"\n", "\n")
    )


def parse_string_field(block: str, key: str) -> str:
    m = re.search(
        rf'{key}:\s*((?:"(?:\\.|[^"\\])*")|(?:\n\s*"(?:\\.|[^"\\])*"))',
        block,
    )
    if not m:
        return ""
    raw = m.group(1).strip()
    if raw.startswith('"'):
        return unquote(raw)
    inner = re.search(r'"(?:\\.|[^"\\])*"', raw)
    return unquote(inner.group(0)) if inner else ""


def extract_bracket_array(block: str, key: str) -> str:
    """Return contents inside key: [ ... ] with nested brackets respected."""
    token = f"{key}:"
    start = block.find(token)
    if start < 0:
        return ""
    i = block.find("[", start)
    if i < 0:
        return ""
    depth = 0
    for j in range(i, len(block)):
        ch = block[j]
        if ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return block[i + 1 : j]
    return ""


def parse_string_array(block: str, key: str) -> list[str]:
    body = extract_bracket_array(block, key)
    if not body:
        return []
    return re.findall(r'"((?:\\.|[^"\\])*)"', body)


def parse_people(js: str) -> dict[str, str]:
    people = {}
    body = extract_bracket_array(js, "people")
    if not body:
        return people
    for block in re.split(r"(?=\n\s*\{\s*\n)", "\n" + body):
        pid = parse_string_field(block, "id")
        name = parse_string_field(block, "name")
        if pid and name:
            people[pid] = name
    return people


def parse_talks(block: str) -> list[dict]:
    body = extract_bracket_array(block, "talks")
    if not body:
        return []
    talks = []
    for tblock in re.split(r"(?=\n\s*\{\s*\n)", "\n" + body):
        title = parse_string_field(tblock, "title")
        if not title and "title:" in tblock:
            tm = re.search(r'title:\s*\n\s*"((?:\\.|[^"\\])*)"', tblock)
            if tm:
                title = tm.group(1).replace(r"\"", '"')
        start = parse_string_field(tblock, "start")
        end = parse_string_field(tblock, "end")
        if not title or not start:
            continue
        talks.append(
            {
                "title": title,
                "start": start,
                "end": end,
                "people": parse_string_array(tblock, "people"),
            }
        )
    return talks


def parse_sessions(js: str) -> list[dict]:
    m = re.search(r"sessions:\s*\[([\s\S]*)\]\s*,\s*\n\}\s*;\s*$", js)
    if not m:
        raise SystemExit("sessions array not found")
    body = m.group(1)
    sessions = []
    # Split only on top-level session objects (not nested talk objects).
    chunks = re.split(r"(?=\n    \{\n      id: \")", "\n" + body)
    for chunk in chunks:
        sid = parse_string_field(chunk, "id")
        if not sid or not (sid.startswith("d1-") or sid.startswith("d2-")):
            continue
        title = parse_string_field(chunk, "title")
        if not title:
            tm = re.search(r'title:\s*\n\s*"((?:\\.|[^"\\])*)"', chunk)
            if tm:
                title = tm.group(1).replace(r"\"", '"')
        workshop = parse_string_field(chunk, "workshop")
        sessions.append(
            {
                "id": sid,
                "title": title,
                "code": parse_string_field(chunk, "code"),
                "type": parse_string_field(chunk, "type"),
                "workshop": workshop,
                "date": parse_string_field(chunk, "date"),
                "start": parse_string_field(chunk, "start"),
                "end": parse_string_field(chunk, "end"),
                "room": parse_string_field(chunk, "room"),
                "capacity": parse_string_field(chunk, "capacity"),
                "people": parse_string_array(chunk, "people"),
                "talks": parse_talks(chunk),
            }
        )
    return sessions


def format_date(iso: str) -> str:
    y, m, d = map(int, iso.split("-"))
    dt = date(y, m, d)
    return f"{WEEKDAYS[dt.weekday()]} {d} {MONTHS[m]} {y}"


def format_time(value: str) -> str:
    h, mi = map(int, value.split(":"))
    suffix = "am" if h < 12 else "pm"
    h12 = h % 12 or 12
    return f"{h12}:{mi:02d} {suffix}"


def room_slug(room: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", room.lower()).strip("-")


def build_rows(sessions: list[dict], people: dict[str, str]) -> dict[str, list[dict]]:
    by_room: dict[str, list[dict]] = defaultdict(list)
    for session in sessions:
        room = (session.get("room") or "").strip()
        if not room:
            continue
        if session.get("talks"):
            for talk in session["talks"]:
                leads = ", ".join(
                    people[pid] for pid in talk.get("people") or [] if pid in people
                )
                by_room[room].append(
                    {
                        "date": session["date"],
                        "date_label": format_date(session["date"]),
                        "start": talk["start"],
                        "time_label": f"{format_time(talk['start'])} – {format_time(talk['end'])}",
                        "title": talk["title"],
                        "code": "",
                        "leads": leads,
                        "capacity": "",
                    }
                )
            continue

        leads = ", ".join(
            people[pid] for pid in session.get("people") or [] if pid in people
        )
        by_room[room].append(
            {
                "date": session["date"],
                "date_label": format_date(session["date"]),
                "start": session["start"],
                "time_label": f"{format_time(session['start'])} – {format_time(session['end'])}",
                "title": session.get("workshop") or session.get("title") or "",
                "code": session.get("code") or "",
                "leads": leads,
                "capacity": session.get("capacity") or "",
            }
        )

    for room in by_room:
        by_room[room].sort(key=lambda r: (r["date"], r["start"], r["title"]))
    return by_room


CSS = """
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  color: #1c2418;
  background: #fff;
}
.sheet {
  page-break-after: always;
  min-height: 100vh;
  padding: 0.5rem 0 1rem;
}
.sheet:last-child { page-break-after: auto; }
.banner {
  display: grid;
  grid-template-columns: 5.5rem minmax(0, 1fr);
  gap: 0.9rem 1rem;
  align-items: center;
  border-bottom: 3px solid #2f5d3a;
  padding-bottom: 0.85rem;
  margin-bottom: 1rem;
}
.banner-logo {
  width: 5.5rem;
  height: auto;
  display: block;
}
.banner-copy {
  min-width: 0;
}
.conference-name {
  margin: 0;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.15;
  color: #1c2418;
}
.theme {
  margin: 0.3rem 0 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.88rem;
  line-height: 1.35;
  color: #2f5d3a;
  font-weight: 650;
}
.meta {
  margin: 0.35rem 0 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.84rem;
  color: #445;
}
.room-label {
  margin: 0.7rem 0 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #2f5d3a;
  font-weight: 700;
}
h1 {
  margin: 0.15rem 0 0;
  font-size: 1.75rem;
  line-height: 1.15;
}
.day-heading {
  margin: 1.25rem 0 0.55rem;
  font-size: 1.15rem;
  color: #2f5d3a;
  border-bottom: 1px solid #c9d4c4;
  padding-bottom: 0.25rem;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}
th, td {
  text-align: left;
  vertical-align: top;
  padding: 0.55rem 0.45rem;
  border-bottom: 1px solid #ddd6c8;
}
th {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #2f5d3a;
}
td.time {
  width: 7.5rem;
  white-space: nowrap;
  font-family: Arial, Helvetica, sans-serif;
  font-weight: 700;
  color: #2f5d3a;
}
.title { font-weight: 700; }
.sub {
  margin-top: 0.2rem;
  font-size: 0.88rem;
  color: #445;
  font-family: Arial, Helvetica, sans-serif;
}
.footer-note {
  margin-top: 1.4rem;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 0.8rem;
  color: #666;
}
@media print {
  .no-print { display: none !important; }
}
.no-print {
  font-family: Arial, Helvetica, sans-serif;
  background: #f4f1ea;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border: 1px solid #ddd6c8;
}
"""


def render_room_html(room: str, rows: list[dict]) -> str:
    by_day: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        by_day[row["date_label"]].append(row)

    parts = [
        f'<section class="sheet" id="{room_slug(room)}">',
        '<div class="banner">',
        '<img class="banner-logo" src="wilde-logo.png" alt="WILDE" width="176" height="123" />',
        '<div class="banner-copy">',
        '<p class="conference-name">WILDE Student Conference 2026</p>',
        '<p class="theme">Interdisciplinary Research for Himalayan Landscapes, Ecologies, and Communities</p>',
        '<p class="meta">17–18 November 2026 · G.B. Pant Memorial Govt. College, Rampur Bushahr</p>',
        '<p class="room-label">Room schedule</p>',
        f"<h1>{escape(room)}</h1>",
        "</div></div>",
    ]
    for day_label, day_rows in by_day.items():
        parts.append(f'<h2 class="day-heading">{escape(day_label)}</h2>')
        parts.append("<table><thead><tr><th>Time</th><th>Session</th></tr></thead><tbody>")
        for row in day_rows:
            bits = []
            if row["code"]:
                bits.append(row["code"])
            if row["leads"]:
                bits.append(row["leads"])
            if row["capacity"]:
                bits.append(f"Capacity: {row['capacity']} students")
            sub = (
                f'<div class="sub">{escape(" · ".join(bits))}</div>' if bits else ""
            )
            parts.append(
                "<tr>"
                f'<td class="time">{escape(row["time_label"])}</td>'
                f'<td><div class="title">{escape(row["title"])}</div>{sub}</td>'
                "</tr>"
            )
        parts.append("</tbody></table>")
    parts.append(
        '<p class="footer-note">Read down the list for what comes next in this room. Please leave the space ready for the following session.</p>'
    )
    parts.append("</section>")
    return "\n".join(parts)


def escape(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def main() -> None:
    js = PROGRAMME.read_text(encoding="utf-8")
    people = parse_people(js)
    sessions = parse_sessions(js)
    by_room = build_rows(sessions, people)
    if not by_room:
        raise SystemExit("No room sessions found")

    OUT.mkdir(parents=True, exist_ok=True)
    logo_src = ROOT / "assets" / "wilde-logo.png"
    logo_dest = OUT / "wilde-logo.png"
    if logo_src.exists():
        logo_dest.write_bytes(logo_src.read_bytes())
    preferred = [
        "Auditorium",
        "Conference Hall",
        "BCA Computer Lab",
        "LH-35",
        "LH-42",
    ]
    rooms = [r for r in preferred if r in by_room] + [
        r for r in sorted(by_room) if r not in preferred
    ]

    index_parts = [
        "<!DOCTYPE html>",
        '<html lang="en"><head><meta charset="utf-8" />',
        "<title>WILDE 2026 · Room schedules for printing</title>",
        f"<style>{CSS}</style></head><body>",
        '<p class="no-print"><strong>Print tip:</strong> Ctrl+P / Cmd+P. Print all pages, then stick each page on that room door. Or open a single room file below.</p>',
    ]

    for room in rooms:
        html = render_room_html(room, by_room[room])
        index_parts.append(html)
        single = [
            "<!DOCTYPE html>",
            '<html lang="en"><head><meta charset="utf-8" />',
            f"<title>{escape(room)} · WILDE 2026 room schedule</title>",
            f"<style>{CSS}</style></head><body>",
            '<p class="no-print">Print this page and stick it at the room entrance.</p>',
            html,
            "</body></html>",
        ]
        path = OUT / f"{room_slug(room)}.html"
        path.write_text("\n".join(single), encoding="utf-8")
        print(f"wrote {path} ({len(by_room[room])} sessions)")

    index_parts.append("</body></html>")
    all_path = OUT / "all-rooms.html"
    all_path.write_text("\n".join(index_parts), encoding="utf-8")
    print("wrote", all_path)

    (OUT / "README.txt").write_text(
        "\n".join(
            [
                "WILDE 2026 printable room schedules",
                "===================================",
                "",
                "For door signs only — not linked on the public website.",
                "",
                "Print all rooms:",
                "  Open all-rooms.html in your browser → Print",
                "",
                "Print one room:",
                *[f"  - {room_slug(r)}.html  ({r})" for r in rooms],
                "",
                "Regenerate after schedule changes:",
                "  python scripts/make-room-schedules.py",
                "",
            ]
        ),
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
