# League Tracker

A personal League of Legends desktop stat tracker built with Electron.

## Features

- **Profile** — summoner level, profile icon, ranked stats for Solo/Duo and Flex
- **Champions** — top champion mastery with points and mastery level badges
- **Challenges** — challenge progress, category breakdown, and player level
- **Match History** — recent 20 games with KDA, CS, items, and outcome
- **Settings** — secure local storage of your Riot API key and summoner info

## Tech Stack

- Electron 28 + Vite 5 (via electron-vite)
- React 18
- Node.js `https` for Riot API calls (main process — no CORS)
- electron-store for encrypted local settings storage

## Setup

```bash
npm install
npm run dev
```

Open **Settings**, paste your Riot Personal API key, enter your Riot ID (`name#TAG`) and select your region.

## API Usage

This app uses the following Riot Games API endpoints:

| Endpoint | Purpose |
|---|---|
| `riot/account/v1/accounts/by-riot-id` | Resolve Riot ID to PUUID |
| `lol/summoner/v4/summoners/by-puuid` | Fetch summoner data |
| `lol/league/v4/entries/by-summoner` | Ranked stats |
| `lol/champion-mastery/v4/champion-masteries/by-summoner/top` | Top champion mastery |
| `lol/challenges/v1/player-data` | Challenge progress |
| `lol/match/v5/matches/by-puuid` | Recent match IDs |
| `lol/match/v5/matches/{matchId}` | Match details |

Champion/icon assets are loaded from the public **Data Dragon** CDN.

## Privacy

Your API key is stored **locally only** using electron-store (encrypted on disk). No data is sent to any third-party server. All Riot API calls are made directly from the desktop app to `api.riotgames.com`.

## Riot API Compliance

- This is a personal-use application
- All data displayed belongs to the authenticated user
- The app follows Riot's rate limiting guidelines
- No data is stored server-side or shared with third parties
