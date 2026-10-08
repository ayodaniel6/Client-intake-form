/* =========================================================
   PRE-CALL SHARED HELPERS
   Used by both the form (index.html) and the one-page
   project profile (profile.html).
   ========================================================= */
(function (global) {
  "use strict";

  /* Every answer, in the order it appears in the email and profile.
     key: answers key · label: human label · step: screen to edit it on */
  var FIELDS = [
    { key: "name",            label: "Client name",              step: 1 },
    { key: "email",           label: "Client email",             step: 1 },
    { key: "projectName",     label: "Project name",             step: 1 },
    { key: "platform",        label: "Platform",                 step: 1 },
    { key: "problem",         label: "Main problem",             step: 2 },
    { key: "currentSolution", label: "How it's handled today",   step: 2 },
    { key: "sixMonths",       label: "If it works — in 6 months", step: 2 },
    { key: "users",           label: "Who's using it",           step: 3 },
    { key: "device",          label: "Devices",                  step: 3 },
    { key: "features",        label: "Features",                 step: 4 },
    { key: "mustHave",        label: "Launch must-have (the ONE)", step: 4 },
    { key: "integrations",    label: "Needs to connect with",    step: 4 },
    { key: "personality",     label: "Personality",              step: 5 },
    { key: "inspirationUrl",  label: "Inspiration link",         step: 5 },
    { key: "antiVibe",        label: "Should NOT feel like",     step: 5 },
    { key: "timeline",        label: "Timeline",                 step: 6 },
    { key: "decisionMakers",  label: "Who else says yes",        step: 6 }
  ];

  /* Turn one answer into display text, folding in "Something else" follow-ups. */
  function display(answers, key) {
    var v = answers[key];
    if (key === "currentSolution" && v === "Something else" && answers.currentSolutionOther) {
      v = "Something else: " + answers.currentSolutionOther;
    }
    if (key === "features" && Array.isArray(v)) {
      v = v.map(function (x) {
        return x === "Something else" && answers.featuresOther ? "Something else: " + answers.featuresOther : x;
      });
    }
    if (Array.isArray(v)) v = v.join(", ");
    return v && String(v).trim() ? String(v).trim() : "";
  }

  /* Short, human-friendly reference, e.g. PC-261008-K3QF */
  function makeRef(date) {
    var d = date || new Date();
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    var tail = "";
    for (var i = 0; i < 4; i++) tail += chars[Math.floor(Math.random() * chars.length)];
    return "PC-" + String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + tail;
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
      return Promise.reject(new Error("Unsupported profile link"));
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /* Absolute link to profile.html next to the current page */
  function profileUrl(encoded, base) {
    return new URL("profile.html", base || global.location.href).href.split("#")[0] + "#d=" + encoded;
  }

  /* Flat, labelled fields for the Formspree email (keys show as row labels). */
  function emailFields(record, link) {
    var a = record.answers;
    var title = a.projectName && a.projectName.trim() ? a.projectName.trim() : "Untitled project";
    var out = {
      _subject: "New pre-call: " + title + " — " + (a.name || "New client") + " (" + record.ref + ")",
      _replyto: a.email || "",
      "Reference": record.ref,
      "📄 One-page project profile": link
    };
    FIELDS.forEach(function (f) { out[f.label] = display(a, f.key) || "—"; });
    out["Submitted at"] = new Date(record.submittedAt).toUTCString();
    return out;
  }

  global.PreCall = {
    FIELDS: FIELDS,
    display: display,
    makeRef: makeRef,
    encodeRecord: encodeRecord,
    decodeRecord: decodeRecord,
    profileUrl: profileUrl,
    emailFields: emailFields,
    LAST_RECORD_KEY: "precall-last-record"
  };
})(window);
