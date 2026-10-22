/* =========================================================
   LEAD QUALIFICATION PACKET (LQP) — renders one qualified
   lead as a single A4 page. Data comes from (in order):
     1. #d=<encoded>  (the link in the Formspree email)
     2. ?sample=1     (demo data, to preview the layout)
     3. the last submission made in this browser
   The score is always recomputed from the answers, so the
   packet and the rubric in shared.js can never disagree.
   ========================================================= */
(function () {
  "use strict";

  var TIMELINE_DESC = {
    "ASAP": "ASAP (under 4 weeks)",
    "1–3 months": "1–3 months",
    "3+ months": "3+ months"
  };

  /* Fictional sample lead from the Client Lifecycle Playbook */
  var SAMPLE = {
    v: 2, layer: "lqp", ref: "JD-SAMPLE-0001", submittedAt: new Date().toISOString(),
    answers: {
      name: "Dami Adeyemi", role: "Co-founder & CEO", email: "dami@tallyspring.ca", company: "Tallyspring",
      source: "Lead magnet (checklist, calculator)", campaign: "linkedin / budget-calculator",
      industry: "Fintech", projectType: "New MVP", budget: "$15,000+ CAD",
      problem: "Freelancers can't see next month's cash flow. A credit-union pilot starts in January and we need a working product for it — if we miss it, we lose the pilot and our raise.",
      currentSolution: "Manual process", currentSolutionOther: "",
      sixMonths: "50 freelancers using it weekly in the pilot, and a seed round closed on the back of the results.",
      platform: "Web app",
      features: ["User accounts & roles", "Bank / data sync", "Dashboard", "Notifications", "Reporting & analytics"], featuresOther: "",
      mustHave: "Cash-flow forecast", integrations: "Plaid, QuickBooks", compliance: ["PIPEDA", "SOC 2"],
      timeline: "1–3 months", hardDate: "Credit-union pilot starts mid-January",
      decisionMakers: ["Founder / CEO", "CTO / Technical co-founder"], decisionNames: "Dami Adeyemi (CEO), Tobi Lawal (CTO)",
      engagement: "Discovery, then fixed-price milestones"
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var record = null;

  /* ---------- Load ---------- */
  function load() {
    var hash = location.hash.replace(/^#/, "");
    var match = /(?:^|&)d=([^&]+)/.exec(hash);
    if (match) return Jidoka.decodeRecord(match[1]);
    if (/[?&]sample=1/.test(location.search)) return Promise.resolve(SAMPLE);
    try {
      var last = localStorage.getItem(Jidoka.LAST_RECORD_KEY);
      if (last) return Promise.resolve(JSON.parse(last));
    } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }

  /* ---------- Helpers ---------- */
  function text(id, value, fallback) {
    var el = $(id);
    if (value) { el.textContent = value; el.classList.remove("muted"); }
    else { el.textContent = fallback || "Not provided"; el.classList.add("muted"); }
  }
  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function has(arr, v) { return list(arr).indexOf(v) > -1; }

  function chips(id, items, keyItem) {
    var host = $(id);
    host.innerHTML = "";
    items.forEach(function (item) {
      var c = document.createElement("span");
      c.className = "chip" + (keyItem && item.toLowerCase() === keyItem.toLowerCase() ? " chip--key" : "");
      c.textContent = item;
      host.appendChild(c);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-CA", { day: "numeric", month: "short", year: "numeric" });
  }

  /* ---------- Call prep: talking points derived from the answers ----------
     Red flags (from the ideal-client profile) come first and print in red. */
  function prepPoints(a, score) {
    var flags = [];
    var points = [];
    var dm = list(a.decisionMakers);
    var features = list(a.features);
    var compliance = list(a.compliance);
    var cLevel = dm.some(function (d) { return Jidoka.C_LEVEL.indexOf(d) > -1; });

    // Red flags
    if (has(dm, "Not sure")) flags.push("Identify the economic buyer before sending the proposal.");
    else if (!cLevel) flags.push("No C-level sign-off listed — get the economic buyer onto the business call.");
    if (a.timeline === "ASAP") flags.push("Probe for a real date vs. artificial urgency.");
    if (a.engagement === "Hourly / time and materials") flags.push("Wants hourly billing — explain fixed-price milestones, or walk.");
    if (a.engagement === "A quote first") flags.push("Wants a quote before discovery — position discovery as the way to a fixed price.");
    if (Jidoka.isPersonalEmail(a.email)) flags.push("Personal email address — confirm the company and their role in it.");

    // Talking points
    if (a.budget === "$5,000–$15,000 CAD") points.push("Scope tightly to fit the budget — build v1 around “" + (a.mustHave || "the must-have") + "” only.");
    if (a.budget === "$15,000+ CAD") points.push("Budget supports a full MVP — confirm who approved the range and whether it is set aside.");
    if (a.hardDate && a.hardDate.trim()) points.push("Anchor the milestone plan to their date: “" + a.hardDate.trim() + "”.");
    else if (a.timeline !== "3+ months") points.push("Ask what is driving the date — a pilot, a raise, or a launch?");
    if (has(dm, "Board / investors")) points.push("Board or investor sign-off — ask what they need to see and when they next meet.");
    if (has(dm, "Founder / CEO") && !has(dm, "CTO / Technical co-founder")) points.push("Ask who owns technical decisions after handover.");
    if (has(dm, "CTO / Technical co-founder") && a.role && !/cto|tech/i.test(a.role)) points.push("CTO is a decision maker — invite them to the next call.");
    if (a.projectType === "Other") points.push("Project type “Other” — confirm it is a net-new build within our capability.");
    if (features.length >= 8) points.push("Wishlist of " + features.length + " features — agree the v1 cut-line before pricing.");
    if (has(features, "AI features")) points.push("Pin “AI” down to one concrete use case, or move it to v2.");
    if (has(features, "Payments") || has(features, "KYC / identity verification")) points.push("Confirm payment processor / KYC vendor and who owns their accounts.");
    if (a.industry === "Healthtech") points.push("Confirm where health data is stored and who is the privacy officer.");
    if (has(compliance, "Not sure")) points.push("Compliance obligations unknown — scope a compliance review into discovery.");
    else if (compliance.length && !has(compliance, "None")) points.push("Compliance in scope (" + compliance.join(", ") + ") — price the controls into the milestones.");
    if (a.currentSolution === "Existing in-house product") points.push("Existing product — check data migration and code/infra access.");
    if (a.integrations && a.integrations.trim()) points.push("Confirm API access and sandbox accounts for: " + a.integrations.trim() + ".");

    var out = flags.map(function (t) { return { text: t, flag: true }; })
      .concat(points.map(function (t) { return { text: t, flag: false }; }))
      .slice(0, 8);
    var close = score.verdict.code === "call"
      ? "Close the call by booking Intake; send the discovery brief template the same day."
      : "Below the 3.5 threshold — decide on the call: nurture sequence or polite no + referral.";
    out.push({ text: close, flag: false });
    return out;
  }

  /* ---------- Render ---------- */
  function render(r) {
    record = r;
    var a = r.answers || {};
    var D = function (k) { return Jidoka.display(a, k); };
    var score = Jidoka.scoreLead(a);

    var company = (a.company && a.company.trim()) || "Unnamed company";
    document.title = "LQP — " + company + " (" + score.display + ")";

    // Header
    $("pCompany").textContent = company;
    text("pContact", [a.name, a.role].filter(Boolean).join(", "));
    text("pEmail", a.email);
    text("pDate", formatDate(r.submittedAt));
    text("pRef", r.ref);
    text("pSource", D("source"));

    $("pScore").textContent = score.display;
    $("pVerdict").textContent = score.verdict.label;
    $("pScoreBox").className = "score score--" + score.verdict.code;
    var tbody = $("pScorecard");
    tbody.innerHTML = "";
    score.rows.forEach(function (row) {
      var tr = document.createElement("tr");
      [row.label, Math.round(row.weight * 100) + "%", row.score + "/5", row.weighted.toFixed(2)].forEach(function (v) {
        var td = document.createElement("td");
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });

    // Section 1 — Gatekeepers
    text("pIndustry", a.industry);
    text("pProjectType", a.projectType);
    text("pBudget", a.budget);
    text("pTimeline", TIMELINE_DESC[a.timeline] || a.timeline);
    $("pHardDate").textContent = a.hardDate ? a.hardDate.trim() : "";

    // Section 2 — Brief
    text("pProblem", a.problem);
    text("pCurrent", D("currentSolution"));
    text("pVision", a.sixMonths);
    text("pMustHave", a.mustHave);
    var features = D("features") ? D("features").split(", ") : [];
    chips("pFeatures", features, a.mustHave);
    var scope = [
      ["Platform", a.platform],
      ["Integrations", a.integrations && a.integrations.trim()],
      ["Compliance", D("compliance")]
    ].filter(function (x) { return x[1]; });
    var scopeEl = $("pScope");
    scopeEl.innerHTML = "";
    scope.forEach(function (x, i) {
      if (i) scopeEl.appendChild(document.createTextNode(" · "));
      var b = document.createElement("strong"); b.textContent = x[0] + ": ";
      scopeEl.appendChild(b);
      scopeEl.appendChild(document.createTextNode(x[1]));
    });
    var decision = D("decisionMakers");
    if (a.decisionNames && a.decisionNames.trim()) decision += (decision ? " — " : "") + a.decisionNames.trim();
    text("pDecision", decision);

    // Section 3 — Call prep
    var ul = $("pPrep");
    ul.innerHTML = "";
    prepPoints(a, score).forEach(function (p) {
      var li = document.createElement("li");
      if (p.flag) {
        li.className = "is-flag";
        var tag = document.createElement("strong");
        tag.textContent = "Red flag: ";
        li.appendChild(tag);
      }
      li.appendChild(document.createTextNode(p.text));
      ul.appendChild(li);
    });

    $("pFootRef").textContent = (r.ref || "") + " · " + company + " · Score " + score.display + " / 5";

    $("sheet").hidden = false;
    $("emptyState").hidden = true;
    fitToPage();
    fitToScreen();
  }

  /* Shrink the base font until the sheet's content fits one A4 page */
  function fitToPage() {
    var sheet = $("sheet");
    var notes = sheet.querySelector(".notes");
    var size = 12.5;
    sheet.classList.remove("is-tight");
    sheet.style.setProperty("--fs", size + "px");
    var overflowing = function () {
      // the notes area flexes; measure real content by collapsing it
      notes.style.flex = "0 0 auto";
      var over = sheet.scrollHeight > sheet.clientHeight + 1;
      notes.style.flex = "";
      return over;
    };
    while (overflowing() && size > 9) {
      size -= 0.5;
      sheet.style.setProperty("--fs", size + "px");
    }
    if (overflowing()) sheet.classList.add("is-tight");
  }

  /* Scale the 794px sheet down on narrow screens */
  function fitToScreen() {
    var sheet = $("sheet");
    var avail = document.documentElement.clientWidth - 32;
    sheet.style.zoom = avail < 794 ? String(avail / 794) : "";
  }

  function showEmpty(msg) {
    $("sheet").hidden = true;
    $("emptyState").hidden = false;
    if (msg) $("emptyMsg").textContent = msg;
    ["copyLink", "downloadJson", "printBtn"].forEach(function (id) { $(id).disabled = true; });
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove("is-visible"); }, 1800);
  }

  /* ---------- Actions ---------- */
  $("printBtn").addEventListener("click", function () { window.print(); });

  $("downloadJson").addEventListener("click", function () {
    if (!record) return;
    var out = JSON.parse(JSON.stringify(record));
    out.score = Jidoka.scoreLead(out.answers || {});
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    var slug = (record.answers.company || "lead").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = URL.createObjectURL(blob);
    a.download = (record.ref || "lqp") + "-" + (slug || "lead") + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $("copyLink").addEventListener("click", function () {
    if (!record) return;
    Jidoka.encodeRecord(record).then(function (enc) {
      var url = Jidoka.profileUrl(enc, location.href);
      return navigator.clipboard.writeText(url);
    }).then(function () { toast("Link copied"); })
      .catch(function () { toast("Couldn't copy — use the address bar"); });
  });

  window.addEventListener("resize", function () { if (record) fitToScreen(); });
  window.addEventListener("hashchange", function () { start(); });
  window.addEventListener("beforeprint", function () { $("sheet").style.zoom = ""; });
  window.addEventListener("afterprint", function () { if (record) fitToScreen(); });

  function start() {
    load().then(function (r) {
      if (r && r.answers) render(r);
      else showEmpty();
    }).catch(function () {
      showEmpty("This packet link looks broken or incomplete — open it again from the email.");
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
