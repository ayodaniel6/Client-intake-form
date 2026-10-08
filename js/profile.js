/* =========================================================
   PROJECT PROFILE — renders one pre-call submission as a
   single A4 page. Data comes from (in order):
     1. #d=<encoded>  (the link in the Formspree email)
     2. ?sample=1     (demo data, to preview the layout)
     3. the last submission made in this browser
   ========================================================= */
(function () {
  "use strict";

  var EMOJI = {
    "Website": "🌐", "Mobile App": "📱", "Both": "🌐📱", "Not sure yet": "🤷",
    "My customers": "👤", "My team": "👥", "My partners": "🤝", "Just me": "🔐", "The public": "🌍",
    "Desktop / Laptop": "💻", "Phone": "📱", "Not sure": "🤷",
    "Accounts": "🔐", "Payments": "💳", "Bookings": "📅", "Orders": "🧾", "Messaging": "💬",
    "Dashboard": "📊", "Notifications": "🔔", "Reports": "📈", "Search": "🔎", "Social login": "🌐",
    "AI (maybe)": "🤖", "File uploads": "🗂️", "Blog & articles": "📝", "Comments": "🗨️",
    "Newsletter": "📧", "Categories & tags": "🏷️", "Media gallery": "🖼️", "Something else": "✨",
    "No rush": "🐢", "A few months": "🐇", "ASAP": "🚀",
    "Serious and Elegant": "🎩", "Minimal and Simple": "🤍", "Plain and Neutral": "🏢",
    "Bold and Confident": "🔥", "Calm and Peaceful": "🌿", "Startup and Upbeat": "🚀", "Playful and Fun": "🎈"
  };

  var TIMELINE_DESC = {
    "No rush": "No rush — exploring",
    "A few months": "A few months — plan properly",
    "ASAP": "ASAP — needed yesterday"
  };

  var SAMPLE = {
    v: 1, layer: "pre-call", ref: "PC-SAMPLE-0001", submittedAt: new Date().toISOString(),
    answers: {
      name: "Sarah Okafor", email: "sarah@glowsalon.example", projectName: "Glow Salon App",
      platform: "Both",
      problem: "I'm losing track of bookings in my Instagram DMs and missing sales. Clients double-book and I spend evenings confirming appointments by hand.",
      currentSolution: "Duct tape and hope", currentSolutionOther: "",
      sixMonths: "Clients book and pay deposits on their own, my two stylists see their day at a glance, and no-shows drop by half.",
      users: ["My customers", "My team"], device: ["Phone", "Desktop / Laptop"],
      features: ["Bookings", "Payments", "Accounts", "Notifications", "Dashboard", "Media gallery"], featuresOther: "",
      mustHave: "Bookings", integrations: "Instagram, Google Calendar, Paystack",
      personality: "Calm and Peaceful", inspirationUrl: "https://www.aesop.com",
      antiVibe: "Cluttered, loud, feels like a 2010 WordPress theme.",
      timeline: "A few months", decisionMakers: "My business partner"
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var record = null;

  /* ---------- Load ---------- */
  function load() {
    var hash = location.hash.replace(/^#/, "");
    var match = /(?:^|&)d=([^&]+)/.exec(hash);
    if (match) return PreCall.decodeRecord(match[1]);
    if (/[?&]sample=1/.test(location.search)) return Promise.resolve(SAMPLE);
    try {
      var last = localStorage.getItem(PreCall.LAST_RECORD_KEY);
      if (last) return Promise.resolve(JSON.parse(last));
    } catch (e) { /* ignore */ }
    return Promise.resolve(null);
  }

  /* ---------- Helpers ---------- */
  function text(id, value, fallback) {
    var el = $(id);
    if (value) { el.textContent = value; el.classList.remove("muted"); }
    else { el.textContent = fallback || "Not shared"; el.classList.add("muted"); }
  }
  function withEmoji(v) { return v ? ((EMOJI[v] ? EMOJI[v] + " " : "") + v) : ""; }
  function list(v) { return Array.isArray(v) ? v : (v ? [v] : []); }
  function has(arr, v) { return list(arr).indexOf(v) > -1; }

  function chips(id, items, keyItem) {
    var host = $(id);
    host.innerHTML = "";
    if (!items.length) {
      var none = document.createElement("span");
      none.className = "muted";
      none.textContent = "None picked";
      host.appendChild(none);
      return;
    }
    items.forEach(function (item) {
      var c = document.createElement("span");
      c.className = "chip" + (keyItem && item.toLowerCase() === keyItem.toLowerCase() ? " chip--key" : "");
      c.textContent = item.indexOf("Something else: ") === 0
        ? "✨ " + item.slice("Something else: ".length)
        : withEmoji(item);
      host.appendChild(c);
    });
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------- Talking points for the call, derived from the answers ---------- */
  function prepPoints(a) {
    var p = [];
    var features = list(a.features);
    var users = list(a.users);
    var devices = list(a.device);

    if (a.timeline === "ASAP") p.push("Tight timeline — propose a phased launch with the must-have first.");
    if (a.timeline === "No rush") p.push("Exploratory — focus on clarity and scope before cost.");
    if (a.platform === "Not sure yet") p.push("Help them choose: website, mobile app, or both.");
    if (a.platform === "Website" && has(devices, "Phone")) p.push("Users are on phones — design the website mobile-first.");
    if (a.platform === "Both") p.push("Web + app: agree which ships first, or build one responsive web app.");
    if (has(devices, "Not sure")) p.push("Work out where their users actually are (desktop vs phone).");
    if (has(users, "My customers") && (has(users, "My team") || has(users, "My partners"))) {
      p.push("Multiple user types — plan roles & permissions (customer side vs admin side).");
    }
    if (features.length >= 8) p.push("Big wishlist (" + features.length + " features) — agree an MVP built around “" + (a.mustHave || "the must-have") + "”.");
    if (has(features, "Payments")) p.push("Confirm payment provider, currency and fees (e.g. Paystack, Stripe).");
    if (has(features, "AI (maybe)")) p.push("Ask what “AI” means to them — find one concrete use case.");
    if (has(features, "Blog & articles") || has(features, "Newsletter")) p.push("Content plan: who writes, how often, and do they need an easy editor (CMS)?");
    if (has(features, "Something else") && a.featuresOther) p.push("Dig into their custom request: “" + a.featuresOther + "”.");
    if (a.currentSolution === "An old website") p.push("Existing site — check content/data migration, domain and hosting access.");
    if (a.currentSolution === "The spreadsheet dungeon") p.push("Ask for a copy of the spreadsheet — it's the real data model.");
    if (a.integrations && a.integrations.trim()) p.push("Check API access / accounts for: " + a.integrations.trim() + ".");
    if (!a.inspirationUrl) p.push("Ask for one site or app they love the look of.");
    if (a.decisionMakers && !/^\s*(just\s+)?me\s*\.?$/i.test(a.decisionMakers)) {
      p.push("Other approvers (" + a.decisionMakers.trim() + ") — invite them or plan a recap.");
    }
    p = p.slice(0, 7);
    p.push("Confirm budget range and how they'll measure success.");
    return p;
  }

  /* ---------- Render ---------- */
  function render(r) {
    record = r;
    var a = r.answers || {};
    var D = function (k) { return PreCall.display(a, k); };

    document.title = (a.projectName || "Untitled project") + " — Project Profile";
    $("pTitle").textContent = (a.projectName && a.projectName.trim()) || "Untitled project";

    var meta = $("pMeta");
    meta.innerHTML = "";
    var parts = [
      ["Client", a.name],
      ["Email", a.email],
      ["Submitted", formatDate(r.submittedAt)],
      ["Ref", r.ref]
    ].filter(function (x) { return x[1]; });
    parts.forEach(function (x, i) {
      if (i) { var s = document.createElement("span"); s.className = "sep"; s.textContent = "•"; meta.appendChild(s); }
      meta.appendChild(document.createTextNode(x[0] + ": "));
      var b = document.createElement("strong"); b.textContent = x[1]; meta.appendChild(b);
    });

    text("pPlatform", withEmoji(a.platform));
    text("pDevices", list(a.device).map(withEmoji).join(" + "));
    text("pTimeline", withEmoji(a.timeline));
    text("pPersonality", withEmoji(a.personality));

    text("pProblem", a.problem);
    text("pToday", D("currentSolution"));
    text("pDream", a.sixMonths);

    text("pPersonality2", a.personality);
    var inspo = $("pInspo");
    inspo.innerHTML = "";
    if (a.inspirationUrl) {
      var link = document.createElement("a");
      link.href = /^https?:\/\//i.test(a.inspirationUrl) ? a.inspirationUrl : "https://" + a.inspirationUrl;
      link.target = "_blank"; link.rel = "noopener noreferrer";
      link.textContent = a.inspirationUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      inspo.appendChild(link);
      inspo.classList.remove("muted");
    } else { text("pInspo", ""); }
    text("pAvoid", a.antiVibe);

    chips("pUsers", list(a.users));
    var features = D("features") ? D("features").split(", ") : [];
    chips("pFeatures", features, a.mustHave);
    $("pFeatureCount").textContent = features.length ? String(features.length) : "";
    text("pMustHave", a.mustHave);
    text("pIntegrations", a.integrations);

    text("pTimeline2", TIMELINE_DESC[a.timeline] || a.timeline);
    text("pApprovers", a.decisionMakers);

    var ul = $("pPrep");
    ul.innerHTML = "";
    prepPoints(a).forEach(function (t) {
      var li = document.createElement("li"); li.textContent = t; ul.appendChild(li);
    });

    $("pFootRef").textContent = (r.ref || "") + (a.name ? " · " + a.name : "");

    $("sheet").hidden = false;
    $("emptyState").hidden = true;
    fitToPage();
    fitToScreen();
  }

  /* Shrink the base font until the sheet's content fits one A4 page */
  function fitToPage() {
    var sheet = $("sheet");
    var size = 13;
    sheet.classList.remove("is-tight");
    sheet.style.setProperty("--fs", size + "px");
    var overflowing = function () {
      // notes area flexes; measure real content by collapsing it
      sheet.querySelector(".notes").style.flex = "0 0 auto";
      var over = sheet.scrollHeight > sheet.clientHeight + 1;
      sheet.querySelector(".notes").style.flex = "";
      return over;
    };
    while (overflowing() && size > 9) {
      size -= 0.5;
      sheet.style.setProperty("--fs", size + "px");
    }
    if (overflowing()) sheet.classList.add("is-tight");
    if (overflowing()) sheet.querySelector(".notes").style.display = "none";
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
    var blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    var slug = (record.answers.projectName || "project").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.href = URL.createObjectURL(blob);
    a.download = (record.ref || "pre-call") + "-" + (slug || "project") + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });

  $("copyLink").addEventListener("click", function () {
    if (!record) return;
    PreCall.encodeRecord(record).then(function (enc) {
      var url = PreCall.profileUrl(enc, location.href);
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
      showEmpty("This profile link looks broken or incomplete — try opening it again from the email.");
    });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
})();
