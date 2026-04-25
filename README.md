# LoLMoonBase

A personal League of Legends desktop stat tracker and overlay built with Electron + React.

## Download

Go to [Releases](https://github.com/MuunaCat/lolmoonbase/releases) and download the latest **LoLMoonBase Setup x.x.x.exe** installer.

> **Riot API key required.** Get a free personal key at [developer.riotgames.com](https://developer.riotgames.com). Development keys expire every 24 hours — regenerate as needed.

## Features

- **Profile** — summoner level, profile icon, ranked stats (Solo/Duo + Flex), recent highlights, free champion rotation
- **Champions** — full mastery list with points, mastery level, chest status, and a per-champion modal showing challenge contributions
- **Challenges** — full challenge list with tier progress, category breakdown, and overall player level. Pin any challenge to the in-game overlay with ★
- **Trackers** — built-in S Rank Every Champion and Mastery 5 Every Champion trackers with champion grid, filters, and search. Click any card in the S Rank tracker to manually override its status
- **Match History** — recent games with KDA, CS, items, multi-kill badges, and expandable team scoreboard. Progressive loading with ARAM Mayhem notice
- **Live Game** — real-time in-game stats (KDA, gold, CS, vision, HP/mana bars, AD/AP/Armor/MR/MS/AS/Haste/Crit), champion select countdown, queue search status, and team scoreboard with items
- **In-Game Overlay** — always-on-top draggable button that appears when a game starts. Expands to show your pinned challenges with progress bars. Pulses red when you die. Adjustable opacity. Closes automatically when the game ends

## Setup (dev)

```bash
npm install
npm run dev
```

Open **Settings**, paste your Riot API key, enter your Riot ID (`Name#TAG`), and select your region. The League of Legends install path is auto-detected; set it manually in Settings if needed.

## Build installer

```bash
npm run build
# Installer is written to dist/LoLMoonBase Setup x.x.x.exe
```

## Tech Stack

- Electron 28 + electron-vite + React 18
- Node.js `https` for all Riot API calls (main process — no CORS)
- LCU (League Client Update) API via local lockfile for live game data
- Live Client Data API (port 2999) for real-time in-game stats
- electron-store for local settings persistence

## Riot API Endpoints Used

| Endpoint | Purpose |
|---|---|
| `riot/account/v1/accounts/by-riot-id` | Resolve Riot ID → PUUID |
| `lol/summoner/v4/summoners/by-puuid` | Summoner data |
| `lol/league/v4/entries/by-puuid` | Ranked stats |
| `lol/champion-mastery/v4/.../by-puuid` | Champion mastery |
| `lol/challenges/v1/player-data` | Challenge progress |
| `lol/challenges/v1/challenges/config` | Challenge definitions |
| `lol/match/v5/matches/by-puuid` | Match IDs |
| `lol/match/v5/matches/{matchId}` | Match details |
| `lol/platform/v3/champion-rotations` | Free rotation |

Champion and item images are served from the public **Data Dragon** CDN.

## Privacy

Your API key is stored **locally only** using electron-store. No data leaves your machine to any third party — all Riot API calls go directly from the app to `api.riotgames.com`.

## Riot API Compliance

- Personal-use application only
- All data displayed belongs to the authenticated user
- Follows Riot's rate limiting guidelines
- No server-side storage or data sharing
