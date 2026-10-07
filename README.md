# Client Intake Form

A playful, visual-first client intake form for a software agency that builds platforms for SMEs. It's the first touchpoint with a new client, so it's built to feel like a product, not paperwork.

**Single file, no build step.** Open `index.html` in a browser, or host it on any static host (GitHub Pages, Netlify, Vercel).

## What's inside

- **8 screens:** Welcome, 6 steps (Basics, Problem, People, Features, Vibe, Reality), and Closing
- **Animated progress bar** showing "Step N of 6" (the welcome and closing screens aren't counted)
- **Option cards:** tap to select. Single-select replaces the choice; multi-select toggles.
- **Conditional reveal:** picking "Something else" in Q2.2 opens a follow-up text field
- **Validation:** required fields block *Next* and show a gentle inline message ("Just need this one to keep going →")
- **Auto-save:** answers save to `sessionStorage` on every change, and a "Pick up where you left off" link appears on return
- **Closing summary:** an "answers at a glance" panel with an *Edit* link for each answer, plus confetti on send
- **Accessibility:** cards use `role="radio"` / `role="checkbox"` with `aria-checked` and an `aria-label` for each card, focus rings are visible, arrow keys move between cards, a live region announces changes, and `prefers-reduced-motion` is respected
- **Mobile-first:** grids collapse to a single column below 640px and buttons go full-width

## Receiving submissions

The form runs fully client-side by default: on send, the payload is logged to the console. To collect real submissions, set the endpoint near the top of the `<script>` block:

```js
var SUBMIT_ENDPOINT = "https://formspree.io/f/your-id"; // or your own API
```

The form POSTs JSON in this shape:

```json
{
  "submittedAt": "2026-10-07T12:00:00.000Z",
  "source": "client-intake-form",
  "answers": {
    "name": "", "projectName": "", "platform": "",
    "problem": "", "currentSolution": "", "currentSolutionOther": "", "sixMonths": "",
    "users": [], "device": "",
    "features": [], "mustHave": "", "integrations": "",
    "personality": "", "inspirationUrl": "", "antiVibe": "",
    "timeline": "", "decisionMakers": ""
  }
}
```

## Design tokens

| Token | Value |
|---|---|
| `--bg-base` | `#FAFAF8` |
| `--bg-card` | `#FFFFFF` |
| `--accent-primary` | `#5B4BFF` |
| `--accent-secondary` | `#FF6B6B` |
| `--success` | `#10B981` |
| `--text-primary` | `#0F0F0F` |
| `--text-secondary` | `#6B7280` |
| `--border` | `#E5E7EB` |

Typeface: Inter, with a system-ui fallback.
