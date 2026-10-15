from pathlib import Path

people = [
    ("tanisha-negi", "TN", "#1b4332", "#e4d3b0"),
    ("poruri-sai-rahul", "PR", "#143028", "#f3efe6"),
    ("akshay-bhardwaj", "AB", "#8d6430", "#f6f1e6"),
    ("aleena-xavier", "AX", "#10261e", "#e4d3b0"),
    ("amal-k-vyas", "AV", "#2d4a3e", "#faf7f1"),
    ("poonam-chauhan", "PC", "#5c4030", "#f3efe6"),
    ("pramiti-negi", "PN", "#1b4332", "#f6f1e6"),
    ("preeti-saryan", "PS", "#0b0b0b", "#e4d3b0"),
]

root = Path(__file__).resolve().parents[1]
out = root / "assets" / "people"
out.mkdir(parents=True, exist_ok=True)

for old in out.glob("*.svg"):
    old.unlink()

for slug, initials, bg, fg in people:
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" role="img" aria-label="Portrait placeholder">
  <rect width="320" height="400" fill="{bg}"/>
  <circle cx="160" cy="148" r="58" fill="{fg}" opacity="0.92"/>
  <ellipse cx="160" cy="330" rx="110" ry="90" fill="{fg}" opacity="0.92"/>
  <text x="160" y="162" text-anchor="middle" font-family="Georgia, serif" font-size="42" font-weight="600" fill="{bg}">{initials}</text>
</svg>
"""
    (out / f"{slug}.svg").write_text(svg, encoding="utf-8")

for name in ["schedule-extract.txt", "schedule-page-1.png", "schedule-page-2.png"]:
    path = root / "assets" / name
    if path.exists():
        path.unlink()

print("ok", len(people))
