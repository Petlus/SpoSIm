# BetBrain

**Sports Simulation** – Desktop app for football and F1 simulation with AI-powered match analysis.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Desktop:** Electron 40
- **Database:** SQLite (Prisma ORM)
- **Data:** football-data.org, api-football.com, F1 API
- **AI:** Ollama (local LLM for match predictions)

## Features

- **Football:** Bundesliga, Premier League, La Liga, Serie A, Ligue 1, Champions League
- **Match simulation:** Elo-based engine with form, injuries, home advantage
- **AI analysis:** Ollama integration for expert predictions (optional setup)
- **F1:** Data models ready, simulation in development

## Getting Started

```bash
npm install
npm run dev
```

This starts the Next.js dev server and launches the Electron window. The app runs at `http://localhost:3000` inside Electron.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js + Electron |
| `npm run build` | Build Next.js for production |
| `npm run update-data` | Fetch latest data from APIs |

## Project Structure

```
├── app/           # Next.js App Router (pages, components)
├── config/        # Central config (e.g. season)
├── data/          # SQLite database
├── electron/      # Main process, IPC, simulation, data sync
├── prisma/        # Schema
└── public/        # Static assets
```

## Season Configuration

The current season is defined in `config/season.js`. Update `CURRENT_SEASON_YEAR` when starting a new season.
