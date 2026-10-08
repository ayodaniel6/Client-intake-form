(function () {
  "use strict";

  /* =========================================================
     CONFIG
     SUBMIT_ENDPOINT: where answers are POSTed (Formspree form URL).
     Leave empty to keep everything client-side (the payload is
     logged to the console instead of being sent).
     ========================================================= */
  var SUBMIT_ENDPOINT = "https://formspree.io/f/xgaoknoy";
  var STORAGE_KEY = "intake-form-v3";
  var TOTAL_STEPS = 6;
  var LAST_SCREEN = 7;

  var form = document.getElementById("intakeForm");
  var screens = Array.prototype.slice.call(document.querySelectorAll(".screen"));
  var progress = document.getElementById("progress");
  var progressFill = document.getElementById("progressFill");
  var progressLabel = document.getElementById("progressLabel");
  var savedIndicator = document.getElementById("savedIndicator");
  var liveRegion = document.getElementById("liveRegion");
  var featureCounter = document.getElementById("featureCounter");
  var featureList = document.getElementById("featureList");

  var state = {
    screen: 0,
    submitted: false,
    ref: "",
    profileLink: "",
    answers: {
      name: "",
      email: "",
      projectName: "",
      platform: "",
      problem: "",
      currentSolution: "",
      currentSolutionOther: "",
      sixMonths: "",
      users: [],
      device: [],
      features: [],
      featuresOther: "",
      mustHave: "",
      integrations: "",
      personality: "",
      inspirationUrl: "",
      antiVibe: "",
      timeline: "",
      decisionMakers: ""
    }
  };

  var current = 0;
  var transitioning = false;

  /* =========================================================
     STORAGE
     ========================================================= */
  function save(showIndicator) {
    state.screen = current;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage unavailable — fine, keep going */ }
    if (showIndicator) flashSaved();
  }

  var savedTimer = null;
  function flashSaved() {
    savedIndicator.classList.add("is-visible");
    clearTimeout(savedTimer);
    savedTimer = setTimeout(function () { savedIndicator.classList.remove("is-visible"); }, 1600);
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var saved = JSON.parse(raw);
      if (!saved || !saved.answers) return false;
      Object.keys(state.answers).forEach(function (k) {
        var v = saved.answers[k];
        if (v === undefined) return;
        if (Array.isArray(state.answers[k]) && !Array.isArray(v)) v = v ? [v] : [];
        state.answers[k] = v;
      });
      state.screen = typeof saved.screen === "number" ? saved.screen : 0;
      state.submitted = !!saved.submitted;
      state.ref = saved.ref || "";
      state.profileLink = saved.profileLink || "";
      return true;
    } catch (e) {
      return false;
    }
  }

  /* =========================================================
     HYDRATE UI FROM STATE
     ========================================================= */
  function hydrate() {
    var a = state.answers;
    Object.keys(a).forEach(function (key) {
      var q = form.querySelector('[data-question="' + key + '"]');
      var input = form.querySelector('[name="' + key + '"]');
      if (input && typeof a[key] === "string") input.value = a[key];
      if (!q) return;
      var type = q.getAttribute("data-type");
      if (type === "single" || type === "multi") {
        var vals = Array.isArray(a[key]) ? a[key] : (a[key] ? [a[key]] : []);
        q.querySelectorAll(".card").forEach(function (card) {
          card.setAttribute("aria-checked", vals.indexOf(card.getAttribute("data-value")) > -1 ? "true" : "false");
        });
      }
    });
    syncReveal();
    updateFeatureCounter(false);
  }

  /* =========================================================
     CARD SELECTION
     ========================================================= */
  form.addEventListener("click", function (e) {
    var card = e.target.closest(".card");
    if (!card) return;
    var q = card.closest("[data-question]");
    var key = q.getAttribute("data-question");
    var type = q.getAttribute("data-type");
    var value = card.getAttribute("data-value");

    if (type === "single") {
      q.querySelectorAll(".card").forEach(function (c) {
        c.setAttribute("aria-checked", c === card ? "true" : "false");
      });
      state.answers[key] = value;
    } else if (type === "multi") {
      var on = card.getAttribute("aria-checked") !== "true";
      card.setAttribute("aria-checked", on ? "true" : "false");
      // An "exclusive" card (e.g. "Not sure") can't be combined with the others
      if (on) {
        var exclusive = card.hasAttribute("data-exclusive");
        q.querySelectorAll(".card").forEach(function (c) {
          if (c !== card && (exclusive || c.hasAttribute("data-exclusive"))) c.setAttribute("aria-checked", "false");
        });
      }
      state.answers[key] = Array.prototype.slice.call(q.querySelectorAll('.card[aria-checked="true"]'))
        .map(function (c) { return c.getAttribute("data-value"); });
      if (key === "features") updateFeatureCounter(true);
    }

    clearError(q);
    if (card.hasAttribute("data-reveal") || q.querySelector("[data-reveal]")) syncReveal(card);
    save(true);
  });

  /* Arrow-key navigation inside radio groups & grids */
  form.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (keys.indexOf(e.key) === -1) return;
    var group = card.parentElement;
    var cards = Array.prototype.slice.call(group.querySelectorAll(".card"));
    var i = cards.indexOf(card);
    var forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    var next = cards[(i + (forward ? 1 : -1) + cards.length) % cards.length];
    e.preventDefault();
    next.focus();
    if (card.getAttribute("role") === "radio") next.click();
  });

  /* Text inputs */
  form.addEventListener("input", function (e) {
    var el = e.target;
    if (!el.name || !(el.name in state.answers)) return;
    state.answers[el.name] = el.value;
    var q = el.closest("[data-question]");
    if (q && q.classList.contains("has-error") && isQuestionValid(q)) clearError(q);
    debouncedSave();
  });

  var saveDebounce = null;
  function debouncedSave() {
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(function () { save(true); }, 450);
  }

  /* Enter key advances on single-line inputs */
  form.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" || e.shiftKey || e.isComposing) return;
    var el = e.target;
    if (el.tagName === "INPUT" && el.type !== "button") {
      e.preventDefault();
      var screen = el.closest(".screen");
      var nextBtn = screen.querySelector('[data-action="next"]');
      if (nextBtn) nextBtn.click();
    }
  });

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  /* =========================================================
     CONDITIONAL REVEAL (Q2.2 "Something else")
     ========================================================= */
  function syncReveal(focusFrom) {
    form.querySelectorAll("[data-reveal]").forEach(function (trigger) {
      var reveal = document.getElementById(trigger.getAttribute("data-reveal"));
      var input = reveal.querySelector(".input");
      var open = trigger.getAttribute("aria-checked") === "true";
      reveal.classList.toggle("is-open", open);
      reveal.setAttribute("aria-hidden", open ? "false" : "true");
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      input.tabIndex = open ? 0 : -1;
      if (open && focusFrom === trigger) {
        setTimeout(function () { input.focus({ preventScroll: true }); }, 250);
      }
    });
  }

  /* =========================================================
     FEATURE COUNTER + DATALIST
     ========================================================= */
  var counterMessages = [
    "Nothing picked yet — go on, tap a few.",
    "Nice start.",
    "Now we're cooking.",
    "Love it — the shape is forming.",
    "Ambitious. I like it.",
    "A proper platform. Let's do it."
  ];
  function updateFeatureCounter(bump) {
    var n = state.answers.features.length;
    var msg;
    if (n === 0) msg = counterMessages[0];
    else if (n <= 2) msg = counterMessages[1];
    else if (n <= 4) msg = counterMessages[2];
    else if (n <= 6) msg = counterMessages[3];
    else if (n <= 9) msg = counterMessages[4];
    else msg = counterMessages[5];
    featureCounter.innerHTML = n === 0 ? msg : "<strong>" + n + "</strong> picked · " + msg;
    if (bump) {
      featureCounter.classList.remove("bump");
      void featureCounter.offsetWidth;
      featureCounter.classList.add("bump");
    }
    featureList.innerHTML = "";
    state.answers.features.filter(function (f) { return f !== "Something else"; }).forEach(function (f) {
      var opt = document.createElement("option");
      opt.value = f;
      featureList.appendChild(opt);
    });
  }

  /* =========================================================
     VALIDATION
     ========================================================= */
  function isQuestionValid(q) {
    var key = q.getAttribute("data-question");
    var type = q.getAttribute("data-type");
    var required = q.getAttribute("data-required") === "true";
    var val = state.answers[key];

    if (type === "email") {
      if (!val || !val.trim()) return !required;
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val.trim());
    }
    if (type === "url") {
      if (!val || !val.trim()) return !required;
      return looksLikeUrl(val.trim());
    }
    if (!required) return true;
    if (type === "multi") return Array.isArray(val) && val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  }

  function looksLikeUrl(v) {
    var candidate = /^https?:\/\//i.test(v) ? v : "https://" + v;
    try {
      var u = new URL(candidate);
      return /\./.test(u.hostname);
    } catch (e) {
      return false;
    }
  }

  function showError(q) {
    q.classList.add("has-error");
    q.classList.remove("shake");
    void q.offsetWidth;
    q.classList.add("shake");
    var field = q.querySelector(".input, .textarea");
    if (field) field.setAttribute("aria-invalid", "true");
  }
  function clearError(q) {
    q.classList.remove("has-error", "shake");
    var field = q.querySelector(".input, .textarea");
    if (field) field.removeAttribute("aria-invalid");
  }

  function validateScreen(screenEl) {
    var questions = Array.prototype.slice.call(screenEl.querySelectorAll("[data-question]"));
    var firstInvalid = null;
    questions.forEach(function (q) {
      if (isQuestionValid(q)) {
        clearError(q);
      } else {
        showError(q);
        if (!firstInvalid) firstInvalid = q;
      }
    });
    if (firstInvalid) {
      var focusable = firstInvalid.querySelector(".input, .textarea, .card");
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 300);
      announce("A couple of answers are still needed on this step.");
      return false;
    }
    return true;
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */
  form.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "start") goTo(1);
    if (action === "resume") goTo(Math.max(1, Math.min(state.screen, LAST_SCREEN)));
    if (action === "next") {
      var screenEl = screens[current];
      if (!validateScreen(screenEl)) return;
      // Normalise URL on the way out
      if (current === 5 && state.answers.inspirationUrl && !/^https?:\/\//i.test(state.answers.inspirationUrl.trim())) {
        state.answers.inspirationUrl = "https://" + state.answers.inspirationUrl.trim();
        document.getElementById("q-inspirationUrl").value = state.answers.inspirationUrl;
      }
      goTo(current + 1);
    }
    if (action === "back") goTo(current - 1, true);
    if (action === "submit") submit();
    if (action === "edit") goTo(parseInt(btn.getAttribute("data-target"), 10), true);
  });

  function goTo(index, backwards) {
    if (transitioning || index < 0 || index > LAST_SCREEN || index === current) return;
    transitioning = true;

    var from = screens[current];
    var to = screens[index];
    var dirBack = backwards || index < current;

    from.classList.remove("is-entering", "is-entering-back");
    from.classList.add(dirBack ? "is-leaving-back" : "is-leaving");

    setTimeout(function () {
      from.classList.remove("is-active", "is-leaving", "is-leaving-back");
      to.classList.add("is-active", dirBack ? "is-entering-back" : "is-entering");
      current = index;
      updateProgress();
      if (index === LAST_SCREEN) renderClosing();
      window.scrollTo({ top: 0, behavior: "auto" });
      to.focus({ preventScroll: true });
      var heading = to.querySelector("h1, h2");
      if (heading) announce(heading.textContent.trim());
      save(false);
      setTimeout(function () {
        to.classList.remove("is-entering", "is-entering-back");
        transitioning = false;
      }, 560);
    }, 260);
  }

  function updateProgress() {
    var step = parseInt((screens[current].getAttribute("data-step") || "0"), 10);
    var inFlow = step > 0;
    progress.classList.toggle("is-visible", inFlow || current === LAST_SCREEN);
    if (current === LAST_SCREEN) {
      progressFill.style.width = "100%";
      progressLabel.textContent = "All done 🎉";
    } else if (inFlow) {
      // Fill reflects completed steps + a nudge into the current one
      var pct = ((step - 1) / TOTAL_STEPS) * 100 + (100 / TOTAL_STEPS) * 0.5;
      progressFill.style.width = pct + "%";
      progressLabel.textContent = "Step " + step + " of " + TOTAL_STEPS;
    } else {
      progressFill.style.width = "0%";
    }
  }

  function announce(msg) {
    liveRegion.textContent = "";
    setTimeout(function () { liveRegion.textContent = msg; }, 60);
  }

  /* =========================================================
     CLOSING / SUMMARY
     ========================================================= */
  function renderClosing() {
    var a = state.answers;
    var firstName = (a.name || "").trim().split(/[\s,]+/)[0];
    document.getElementById("closingName").textContent = firstName ? ", " + firstName : "";

    var dl = document.getElementById("summaryList");
    dl.innerHTML = "";
    PreCall.FIELDS.forEach(function (f) {
      var v = PreCall.display(a, f.key);
      var dt = document.createElement("dt");
      dt.textContent = f.label;
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-link";
      edit.setAttribute("data-action", "edit");
      edit.setAttribute("data-target", String(f.step));
      edit.setAttribute("aria-label", "Edit " + f.label);
      edit.textContent = "Edit";
      dt.appendChild(edit);
      var dd = document.createElement("dd");
      dd.textContent = v || "—";
      dl.appendChild(dt);
      dl.appendChild(dd);
    });

    if (state.submitted) markSent(false);
  }

  function buildRecord() {
    var a = JSON.parse(JSON.stringify(state.answers));
    if (a.currentSolution !== "Something else") a.currentSolutionOther = "";
    if (a.features.indexOf("Something else") === -1) a.featuresOther = "";
    if (!state.ref) state.ref = PreCall.makeRef();
    return {
      v: 1,
      layer: "pre-call",
      ref: state.ref,
      submittedAt: new Date().toISOString(),
      answers: a
    };
  }

  function submit() {
    var btn = document.getElementById("submitBtn");
    if (state.submitted) { burstConfetti(); return; }
    btn.disabled = true;
    btn.innerHTML = "Sending…";
    var record = buildRecord();

    var done = function (ok) {
      btn.disabled = false;
      if (ok) {
        state.submitted = true;
        save(false);
        markSent(true);
      } else {
        btn.innerHTML = 'Try again <span class="arrow" aria-hidden="true">→</span>';
        document.getElementById("sentMessage").textContent =
          "Hmm, that didn't go through. Your answers are safe — give it another go in a sec.";
        var s = document.getElementById("sentState");
        s.style.background = "#FF6B6B12";
        s.style.borderColor = "#FF6B6B40";
        s.style.color = "#9B1C1C";
        s.querySelector(".tick").style.background = "#FF6B6B";
        s.classList.add("is-visible");
      }
    };

    PreCall.encodeRecord(record).then(function (encoded) {
      state.profileLink = PreCall.profileUrl(encoded);
      try { localStorage.setItem(PreCall.LAST_RECORD_KEY, JSON.stringify(record)); } catch (e) { /* optional */ }
      save(false);

      var fields = PreCall.emailFields(record, state.profileLink);
      fields._gotcha = document.getElementById("q-gotcha").value;

      if (!SUBMIT_ENDPOINT) {
        console.log("[Pre-call] Submission:", fields, record);
        setTimeout(function () { done(true); }, 700);
        return;
      }

      return fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(fields)
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            console.warn("[Pre-call] Formspree rejected the submission:", r.status, body);
            done(false);
          });
        }
        done(true);
      });
    }).catch(function (err) {
      console.warn("[Pre-call] Submission failed:", err);
      done(false);
    });
  }

  function markSent(celebrate) {
    var btn = document.getElementById("submitBtn");
    btn.innerHTML = 'Sent <span aria-hidden="true">✓</span>';
    btn.style.background = "var(--success)";
    btn.setAttribute("aria-disabled", "true");
    var s = document.getElementById("sentState");
    s.removeAttribute("style");
    s.querySelector(".tick").removeAttribute("style");
    document.getElementById("sentMessage").textContent = "Sent! It's on its way to me. Keep an eye on your inbox.";
    s.classList.add("is-visible");
    if (state.profileLink) {
      document.getElementById("profileLink").href = state.profileLink;
      document.getElementById("profileLinkWrap").hidden = false;
    }
    if (celebrate) burstConfetti();
  }

  function burstConfetti() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var host = document.getElementById("confetti");
    var colors = ["#5B4BFF", "#FF6B6B", "#10B981", "#FFC24B", "#7B6DFF"];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 90; i++) {
      var p = document.createElement("i");
      p.style.left = Math.random() * 100 + "vw";
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      p.style.animationDelay = Math.random() * 0.4 + "s";
      p.style.setProperty("--dx", (Math.random() * 200 - 100) + "px");
      p.style.setProperty("--rot", (Math.random() * 900 - 450) + "deg");
      if (i % 3 === 0) { p.style.borderRadius = "50%"; p.style.width = "10px"; p.style.height = "10px"; }
      frag.appendChild(p);
    }
    host.appendChild(frag);
    setTimeout(function () { host.innerHTML = ""; }, 4200);
  }

  /* =========================================================
     INIT
     ========================================================= */
  var hasSaved = load();
  hydrate();
  if (hasSaved && state.screen > 0) {
    document.getElementById("resumeNote").hidden = false;
  }
  updateProgress();
})();

