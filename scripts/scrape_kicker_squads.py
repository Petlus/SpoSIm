#!/usr/bin/env python3
"""
Scrape squad data (players, kickerNote, goals) from kicker.de.
Supports Bundesliga, La Liga, Premier League. Updates .js files in electron/data/leagues/.

Usage:
    pip install -r requirements.txt
    python scripts/scrape_kicker_squads.py [--league NAME] [--requests] [--limit N]

Options:
    --league NAME   bundesliga | la_liga | premier_league | serie_a | ligue_1 | all (default: all)
    --requests      Use HTTP requests instead of Playwright (faster, recommended)
    --limit N       Only process first N teams per league

Env:
    KICKER_USE_REQUESTS=1  - same as --requests
    KICKER_LIMIT=N         - same as --limit N
    KICKER_LEAGUE=NAME     - same as --league
"""

import os
import re
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

from bs4 import BeautifulSoup

# Project root
ROOT = Path(__file__).resolve().parent.parent
LEAGUES_BASE = ROOT / "electron" / "data" / "leagues"
SEASON = "2025-26"

# League folder -> Kicker URL path (e.g. /kader/la-liga/2025-26)
LEAGUE_PATH_MAP = {
    "bundesliga": "bundesliga",
    "la_liga": "la-liga",
    "premier_league": "premier-league",
    "serie_a": "serie-a",
    "ligue_1": "ligue-1",
    "champions_league": "champions-league",
    "europa_league": "europa-league",
    "conference_league": "europa-conference-league",
}

# Teams in 2. Bundesliga (different URL path)
TEAMS_2_BUNDESLIGA = set()

# Position mapping: Kicker section -> our position code
POSITION_MAP = {
    "Tor": "GK",
    "Abwehr": "DEF",
    "Mittelfeld": "MID",
    "Sturm": "FW",
}


def parse_note(raw: str) -> float | None:
    """Parse German decimal (3,13) to float. Returns None for '-' or empty."""
    if not raw or raw.strip() in ("-", ""):
        return None
    s = raw.strip().replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def parse_goals(raw: str) -> int:
    """Parse goals. Returns 0 for '-' or empty."""
    if not raw or raw.strip() in ("-", ""):
        return 0
    try:
        return int(raw.strip())
    except ValueError:
        return 0


def normalize_name(kicker_text: str) -> str:
    """
    Kicker format: **LastName**FirstName or **SingleName**
    Convert to: FirstName LastName or SingleName
    """
    # Match **X**Y -> Y X, or **X** -> X
    m = re.match(r"\*\*(.+?)\*\*(.+)?", kicker_text)
    if m:
        last = m.group(1).strip()
        first = (m.group(2) or "").strip()
        if first:
            return f"{first} {last}"
        return last
    return kicker_text.strip()


def extract_players_from_html(html: str) -> list[dict]:
    """Parse Kicker squad table HTML and return list of {name, position, kickerNote, goals}."""
    soup = BeautifulSoup(html, "html.parser")
    players = []
    current_position = None

    # Find all h2/h3 that are section headers
    for tag in soup.find_all(["h2", "h3"]):
        text = (tag.get_text() or "").strip()
        if text in POSITION_MAP:
            current_position = POSITION_MAP[text]
            continue
        if text in ("Aktueller Kader", "Außerdem eingesetzt", "Trainer", "Kapitän"):
            if text == "Außerdem eingesetzt" or text == "Trainer":
                current_position = None
            continue

    # Find tables - Kicker uses table with player rows
    tables = soup.find_all("table")
    current_position = None

    for table in tables:
        # Check if previous sibling is a section header
        prev = table.find_previous_sibling()
        while prev and prev.name not in ("h2", "h3"):
            prev = prev.find_previous_sibling() if hasattr(prev, "find_previous_sibling") else None
        if prev:
            header_text = (prev.get_text() or "").strip()
            current_position = POSITION_MAP.get(header_text)

        rows = table.find_all("tr")
        if not rows:
            continue

        # First row may be header: Nr.|Spieler|Nation|Alter|Einsätze|Tore|Note
        for row in rows[1:]:  # skip header
            cells = row.find_all(["td", "th"])
            if len(cells) < 4:
                continue

            # Player name: usually in first <a> with **Last**First pattern
            name_cell = cells[1] if len(cells) > 1 else cells[0]
            link = name_cell.find("a")
            if not link:
                continue

            # Kicker format: <strong>LastName</strong>FirstName -> "FirstName LastName"
            texts = list(link.stripped_strings)
            if len(texts) >= 2:
                full = f"{texts[1]} {texts[0]}"  # FirstName LastName
            elif texts:
                full = texts[0]
            else:
                full = (link.get_text() or "").strip()

            if not full:
                continue

            # Columns: Bundesliga has Nr, Spieler, Nation, Alter, Einsätze, Tore, Note (7)
            # La Liga/PL have Nr, Spieler, Nation, Alter, Einsätze, Tore (6 - no Note)
            goals = 0
            note = None
            if len(cells) >= 7:
                goals = parse_goals((cells[5].get_text() or ""))
                note = parse_note((cells[6].get_text() or ""))
            elif len(cells) >= 6:
                goals = parse_goals((cells[5].get_text() or ""))  # Tore is last col
                note = None  # No Note column in La Liga/PL

            pos = current_position or "MID"  # fallback
            players.append({
                "name": full,
                "position": pos,
                "kickerNote": note,
                "goals": goals,
            })

    # Alternative: find by section headers and following table
    if not players:
        current_pos = None
        for tag in soup.find_all(["h2", "h3", "table"]):
            if tag.name in ("h2", "h3"):
                t = (tag.get_text() or "").strip()
                if t in POSITION_MAP:
                    current_pos = POSITION_MAP[t]
                elif t in ("Außerdem eingesetzt", "Trainer"):
                    current_pos = None
            elif tag.name == "table" and current_pos:
                for row in tag.find_all("tr")[1:]:
                    cells = row.find_all(["td", "th"])
                    if len(cells) < 4:
                        continue
                    link = (cells[1] if len(cells) > 1 else cells[0]).find("a")
                    if not link:
                        continue
                    texts = list(link.stripped_strings)
                    full = f"{texts[1]} {texts[0]}" if len(texts) >= 2 else (texts[0] if texts else (link.get_text() or "").strip())
                    if not full:
                        continue
                    goals = parse_goals((cells[5].get_text() or "")) if len(cells) >= 6 else 0
                    note = parse_note((cells[6].get_text() or "")) if len(cells) >= 7 else None
                    players.append({"name": full, "position": current_pos, "kickerNote": note, "goals": goals})

    return players


def load_team_meta(filepath: Path) -> dict | None:
    """Load name, shortName, kickerSlug, marketValue from existing .js file."""
    content = filepath.read_text(encoding="utf-8")
    # Simple regex extraction
    name = re.search(r'name:\s*"([^"]+)"', content)
    short = re.search(r'shortName:\s*"([^"]+)"', content)
    slug = re.search(r'kickerSlug:\s*"([^"]+)"', content)
    market = re.search(r'marketValue:\s*(\d+)', content)
    if not name or not slug:
        return None
    return {
        "name": name.group(1),
        "shortName": short.group(1) if short else "???",
        "kickerSlug": slug.group(1),
        "marketValue": int(market.group(1)) if market else 50000000,
    }


def write_team_js(filepath: Path, meta: dict, players: list[dict]) -> None:
    """Write team .js file in the expected format."""
    lines = [
        f'// {meta["name"]} - Squad Data',
        "// Source: kicker.de (Season " + SEASON.replace("-", "/") + ")",
        "",
        "module.exports = {",
        f'    name: "{meta["name"]}",',
        f'    shortName: "{meta["shortName"]}",',
        f'    kickerSlug: "{meta["kickerSlug"]}",',
        f'    marketValue: {meta["marketValue"]},',
        "    squad: [",
    ]

    pos_comments = {"GK": "// Goalkeepers", "DEF": "// Defenders", "MID": "// Midfielders", "FW": "// Forwards"}
    last_pos = None
    for p in players:
        if p["position"] != last_pos and p["position"] in pos_comments:
            lines.append(f"        {pos_comments[p['position']]}")
            last_pos = p["position"]
        note_str = f"{p['kickerNote']:.2f}" if p["kickerNote"] is not None else "null"
        lines.append(f'        {{ name: "{p["name"]}", position: "{p["position"]}", kickerNote: {note_str}, goals: {p["goals"]} }},')
    lines.append("    ]")
    lines.append("};")

    filepath.write_text("\n".join(lines), encoding="utf-8")
    print(f"  Written: {filepath.name}")


def scrape_team_requests(slug: str, league: str) -> list[dict]:
    """Fetch via requests (no JS, faster). Kicker pages are server-rendered."""
    if not requests:
        return []
    url = f"https://www.kicker.de/{slug}/kader/{league}/{SEASON}"
    r = requests.get(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "de-DE,de;q=0.9",
        },
        timeout=15,
    )
    r.raise_for_status()
    return extract_players_from_html(r.text)


def scrape_team_playwright(page, slug: str, league: str) -> list[dict]:
    """Navigate to Kicker squad page with Playwright and extract players."""
    url = f"https://www.kicker.de/{slug}/kader/{league}/{SEASON}"
    page.goto(url, wait_until="domcontentloaded", timeout=12000)
    page.wait_for_timeout(1000)
    html = page.content()
    return extract_players_from_html(html)


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="Scrape Kicker squad data for football teams")
    ap.add_argument("--league", default="all", help="bundesliga | la_liga | premier_league | serie_a | ligue_1 | champions_league | europa_league | conference_league | all")
    ap.add_argument("--requests", action="store_true", help="Use requests instead of Playwright")
    ap.add_argument("--limit", type=int, default=0, help="Process only first N teams per league")
    args = ap.parse_args()

    league_arg = os.environ.get("KICKER_LEAGUE", args.league).lower()
    if league_arg == "all":
        league_folders = list(LEAGUE_PATH_MAP.keys())
    elif league_arg in LEAGUE_PATH_MAP:
        league_folders = [league_arg]
    else:
        print(f"Error: Unknown league '{league_arg}'. Use: bundesliga, la_liga, premier_league, serie_a, ligue_1, champions_league, europa_league, conference_league, all")
        return 1

    use_requests = args.requests or os.environ.get("KICKER_USE_REQUESTS", "").lower() in ("1", "true", "yes")
    limit = args.limit or int(os.environ.get("KICKER_LIMIT", "0"))
    print(f"Scraping kicker.de (season {SEASON}) - leagues: {', '.join(league_folders)}")
    if use_requests:
        print("  Using requests (no browser)")
    else:
        print("  Using Playwright (headless browser)")

    def process_league(league_folder: str, scrape_fn):
        leagues_dir = LEAGUES_BASE / league_folder
        if not leagues_dir.exists():
            print(f"  Skip {league_folder}: folder not found")
            return
        kicker_path = LEAGUE_PATH_MAP[league_folder]
        team_files = [f for f in leagues_dir.glob("*.js") if f.name != "index.js"]
        if not team_files:
            print(f"  Skip {league_folder}: no team files")
            return
        if limit:
            team_files = team_files[:limit]
        print(f"\n  === {league_folder} ({len(team_files)} teams) ===")
        for fp in sorted(team_files):
            meta = load_team_meta(fp)
            if not meta:
                print(f"    Skip {fp.name}: could not parse meta")
                continue
            slug = meta["kickerSlug"]
            path = "2-bundesliga" if league_folder == "bundesliga" and slug in TEAMS_2_BUNDESLIGA else kicker_path
            print(f"    {meta['name']} ({slug})...")
            try:
                players = scrape_fn(slug, path)
                if players:
                    write_team_js(fp, meta, players)
                else:
                    print(f"      No players found, skipping write")
            except Exception as e:
                print(f"      Error: {e}")
            time.sleep(1.5)

    if use_requests and requests:
        for lf in league_folders:
            process_league(lf, scrape_team_requests)
    else:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print("Playwright not installed. Use: pip install playwright && playwright install chromium")
            print("Or set KICKER_USE_REQUESTS=1 to use requests instead.")
            return 1
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.set_default_timeout(12000)
            page.set_extra_http_headers({"Accept-Language": "de-DE,de;q=0.9"})
            scrape_pl = lambda slug, path: scrape_team_playwright(page, slug, path)
            for lf in league_folders:
                process_league(lf, scrape_pl)
            browser.close()

    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
