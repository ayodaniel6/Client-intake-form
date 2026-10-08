# Pre-call — Client Intake Form (Layer 1)

A playful, visual-first intake form for a software agency that builds platforms for SMEs. This is **Layer 1, the pre-call**: a quick way to get a feel for what the client wants to build before the first conversation.

Each submission:

1. is **emailed to you via Formspree**, with every answer as a readable row, and
2. includes a link to a **one-page Project Profile**, a printable A4 summary of the project you can save as a PDF.

## Files

```
index.html        The form (8 screens: welcome, 6 steps, closing)
profile.html      The one-page project profile
css/styles.css    Form styles
css/profile.css   Profile styles (screen + A4 print)
js/shared.js      Shared field list, labels, profile-link encoding, email fields
js/app.js         Form logic (cards, validation, progress, auto-save, submit)
js/profile.js     Profile rendering, one-page fitting, call-prep notes
```

No build step and no dependencies. Inter is loaded from Google Fonts.

## Run / deploy

- **GitHub Pages:** go to Settings → Pages, choose to deploy from the `main` branch (root folder). The form will be at `https://<user>.github.io/Client-intake-form/`.
- **Locally:** run `python3 -m http.server` in this folder and open http://localhost:8000. You can also open `index.html` directly, but then the profile links in emails point to your local disk, so test real submissions from the deployed site.

## Formspree

The endpoint is set at the top of `js/app.js`:

```js
var SUBMIT_ENDPOINT = "https://formspree.io/f/xgaoknoy";
```

Set it to `""` to disable sending; the submission is then logged to the browser console instead.

What arrives in your inbox:

| Row | Example |
|---|---|
| Subject | `New pre-call: Glow Salon — Sarah (PC-261008-ZUWV)` |
| Reply-to | the client's email, so you can just hit Reply |
| Reference | `PC-261008-ZUWV` |
| 📄 One-page project profile | link to `profile.html#d=…` |
| Client name … Who else says yes | one row per answer, in form order |

A hidden `_gotcha` honeypot field filters out spam bots.

## The one-page Project Profile

`profile.html` reads the submission from the link itself. The answers are compressed into the part of the URL after `#`. Browsers never send that part to a server, so the client's data isn't stored anywhere except your Formspree inbox.

The profile shows:

- **Header:** project name, client name, email, date and reference
- **Snapshot tiles:** platform, devices, timeline and personality
- **The problem:** what they're struggling with, how they handle it today, and their 6-month vision
- **The people and features:** the launch must-have is highlighted
- **Look & feel:** personality, inspiration link, and what it should NOT feel like
- **Prep for the call:** talking points worked out from the answers (e.g. "multiple user types → plan roles & permissions", "big wishlist → agree an MVP", "ASAP → phased launch")
- **Call notes:** blank lines to fill in during the call

It always fits on **one A4 page**: the text shrinks automatically for long answers. The toolbar has three buttons:

- **Print / Save as PDF** saves the profile as a PDF.
- **Download data (.json)** saves the raw data, ready to import into Layer 2.
- **Copy link** copies the profile's link.

To preview the layout with sample data, open `profile.html?sample=1`.

## Data shape (`.json` download)

```json
{
  "v": 1,
  "layer": "pre-call",
  "ref": "PC-261008-ZUWV",
  "submittedAt": "2026-10-08T12:00:00.000Z",
  "answers": {
    "name": "", "email": "", "projectName": "", "platform": "",
    "problem": "", "currentSolution": "", "currentSolutionOther": "", "sixMonths": "",
    "users": [], "device": [],
    "features": [], "featuresOther": "", "mustHave": "", "integrations": "",
    "personality": "", "inspirationUrl": "", "antiVibe": "",
    "timeline": "", "decisionMakers": ""
  }
}
```

## Form features

- One section per screen, with an animated "Step N of 6" progress bar
- Option cards: pick-one or pick-several. "Not sure" on devices can't be combined with other choices.
- Picking "Something else" (how it's handled today, and features) opens a follow-up text field
- Required fields block *Next* and show a gentle inline message. The email and URL fields are format-checked.
- Answers auto-save to `sessionStorage`, with a "Pick up where you left off" option
- Accessible: ARIA radio and checkbox roles, labels, visible focus rings, arrow-key navigation and reduced-motion support
- Mobile-first: everything stacks into one column below 640px

## Design tokens

| Token | Value |
|---|---|
| `--bg-base` | `#FAFAF8` |
| `--accent-primary` | `#5B4BFF` |
| `--accent-secondary` | `#FF6B6B` |
| `--success` | `#10B981` |
| `--text-primary` | `#0F0F0F` |
| `--text-secondary` | `#6B7280` |
| `--border` | `#E5E7EB` |
