# League Squad Data (Season 2025/26)

This folder contains squad data for leagues, used as fallback when API player data is unavailable.

## Structure

- `bundesliga/` – Bundesliga teams with `squad` arrays
- Each team: `{ name, position, kickerNote, goals }`
- `kickerNote`: Kicker.de scale (1.0 = best, 6.0 = worst)
- `kickerToRating()` converts to 95–50 rating scale

## Updating Data

Run the update script to fetch current squads from api-football.com:

```bash
npm run update-leagues-data
```

**Requirements:**
- `API_FOOTBALL_KEY` in `.env` (from [api-football.com](https://www.api-football.com/))
- API quota for squads + top scorers/assists

**Options:**
- `--dry-run` – Show what would be updated without writing files

The script fetches:
1. Squad (players/squads) per team
2. Top scorers & assists for Bundesliga (for goals + rating)
3. Merges and writes updated `*.js` files

## Kicker.de Scraper (Python)

To update squad data with **Kicker-Noten** and goals from kicker.de:

```bash
pip install -r requirements.txt
python scripts/scrape_kicker_squads.py --requests
```

- `--league NAME` – `bundesliga` | `la_liga` | `premier_league` | `all` (default: all)
- `--requests` – Use HTTP requests (recommended, faster)
- `--limit N` – Only process first N teams per league

The script reads `kickerSlug` from each team file, fetches the Kicker squad page, and overwrites the `squad` array with scraped data. Supports Bundesliga, La Liga, Premier League, Serie A, and Ligue 1.

## Manual Updates

You can edit team files directly. Preserve the format:

```js
module.exports = {
    name: "Team Name",
    shortName: "XXX",
    kickerSlug: "team-slug",
    marketValue: 100000000,
    squad: [
        { name: "Player Name", position: "GK", kickerNote: 2.50, goals: 0 },
        // ...
    ]
};
```

Positions: `GK`, `DEF`, `MID`, `FW`, `SUB`
