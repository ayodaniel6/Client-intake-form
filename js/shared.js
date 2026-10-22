/* =========================================================
   JIDOKA LEAD QUALIFICATION — SHARED HELPERS
   Used by both the tollgate form (index.html) and the
   Lead Qualification Packet (profile.html).
   ========================================================= */
(function (global) {
  "use strict";

  /* Every answer, in the order it appears in the email and review.
     key: answers key · label: human label · step: screen to edit it on */
  var FIELDS = [
    { key: "name",           label: "Contact name",          step: 1 },
    { key: "role",           label: "Role / title",          step: 1 },
    { key: "email",          label: "Work email",            step: 1 },
    { key: "company",        label: "Company",               step: 1 },
    { key: "source",         label: "Source",                step: 1 },
    { key: "industry",       label: "Industry",              step: 2 },
    { key: "projectType",    label: "Project type",          step: 2 },
    { key: "budget",         label: "Budget range",          step: 2 },
    { key: "problem",        label: "The problem",           step: 3 },
    { key: "currentSolution", label: "Current solution",     step: 3 },
    { key: "sixMonths",      label: "6-month vision",        step: 3 },
    { key: "platform",       label: "Platform",              step: 4 },
    { key: "features",       label: "Features",              step: 4 },
    { key: "mustHave",       label: "Launch must-have",      step: 4 },
    { key: "integrations",   label: "Integrations",          step: 4 },
    { key: "compliance",     label: "Compliance",            step: 4 },
    { key: "timeline",       label: "Timeline",              step: 5 },
    { key: "hardDate",       label: "Date driving the timeline", step: 5 },
    { key: "decisionMakers", label: "Decision makers",       step: 5 },
    { key: "decisionNames",  label: "Decision makers (names)", step: 5 },
    { key: "engagement",     label: "Engagement model",      step: 5 }
  ];

  /* ---------- Layer 01 service capability: the gatekeepers ---------- */
  var GATES = [
    {
      key: "industry",
      fails: ["Other"],
      message: "We currently specialize in Fintech, Healthtech, and Edtech. We'll keep your email, but we may not be the right fit."
    },
    {
      key: "projectType",
      fails: ["Legacy PHP", "Crypto/Blockchain"],
      message: "We do not take on legacy rescues or crypto projects. We wish you the best."
    },
    {
      key: "budget",
      fails: ["Under $5,000 CAD"],
      message: "Our minimum engagement is $5,000 CAD. We cannot accommodate this budget."
    }
  ];

  /* Returns the first gate the answers fail, or null if they pass all three. */
  function checkGates(answers) {
    for (var i = 0; i < GATES.length; i++) {
      var g = GATES[i];
      if (g.fails.indexOf(answers[g.key]) > -1) {
        return { key: g.key, value: answers[g.key], message: g.message };
      }
    }
    return null;
  }

  /* ---------- Layer 01 lead scoring rubric (weighted, 1–5) ---------- */
  var C_LEVEL = ["Founder / CEO", "CTO / Technical co-founder", "Other C-level (CFO, COO)"];

  function scoreDecision(list) {
    list = Array.isArray(list) ? list : [];
    if (list.some(function (d) { return C_LEVEL.indexOf(d) > -1; })) return 5;
    if (!list.length || list.indexOf("Not sure") > -1) return 1;
    return 3;
  }

  var RUBRIC = [
    { key: "budget",    label: "Budget fit",               weight: 0.25,
      rate: function (a) { return { "$15,000+ CAD": 5, "$5,000–$15,000 CAD": 3 }[a.budget] || 1; } },
    { key: "urgency",   label: "Problem & urgency",        weight: 0.20,
      rate: function (a) { return { "1–3 months": 5, "3+ months": 3, "ASAP": 2 }[a.timeline] || 1; } },
    { key: "decision",  label: "Decision-maker access",    weight: 0.20,
      rate: function (a) { return scoreDecision(a.decisionMakers); } },
    { key: "timeline",  label: "Timeline fit",             weight: 0.15,
      rate: function (a) { return { "1–3 months": 5, "3+ months": 4, "ASAP": 2 }[a.timeline] || 1; } },
    { key: "service",   label: "Service fit",              weight: 0.10,
      rate: function (a) { return a.projectType === "New MVP" ? 5 : 3; } },
    { key: "strategic", label: "Strategic value",          weight: 0.10,
      rate: function (a) { return a.industry === "Fintech" || a.industry === "Healthtech" ? 5 : 3; } }
  ];

  /* Threshold from the playbook: ≥ 3.5 books a call, 2.5–3.4 nurture, below 2.5 polite no. */
  function verdict(total) {
    if (total >= 3.5) return { code: "call", label: "Book the call" };
    if (total >= 2.5) return { code: "nurture", label: "Nurture sequence" };
    return { code: "no", label: "Polite no + referral" };
  }

  function scoreLead(answers) {
    var rows = RUBRIC.map(function (c) {
      var s = c.rate(answers);
      return { key: c.key, label: c.label, weight: c.weight, score: s, weighted: s * c.weight };
    });
    var total = rows.reduce(function (sum, r) { return sum + r.weighted; }, 0);
    total = Math.round(total * 10) / 10;
    return { total: total, display: total.toFixed(1), rows: rows, verdict: verdict(total) };
  }

  /* Free-mail domains: not a disqualifier, but a flag for the call. */
  function isPersonalEmail(email) {
    var domain = String(email || "").split("@")[1] || "";
    return /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|proton|protonmail|gmx|mail|zoho)\./i.test(domain);
  }

  /* Turn one answer into display text, folding in "Other" follow-ups. */
  function display(answers, key) {
    var v = answers[key];
    if (key === "currentSolution" && v === "Other" && answers.currentSolutionOther) {
      v = "Other: " + answers.currentSolutionOther;
    }
    if (key === "features" && Array.isArray(v)) {
      v = v.map(function (x) {
        return x === "Other" && answers.featuresOther ? "Other: " + answers.featuresOther : x;
      });
    }
    if (key === "source" && answers.campaign) {
      v = (v ? v + " · " : "") + answers.campaign;
    }
    if (Array.isArray(v)) v = v.join(", ");
    return v && String(v).trim() ? String(v).trim() : "";
  }

  /* Short, human-friendly reference, e.g. JD-261022-K3QF */
  function makeRef(date) {
    var d = date || new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var tail = "";
    for (var i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    return "JD-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + tail;
  }

  /* ---------- base64url helpers ---------- */
  function bytesToB64url(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlToBytes(str) {
    var b64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function streamThrough(bytes, transform) {
    return new Response(new Blob([bytes]).stream().pipeThrough(transform)).arrayBuffer()
      .then(function (buf) { return new Uint8Array(buf); });
  }

  /* Pack a record into a URL-safe string. Compressed ("z.") where the
     browser supports it, plain ("j.") otherwise. Returns a Promise. */
  function encodeRecord(record) {
    var bytes = new TextEncoder().encode(JSON.stringify(record));
    if (typeof CompressionStream === "function") {
      return streamThrough(bytes, new CompressionStream("deflate-raw"))
        .then(function (out) { return "z." + bytesToB64url(out); })
        .catch(function () { return "j." + bytesToB64url(bytes); });
    }
    return Promise.resolve("j." + bytesToB64url(bytes));
  }

  function decodeRecord(str) {
    try {
      var kind = str.slice(0, 2);
      var bytes = b64urlToBytes(str.slice(2));
      var parse = function (b) { return JSON.parse(new TextDecoder().decode(b)); };
      if (kind === "j.") return Promise.resolve(parse(bytes));
      if (kind === "z." && typeof DecompressionStream === "function") {
        return streamThrough(bytes, new DecompressionStream("deflate-raw")).then(parse);
      }
      return Promise.reject(new Error("Unsupported packet link"));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /* Absolute link to profile.html next to the current page */
  function profileUrl(encoded, base) {
    return new URL("profile.html", base || global.location.href).href.split("#")[0] + "#d=" + encoded;
  }

  /* Flat, labelled fields for the Formspree email (keys show as row labels).
     The subject leads with the score so the inbox sorts itself. */
  function emailFields(record, link) {
    var a = record.answers;
    var s = record.score;
    var company = a.company && a.company.trim() ? a.company.trim() : "Unnamed company";
    var out = {
      _subject: "[LQP " + s.display + " · " + s.verdict.label + "] " + company + " — " + (a.name || "New lead") + " (" + record.ref + ")",
      _replyto: a.email || "",
      "Reference": record.ref,
      "Lead score": s.display + " / 5 — " + s.verdict.label,
      "Lead Qualification Packet": link
    };
    s.rows.forEach(function (r) {
      out["Score · " + r.label + " (" + Math.round(r.weight * 100) + "%)"] = r.score + " / 5";
    });
    FIELDS.forEach(function (f) { out[f.label] = display(a, f.key) || "—"; });
    out["Submitted at"] = new Date(record.submittedAt).toUTCString();
    return out;
  }

  global.Jidoka = {
    FIELDS: FIELDS,
    GATES: GATES,
    RUBRIC: RUBRIC,
    C_LEVEL: C_LEVEL,
    checkGates: checkGates,
    scoreLead: scoreLead,
    isPersonalEmail: isPersonalEmail,
    display: display,
    makeRef: makeRef,
    encodeRecord: encodeRecord,
    decodeRecord: decodeRecord,
    profileUrl: profileUrl,
    emailFields: emailFields,
    LAST_RECORD_KEY: "jidoka-last-lqp"
  };
})(window);
