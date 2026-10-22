(function () {
  "use strict";

  /* =========================================================
     CONFIG
     SUBMIT_ENDPOINT: where qualified leads are POSTed (Formspree form URL).
       Leave empty to keep everything client-side (the payload is
       logged to the console instead of being sent).
     BOOKING_URL: optional scheduling link (Calendly, Cal.com…). When set,
       leads scoring ≥ 3.5 are offered it straight after submitting.
     LOG_DISQUALIFIED: when true, a short "declined" record (contact +
       the gate that failed) is sent to the same endpoint so no-fit leads
       can be referred out or nurtured. Off by default: disqualified
       leads are not submitted.
     ========================================================= */
  var SUBMIT_ENDPOINT = "https://formspree.io/f/xgaoknoy";
  var BOOKING_URL = "";
  var LOG_DISQUALIFIED = false;

  var STORAGE_KEY = "jidoka-lqp-v1";
  var TOTAL_STEPS = 5;
  var REVIEW_SCREEN = 6;
  var NOFIT_SCREEN = 7;

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
    disqualified: null,
    score: null,
    ref: "",
    answers: {
      name: "",
      role: "",
      email: "",
      company: "",
      source: "",
      campaign: "",
      industry: "",
      projectType: "",
      budget: "",
      problem: "",
      currentSolution: "",
      currentSolutionOther: "",
      sixMonths: "",
      platform: "",
      features: [],
      featuresOther: "",
      mustHave: "",
      integrations: "",
      compliance: [],
      timeline: "",
      hardDate: "",
      decisionMakers: [],
      decisionNames: "",
      engagement: ""
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
      state.disqualified = saved.disqualified || null;
      state.score = typeof saved.score === "number" ? saved.score : null;
      state.ref = saved.ref || "";
      return true;
    } catch (e) {
      return false;
    }
  }

  /* Attribution from the link that brought the lead here,
     e.g. ?utm_source=linkedin&utm_campaign=budget-calculator or ?src=newsletter */
  function captureCampaign() {
    var p = new URLSearchParams(location.search);
    var parts = [p.get("src") || p.get("utm_source"), p.get("utm_medium"), p.get("utm_campaign")]
      .filter(function (x) { return x && x.trim(); });
    if (parts.length) state.answers.campaign = parts.join(" / ").slice(0, 120);
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
    syncCompliance();
    updateFeatureCounter();
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
      state.answers[key] = checkedValues(q);
      if (key === "features") updateFeatureCounter();
    }

    clearError(q);
    if (card.hasAttribute("data-reveal") || q.querySelector("[data-reveal]")) syncReveal(card);
    save(true);
  });

  function checkedValues(q) {
    return Array.prototype.slice.call(q.querySelectorAll('.card[aria-checked="true"]'))
      .map(function (c) { return c.getAttribute("data-value"); });
  }

  /* Arrow-key navigation inside radio groups & grids */
  form.addEventListener("keydown", function (e) {
    var card = e.target.closest && e.target.closest(".card");
    if (!card) return;
    var keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (keys.indexOf(e.key) === -1) return;
    var group = card.parentElement;
    var cards = Array.prototype.slice.call(group.querySelectorAll(".card:not([hidden])"));
    var i = cards.indexOf(card);
    var forward = e.key === "ArrowRight" || e.key === "ArrowDown";
    var next = cards[(i + (forward ? 1 : -1) + cards.length) % cards.length];
    e.preventDefault();
    next.focus();
    if (card.getAttribute("role") === "radio") next.click();
  });

  /* Text inputs and dropdowns */
  function onFieldChange(e) {
    var el = e.target;
    if (!el.name || !(el.name in state.answers)) return;
    state.answers[el.name] = el.value;
    if (el.name === "industry") syncCompliance();
    var q = el.closest("[data-question]");
    if (q && q.classList.contains("has-error") && isQuestionValid(q)) clearError(q);
    debouncedSave();
  }
  form.addEventListener("input", onFieldChange);
  form.addEventListener("change", onFieldChange);

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
     CONDITIONAL REVEAL ("Other" follow-ups)
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
        setTimeout(function () { input.focus({ preventScroll: true }); }, 200);
      }
    });
  }

  /* =========================================================
     COMPLIANCE OPTIONS — only show regimes for the chosen industry
     ========================================================= */
  function syncCompliance() {
    var q = form.querySelector('[data-question="compliance"]');
    var industry = state.answers.industry;
    q.querySelectorAll(".card[data-industries]").forEach(function (card) {
      var show = card.getAttribute("data-industries").split(",").indexOf(industry) > -1;
      card.hidden = !show;
      if (!show) card.setAttribute("aria-checked", "false");
    });
    state.answers.compliance = checkedValues(q);
  }

  /* =========================================================
     FEATURE COUNTER + DATALIST
     ========================================================= */
  function updateFeatureCounter() {
    var n = state.answers.features.length;
    var msg = n === 0 ? "No features selected."
      : "<strong>" + n + "</strong> selected" + (n >= 8 ? " · a long list for v1; the call will focus on the must-have." : ".");
    featureCounter.innerHTML = msg;
    featureList.innerHTML = "";
    state.answers.features.filter(function (f) { return f !== "Other"; }).forEach(function (f) {
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
    if (!required) return true;
    if (type === "multi") return Array.isArray(val) && val.length > 0;
    return typeof val === "string" && val.trim().length > 0;
  }

  function showError(q) {
    q.classList.add("has-error");
    var field = q.querySelector(".input, .textarea, .select");
    if (field) field.setAttribute("aria-invalid", "true");
  }
  function clearError(q) {
    q.classList.remove("has-error");
    var field = q.querySelector(".input, .textarea, .select");
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
      var focusable = firstInvalid.querySelector(".input, .textarea, .select, .card");
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (focusable) setTimeout(function () { focusable.focus({ preventScroll: true }); }, 300);
      announce("Some required answers on this step are missing.");
      return false;
    }
    return true;
  }

  /* =========================================================
     TOLLGATE — stop disqualified leads before they go any further
     ========================================================= */
  function disqualify(gate) {
    state.disqualified = gate;
    renderNoFit();
    if (LOG_DISQUALIFIED) sendDeclined(gate);
    goTo(NOFIT_SCREEN);
  }

  function renderNoFit() {
    document.getElementById("nofitMessage").textContent = state.disqualified ? state.disqualified.message : "";
  }

  function sendDeclined(gate) {
    if (!SUBMIT_ENDPOINT) { console.log("[Jidoka] Declined lead:", gate, state.answers); return; }
    var a = state.answers;
    fetch(SUBMIT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        _subject: "[DECLINED · " + gate.key + "] " + (a.company || "Unnamed company") + " — " + (a.name || "Lead"),
        _replyto: a.email,
        _gotcha: document.getElementById("q-gotcha").value,
        "Declined at gate": gate.key + ": " + gate.value,
        "Contact name": a.name, "Role / title": a.role, "Work email": a.email, "Company": a.company,
        "Industry": a.industry, "Project type": a.projectType, "Budget range": a.budget,
        "Source": Jidoka.display(a, "source") || "—"
      })
    }).catch(function (err) { console.warn("[Jidoka] Declined log failed:", err); });
  }

  /* =========================================================
     NAVIGATION
     ========================================================= */
  form.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-action]");
    if (!btn) return;
    var action = btn.getAttribute("data-action");
    if (action === "start") goTo(1);
    if (action === "resume") goTo(Math.max(1, Math.min(state.screen, REVIEW_SCREEN)));
    if (action === "next") {
      var screenEl = screens[current];
      if (!validateScreen(screenEl)) return;
      if (screenEl.hasAttribute("data-gate")) {
        var gate = Jidoka.checkGates(state.answers);
        if (gate) { disqualify(gate); return; }
      }
      goTo(current + 1);
    }
    if (action === "back") goTo(current - 1, true);
    if (action === "submit") submit();
    if (action === "edit") goTo(parseInt(btn.getAttribute("data-target"), 10), true);
    if (action === "review-gates") {
      state.disqualified = null;
      goTo(2, true);
    }
  });

  function goTo(index, backwards) {
    if (transitioning || index < 0 || index > NOFIT_SCREEN || index === current) return;
    // The no-fit screen is a dead end; never step into it by "next"/"back"
    if (index === NOFIT_SCREEN && !state.disqualified) return;
    transitioning = true;

    var from = screens[current];
    var to = screens[index];

    from.classList.add("is-leaving");

    setTimeout(function () {
      from.classList.remove("is-active", "is-leaving");
      to.classList.add("is-active", "is-entering");
      current = index;
      updateProgress();
      if (index === REVIEW_SCREEN) renderReview();
      window.scrollTo({ top: 0, behavior: "auto" });
      to.focus({ preventScroll: true });
      var heading = to.querySelector("h1, h2");
      if (heading) announce(heading.textContent.trim());
      save(false);
      setTimeout(function () {
        to.classList.remove("is-entering");
        transitioning = false;
      }, 260);
    }, 140);
  }

  function updateProgress() {
    var step = parseInt((screens[current].getAttribute("data-step") || "0"), 10);
    var inFlow = step > 0;
    progress.classList.toggle("is-visible", inFlow || current === REVIEW_SCREEN);
    if (current === REVIEW_SCREEN) {
      progressFill.style.width = "100%";
      progressLabel.textContent = "Review";
    } else if (inFlow) {
      progressFill.style.width = ((step - 1) / TOTAL_STEPS) * 100 + (100 / TOTAL_STEPS) * 0.5 + "%";
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
     REVIEW
     ========================================================= */
  function renderReview() {
    var a = state.answers;
    var firstName = (a.name || "").trim().split(/[\s,]+/)[0];
    document.getElementById("closingName").textContent = firstName ? ", " + firstName : "";

    var dl = document.getElementById("summaryList");
    dl.innerHTML = "";
    Jidoka.FIELDS.forEach(function (f) {
      var row = document.createElement("div");
      row.className = "summary__row";
      var dt = document.createElement("dt");
      dt.textContent = f.label;
      var dd = document.createElement("dd");
      dd.textContent = Jidoka.display(a, f.key) || "—";
      var edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-link";
      edit.setAttribute("data-action", "edit");
      edit.setAttribute("data-target", String(f.step));
      edit.setAttribute("aria-label", "Edit " + f.label);
      edit.textContent = "Edit";
      row.appendChild(dt);
      row.appendChild(dd);
      row.appendChild(edit);
      dl.appendChild(row);
    });

    if (state.submitted) markSent();
  }

  /* =========================================================
     SCORING + SUBMIT
     ========================================================= */
  function buildRecord() {
    var a = JSON.parse(JSON.stringify(state.answers));
    if (a.currentSolution !== "Other") a.currentSolutionOther = "";
    if (a.features.indexOf("Other") === -1) a.featuresOther = "";
    if (!state.ref) state.ref = Jidoka.makeRef();
    return {
      v: 2,
      layer: "lqp",
      ref: state.ref,
      submittedAt: new Date().toISOString(),
      score: Jidoka.scoreLead(a),
      answers: a
    };
  }

  function submit() {
    var btn = document.getElementById("submitBtn");
    if (state.submitted) return;
    // Belt and braces: a lead edited past the gates on the review screen is still stopped
    var gate = Jidoka.checkGates(state.answers);
    if (gate) { disqualify(gate); return; }

    btn.disabled = true;
    btn.textContent = "Submitting…";
    var record = buildRecord();

    var done = function (ok) {
      btn.disabled = false;
      if (ok) {
        state.submitted = true;
        state.score = record.score.total;
        save(false);
        markSent();
      } else {
        btn.innerHTML = 'Try again <span class="arrow" aria-hidden="true">→</span>';
        var s = document.getElementById("sentState");
        s.classList.add("is-visible", "is-error");
        document.getElementById("sentMessage").textContent =
          "The submission did not go through. Your answers are saved; please try again.";
      }
    };

    Jidoka.encodeRecord(record).then(function (encoded) {
      var link = Jidoka.profileUrl(encoded);
      try { localStorage.setItem(Jidoka.LAST_RECORD_KEY, JSON.stringify(record)); } catch (e) { /* optional */ }
      save(false);

      var fields = Jidoka.emailFields(record, link);
      fields._gotcha = document.getElementById("q-gotcha").value;

      if (!SUBMIT_ENDPOINT) {
        console.log("[Jidoka] Submission:", fields, record);
        setTimeout(function () { done(true); }, 500);
        return;
      }

      return fetch(SUBMIT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(fields)
      }).then(function (r) {
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            console.warn("[Jidoka] Formspree rejected the submission:", r.status, body);
            done(false);
          });
        }
        done(true);
      });
    }).catch(function (err) {
      console.warn("[Jidoka] Submission failed:", err);
      done(false);
    });
  }

  /* The lead never sees the score or the packet — only the next step. */
  function markSent() {
    var a = state.answers;
    var btn = document.getElementById("submitBtn");
    btn.textContent = "Submitted";
    btn.classList.add("is-done");
    btn.setAttribute("aria-disabled", "true");
    var s = document.getElementById("sentState");
    s.classList.remove("is-error");
    s.classList.add("is-visible");
    document.getElementById("sentMessage").textContent = "Submitted. Reference " + state.ref + ".";

    var next = document.getElementById("nextStep");
    var qualified = BOOKING_URL && state.score >= 3.5;
    next.textContent = qualified
      ? "Your project is a strong match for how we work. Choose a time below; please bring everyone who signs off on the engagement."
      : "We review every submission within one business day and will reply to " + (a.email || "your email") + " with next steps.";
    next.hidden = false;
    if (qualified) {
      document.getElementById("bookingLink").href = BOOKING_URL;
      document.getElementById("bookingWrap").hidden = false;
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  var hasSaved = load();
  captureCampaign();
  hydrate();
  if (state.disqualified) {
    // A disqualified session stays closed on reload
    renderNoFit();
    screens[0].classList.remove("is-active");
    screens[NOFIT_SCREEN].classList.add("is-active");
    current = NOFIT_SCREEN;
  } else if (hasSaved && state.screen > 0) {
    document.getElementById("resumeNote").hidden = false;
  }
  updateProgress();
})();
