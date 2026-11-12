# 25 Days of Naija

A daily Naija quiz for December. A new round of 7 questions opens at 7pm WAT from 1 to 25 December, plus a Crossover round on 31 December. Players sign up with a phone number and nickname (no password, no OTP), keep streaks, earn badges, battle in squads, states and schools, and share score cards to WhatsApp.

- Player app: `/`
- Admin dashboard: `/admin` (password from `ADMIN_PASSWORD`)

## Run locally

Needs Node.js 22.13 or newer (it uses Node's built-in SQLite, so there's nothing native to compile).

```bash
npm install
ADMIN_PASSWORD=your-strong-password npm start
# open http://localhost:3000 and http://localhost:3000/admin
```

## Settings (environment variables)

| Variable | What it does | Default |
|---|---|---|
| `ADMIN_PASSWORD` | Admin dashboard password. **Change this.** | `change-me-now` |
| `DB_PATH` | Where the SQLite database file lives. Point it at a persistent disk. | `data/game.db` |
| `GAME_YEAR` | Which December the game runs in | `2026` |
| `PORT` | Port to listen on | `3000` |
| `SECRET` | Signs admin sessions (derived from the password if not set) | auto |

## Deploy (pick one)

The database is a single file, so the host **must have a persistent disk**, or you'll lose players on every redeploy.

**Railway:** New project, deploy from GitHub repo, add a Volume mounted at `/data`, set `DB_PATH=/data/game.db` and `ADMIN_PASSWORD`. Start command is `npm start`.

**Render (set up in this repo):** the included `render.yaml` creates a paid `starter` web service in Frankfurt (always on, no cold starts) with a 1 GB disk at `/var/data` for the database. In Render: New, Blueprint, pick this GitHub repo, type an `ADMIN_PASSWORD` when asked, Apply. Every push to `main` redeploys. After changing anything in `public/`, bump the `?v=` number on the three asset links in `public/index.html` so phones load the new files.

**Any VPS (DigitalOcean, Hetzner, Contabo):** install Node 22, clone, `npm install`, run with `pm2 start server.js --name naija25`, put Nginx or Caddy in front for HTTPS. Back up the `.db` file daily.

Put it on a short domain (for example `naija25.ng`), since the link appears on every share card.

## Before launch checklist

1. Read through every question in `data/questions.json`. The first option is always the correct one (the server shuffles options per player). Edit freely, then restart.
2. Set the prize line at the top of `public/app.js` (`PRIZE_TEXT`) to what you'll actually give.
3. In admin, open Settings, use the test clock to try 30 Nov, Day 1, Christmas and Crossover, then click **Use real time**.
4. Launch on 30 November so people can sign up and play the warm-up before Day 1.

## Running it in December

- **7pm daily:** admin, Settings, download the WhatsApp reminder list and send a broadcast with the link.
- **Next morning:** admin, Daily winners, pick the day, download CSV, send airtime to the top 10.
- **Watch** the Questions tab: a question with very low accuracy may have a wrong answer.
- **Safety tab:** many accounts on one IP, heavy referrers, and perfect rounds answered impossibly fast.

## How the game works

- 7 questions, 10 seconds each. Question 7 is "Ask Mummy" (old-school Naija, 20 seconds, double points).
- Points: 100 per correct answer (200 for Ask Mummy) plus up to 50 for speed, times a streak bonus of 5% per day in a row (max +50%). Perfect round: +150.
- Each round counts only until the next one opens. After that, it's practice with no points.
- Streak savers: everyone starts with 1. Each invited friend who plays a round gives +200 points and +1 saver (max 3). A missed day uses a saver automatically.
- Sharing your score once a day gives +25 points.
- The timer runs on the server and the correct answer is never sent before you answer, so players can't cheat by inspecting the page.

## What's tracked (admin dashboard)

Sign-ups, daily active players, rounds, time spent (heartbeat every 15 seconds while the app is open), next-day return rate, funnel, hour-of-day activity, states, schools, every interaction (opens, tab switches, shares by channel, invites, squad actions, reminders, installs), IP addresses, per-player timelines, per-question accuracy, and CSV exports.

## Files

```
server.js              backend, API, scoring, admin endpoints
data/questions.json    all 189 questions (warm-up, 25 days, Crossover)
public/index.html      player app shell
public/app.js          player app
public/app.css         design
public/admin.html      admin dashboard
public/sw.js, manifest.json, icons, og.png   installable app + WhatsApp link preview
```
