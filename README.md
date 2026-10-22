# Jidoka — Lead Qualification Tollgate (Layer 03 · Qualify & Handoff)

The intake form for Jidoka Technologies, which builds MVPs for Fintech, Healthtech and Edtech startups. It filters out leads that don't fit before anyone gets on a call. It scores the leads that pass and hands Sales a printable **Lead Qualification Packet (LQP)**.

```
Lead → Contact → Fit check (3 gates) ──fail──→ "No fit" screen (nothing submitted)
                        │ pass
                        ▼
        Problem → Scope → Timeline & decision → Review → Submit
                        │
                        ▼
   Formspree email: "[LQP 4.2 · Book the call] Company — Name (JD-…)"
                        │
                        ▼
          profile.html#d=…  → one-page A4 LQP (score, brief, call prep, notes)
```

## Files

```
index.html        The tollgate form (welcome, 5 steps, review, no-fit)
profile.html      The Lead Qualification Packet (LQP)
css/styles.css    Form styles (B2B design tokens)
css/profile.css   LQP styles (screen + single A4 page print)
js/shared.js      Field list, gates, scoring rubric, link encoding, email fields
js/app.js         Form logic (tollgate, validation, progress, auto-save, submit)
js/profile.js     LQP rendering, one-page fitting, call-prep talking points
```

There's no build step and there are no dependencies. Inter is loaded from Google Fonts.

## Configuration (top of `js/app.js`)

| Setting | Default | What it does |
|---|---|---|
| `SUBMIT_ENDPOINT` | Formspree URL | Where qualified leads are sent. Set it to `""` to log to the console instead. |
| `BOOKING_URL` | `""` | Optional Calendly/Cal.com link. Leads scoring **≥ 3.5** see it right after submitting. |
| `LOG_DISQUALIFIED` | `false` | When `true`, a short `[DECLINED · gate]` email is sent for no-fit leads (contact details and the failed gate), so they can be referred out or nurtured. |

## The tollgate (step 2: Fit check)

| Gate | Fails on | Message shown |
|---|---|---|
| Industry | Other | We currently specialize in Fintech, Healthtech, and Edtech. We'll keep your email, but we may not be the right fit. |
| Project type | Legacy PHP, Crypto/Blockchain | We do not take on legacy rescues or crypto projects. We wish you the best. |
| Budget | Under $5,000 CAD | Our minimum engagement is $5,000 CAD. We cannot accommodate this budget. |

A lead who fails a gate sees the "No fit" screen, and nothing is submitted. The session stays closed if they reload the page. A small "Review your fit-check answers" link lets someone who picked the wrong option go back. The gates are checked again on submit.

## Scoring rubric (`js/shared.js` → `Jidoka.scoreLead`)

| Criterion | Weight | Scores |
|---|---|---|
| Budget fit | 25% | $15k+ = 5 · $5k–$15k = 3 |
| Problem & urgency | 20% | 1–3 months = 5 · 3+ months = 3 · ASAP = 2 |
| Decision-maker access | 20% | Founder/CEO, CTO or other C-level = 5 · other roles = 3 · Not sure = 1 |
| Timeline fit | 15% | 1–3 months = 5 · 3+ months = 4 · ASAP = 2 |
| Service fit | 10% | New MVP = 5 · Other = 3 |
| Strategic value | 10% | Fintech/Healthtech = 5 · Edtech = 3 |

The weighted total is rounded to one decimal. The verdict follows the playbook threshold: **≥ 3.5 book the call**, 2.5–3.4 nurture sequence, below 2.5 polite no + referral.

The score goes into the email subject, so the inbox sorts itself. The LQP recalculates it from the answers, so the packet always matches the rubric. The lead never sees the score or the packet.

## The Lead Qualification Packet

`profile.html` reads the submission from the link itself. The answers are compressed into the part of the URL after `#`, which browsers never send to a server.

- **Header:** company, contact, email, date, ref ID, source (including `utm_*` / `?src=` from the form link), and the **LEAD SCORE X.X / 5** with its verdict and a scorecard breakdown
- **1 · The Gatekeepers:** industry, project type, budget range, timeline (and the date driving it)
- **2 · The Project Brief:** problem, current solution, 6-month vision, must-have features (plus platform, integrations, compliance), decision makers
- **3 · Call Prep:** talking points generated from the answers. Red flags come first, printed in red.
- **4 · Call Notes:** five ruled lines and a Go / Nurture / No-go checkbox row

It always prints to **one A4 page**: the text shrinks automatically when answers are long. Open `profile.html?sample=1` to preview it with the fictional Tallyspring lead.

## Run / deploy

- **GitHub Pages:** go to Settings → Pages and deploy from the `main` branch (root folder).
- **Locally:** run `python3 -m http.server` in this folder and open http://localhost:8000.

## Design tokens

| Token | Value |
|---|---|
| `--bg-base` | `#F9FAFB` |
| `--bg-card` | `#FFFFFF` (borders `#E5E7EB`) |
| `--text-primary` | `#111827` |
| `--text-secondary` | `#4B5563` |
| `--accent` | `#1D4ED8` |
| `--error` | `#B91C1C` |
| `--success` | `#047857` |

Type is Inter: body 16px, headings 24px/32px, labels 14px uppercase with tracking. Transitions are fade-only.
