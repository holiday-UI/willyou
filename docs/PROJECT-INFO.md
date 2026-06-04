# willyou — Project Info & Operations Guide

A real-time "will you go on a date with me?" web app, built for **David** to ask out **Marylyne**.
Personalized login, an uncatchable "No" button, and a live dashboard so David sees her every move in real time.

Last updated: 2026-06-04

---

## 1. Live links

| What | URL |
|------|-----|
| **Send this to Marylyne** | https://willyou-b0if.onrender.com/ |
| **David's live dashboard** | https://willyou-b0if.onrender.com/david.html |
| Health check (used by pingers) | https://willyou-b0if.onrender.com/healthz |
| GitHub repo | https://github.com/holiday-UI/willyou |

> The dashboard is protected by a passcode — the **`DAVID_CODE`** you set on Render during deploy. Keep it secret.

---

## 2. What it does (the experience)

**Marylyne's side** (`/`):
1. **Screen 1 — Login greeting:** "Hi Marylyne 💕" with an **Enter** button.
2. **Screen 2 — The question:** "Marylyne, would you go on a date with me? — David", with **Yes** and **No** buttons.
   - The **No button can't be clicked.** Every attempt makes it: jump to a random spot, **shrink**, grow the **Yes** button bigger, and change its text through an escalating sequence:
     `No → No? → Are you sure? → Really sure? → Think again 🤔 → Pleeease 🥺 → Don't do this 😭 → You can't catch me 😜 → Just say yes 💘 → I'll cry 😢 → 💔`
   - Works on **desktop** (dodges on hover) and **mobile** (dodges on tap — handled separately because phones have no hover).
3. **Screen 3 — Yes!:** "Yay! You just made my day, Marylyne! 💕 — David"

**David's side** (`/david.html`):
- Passcode gate → live dashboard that updates in real time as she acts:
  - **Entered** (with time) — she opened it and clicked Enter
  - **Viewing question** (with time)
  - **"No" dodges** — running count of failed No-clicks
  - **Answer** — flips to a big **"🎉 SHE SAID YES! 💕"** banner the instant she clicks Yes
  - **Live activity log** — timestamped feed of every event
  - **🔄 Reset session** button — clears state for a fresh ask / after testing

---

## 3. How to use it (operations)

**Before sending her the link:**
1. Open the dashboard, enter your passcode.
2. Click **🔄 Reset session** to clear any test/leftover data so she starts on a clean slate.
3. (Optional but nice) Open the Marylyne link yourself ~1 minute beforehand to make sure the server is awake (see cold-start note below).

**Then:**
- Send Marylyne: `https://willyou-b0if.onrender.com/`
- Keep your dashboard open: `https://willyou-b0if.onrender.com/david.html`
- Watch it light up. 💘

---

## 4. Architecture / tech

- **Stack:** Node.js + Express (static hosting + `/healthz`) + `ws` (WebSocket server for real-time).
- **State:** a single in-memory session (it's one couple) — resets if the server restarts.
- **Real-time events** (Marylyne's client → server → David's dashboard): `entered`, `viewing`, `dodge` (with count), `yes`. David can send `reset`.
- **Auth:** David's dashboard sends the passcode in its WebSocket handshake; the server rejects any client whose code ≠ `DAVID_CODE`, so strangers can't watch.

**Files:**
```
server.js                       # Express + WebSocket server, state, /healthz, self-ping
package.json                    # deps: express, ws
render.yaml                     # Render blueprint (free web service)
public/index.html               # Marylyne: login → question (dodging No) → Yes
public/david.html               # David: passcode gate → live dashboard
.github/workflows/keepalive.yml # external keep-alive pinger (see status below)
docs/PROJECT-INFO.md            # this file
```

---

## 5. Hosting & deploy (Render, free)

- Deployed on **Render** free plan via the `render.yaml` blueprint, auto-deploys on push to `main`.
- The **`DAVID_CODE`** env var (your dashboard passcode) is set in the Render dashboard. To change it: Render → service → Environment → edit `DAVID_CODE` → save (triggers redeploy).
- **Cold-start note:** the free tier sleeps after ~15 min of inactivity; the first visit after sleeping takes ~30–50s to wake. Mitigated by the keep-alive below.

---

## 6. Keep-alive (so it never cold-starts on her)

1. **Self-ping (LIVE, automatic):** the server pings its own URL every 14 min using Render's `RENDER_EXTERNAL_URL`. Keeps it awake while running — no setup.
2. **cron-job.org external pinger (chosen route):** a free external monitor hits `/healthz` every few minutes as a backup, so the app gets woken even if it fully restarts. No GitHub permission needed.
   - **Setup:** create a free account at https://cron-job.org → **Create cronjob** → Title: `willyou keep-alive`, URL: `https://willyou-b0if.onrender.com/healthz`, schedule: **every 5 minutes**, request method **GET** → **Create**. Done.
   - We dropped the GitHub Actions approach: pushing `.github/workflows/*` requires the `workflow` token scope this machine's `gh` login doesn't have. (A defunct, malformed `keepalive.yml` may still sit in the repo on GitHub — harmless; delete it via the GitHub web UI if you want a clean Actions tab.)

---

## 7. Notifications

- An earlier version also sent a phone push via **ntfy.sh** on "Yes". Topic: `marylyne-yes-k7m2p9qzx4` (subscribe in the free ntfy app to get pinged). The real-time dashboard now covers this, but the ntfy push can be re-added if wanted.

---

## 8. Common commands (run from the project folder)

```bash
# Install deps (this machine needs the system-CA flag for TLS)
NODE_OPTIONS=--use-system-ca npm install

# Run locally (visit http://localhost:3000)
DAVID_CODE=test123 node server.js

# Push (this machine needs these flags so git doesn't hang on auth)
gh auth setup-git
GIT_TERMINAL_PROMPT=0 git push origin main
```

---

## 9. Outstanding / possible next steps

- [ ] Set up the cron-job.org monitor on `/healthz` (see §6) — the chosen external keep-alive.
- [ ] Optional: delete the defunct `.github/workflows/keepalive.yml` from the repo via the GitHub web UI.
- [ ] Optional: custom domain (cuter than the onrender.com URL).
- [ ] Optional: confetti / music on the "Yes" screen.
- [ ] Optional: a "pick a day & place" step after she says Yes.
- [ ] Optional: re-add the ntfy push notification alongside the dashboard.
