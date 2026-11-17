# Detty December

Nigeria's fun place for Christmas and New Year, played with your friends. A gift box quiz opens at 7pm WAT from 1 to 25 December, plus the New Year Crossover on 31 December. In between: a Christmas Market for sending gifts, Detty December road trips (a driving game through Lagos-style traffic with hawkers and Christmas lights), live challenges (Do you know Lagos/Abuja, drive races), squads, ride-alongs and a full admin dashboard. Players sign up with a phone number and nickname (no password, no OTP), keep streaks, earn badges, battle in squads, states and schools, and share score cards to WhatsApp.

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

Content files you can edit and restart: `data/questions.json` (daily gift box questions), `data/city.json` (Lagos/Abuja challenges), `data/places.json` (trip destinations). Gift prices live in `GIFTS` in `server.js`.
| `PORT` | Port to listen on | `3000` |
| `SECRET` | Signs admin sessions (derived from the password if not set) | auto |

## Deploy (pick one)

The database is a single file, so the host **must have a persistent disk**, or you'll lose players on every redeploy.

**Railway:** New project, deploy from GitHub repo, add a Volume mounted at `/data`, set `DB_PATH=/data/game.db` and `ADMIN_PASSWORD`. Start command is `npm start`.

**Render:** New Web Service, build `npm install`, start `npm start`, add a Disk mounted at `/var/data` (paid plan), set `DB_PATH=/var/data/game.db`.

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


## Detty Drive (the Drive tab)

- **Drive of the Day:** one road per day for the whole country (same seed, same traffic). Time = drive time + 3s per crash + 5s per fine − 1s per passenger (max 10). First finish of the day pays 50 coins, a new personal best pays 20. Friends you pass get a notification. The friend just ahead of you drives with you as a ghost car. The route rotates through `DAILY_ROUTES` in `server.js`.
- **Free ride:** any ride, any road, Christmas night or harmattan morning. No coins needed, no fines.
- **Garage:** paint, plate number, danfo sticker and horn (`GARAGE` in `server.js`). Premium paints and horns cost coins.
- **On the road:** Christmas lights over the streets, Father Christmas, Christmas trees, fireworks at night, harmattan haze in the morning, knock-out bangers, cattle crossing on highways, the Lekki-Ikoyi toll plaza, the motor-park agbero, IJGB passengers who pay double, hawkers selling chin chin, puff-puff and Christmas gifts in go-slow, golden mystery boxes, overtake combos and Detty FM (a live afrobeats groove with radio jingles, made in the browser, no music files).
- **First drive:** a coach shows one tip at a time and disappears when you do it.
- **Daily Christmas stocking** on Home: a random prize every day, a jackpot on day 7 of a streak.
- Admin shows drives, Drive of the Day drivers, minutes driven, garage buys, stockings and mystery boxes.

## Home for December (journey, live show, party, changing questions)

- **Journey Home (3D):** each player picks where they're travelling from (Lagos, Abuja, Port Harcourt or abroad as an IJGB) and their hometown. The route follows real highways in `data/journey.json` (28 towns, 31 roads). One leg unlocks per day at midnight; an express ticket (60 coins) unlocks one extra leg. Each leg is a low-poly 3D drive (`public/journey3d.js`, Three.js in `public/vendor/`, loaded only when you drive). Arriving at each town asks one question about that town. Friends see each other on the map, and get notified when someone sets off or reaches home.
- **Owambe Night Live:** every night at 8:30pm Lagos time (`SHOW_UTC`, default `19:30`). 10 questions, 12 seconds each, same for everybody; a wrong or missed answer knocks you out unless you bought a spare life (100 coins). Survivors share `SHOW_POT` coins (default 20000). To test, use Admin → Questions → "Start today's show in 60 seconds".
- **Questions that change:** the daily gift box now gives every player a different mix from the pool (curated days + `data/bank.json` + approved questions), never repeating a question for a player until the pool runs out. Two slots each day are Christmas and Travel questions.
- **Players write questions:** Party tab → "Send us a question". They wait in Admin → Questions for approval; the writer gets 50 coins and their name on the question.
- **AI drafts (optional):** set `ANTHROPIC_API_KEY` (and optionally `AI_MODEL`) on the server, then Admin → Questions → "Draft 10 with AI". Drafts never go live until you approve them. Check every fact first.
- **How well do you know me?:** players build a 5-question quiz about themselves and share `/?know=CODE`. Friends' scores make a "who knows me best" board.
- **Party Mode:** pass-the-phone games for the living room that need no data: Aunty Interrogation, Act Am! (charades) and Who Go Pass?
