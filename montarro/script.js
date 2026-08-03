/* =========================================================
   Montarro · Revenue Infrastructure Scorecard
   Plain JS — no dependencies. Notion-embed friendly.
   ========================================================= */

(function () {
  "use strict";

  /* ---- Config ---- */
  var CATEGORIES = [
    {
      key: "lead_capture",
      name: "Lead Capture",
      desc: "Forms, routing, missed-call capture",
      modules: ["Website forms", "Lead routing", "Missed call capture"]
    },
    {
      key: "qualification",
      name: "Qualification",
      desc: "Screening, scripts and booking rules",
      modules: ["AI Receptionist", "Qualification scripts", "Booking rules"]
    },
    {
      key: "crm",
      name: "CRM",
      desc: "Pipeline and contact management",
      modules: ["GoHighLevel CRM", "Pipeline setup", "Contact management"]
    },
    {
      key: "automations",
      name: "Automations",
      desc: "Follow-up, reminders and reviews",
      modules: ["SMS follow-up", "Quote reminders", "Review requests"]
    },
    {
      key: "reporting",
      name: "Reporting",
      desc: "Visibility into leads and revenue",
      modules: ["Dashboard", "Lead source tracking", "Revenue tracking"]
    }
  ];

  var STATUSES = [
    { max: 30,  label: "High Leakage",        klass: "leak",    hint: "Critical gaps — opportunities are slipping through every stage." },
    { max: 60,  label: "Infrastructure Gaps", klass: "gap",     hint: "The foundations are partial — leaks are costing you revenue." },
    { max: 80,  label: "Improving",           klass: "improve", hint: "Solid progress — tighten the weak links to compound results." },
    { max: 100, label: "Strong System",       klass: "strong",  hint: "A well-built engine — protect it and optimise the margins." }
  ];

  var WEAK_THRESHOLD = 6;          // score below this = recommend a fix
  var GAUGE_CIRCUMFERENCE = 326.7; // 2 · π · 52

  var STATUS_COLORS = {
    leak:    { c: "#f87171", soft: "rgba(248,113,113,0.12)", line: "rgba(248,113,113,0.28)" },
    gap:     { c: "#fbbf24", soft: "rgba(251,191,36,0.12)",  line: "rgba(251,191,36,0.28)" },
    improve: { c: "#38bdf8", soft: "rgba(56,189,248,0.12)",  line: "rgba(56,189,248,0.28)" },
    strong:  { c: "#34d399", soft: "rgba(52,211,153,0.14)",  line: "rgba(52,211,153,0.30)" }
  };

  /* ---- State ---- */
  var scores = {};
  CATEGORIES.forEach(function (cat) { scores[cat.key] = 0; });

  /* ---- Element refs ---- */
  var el = {
    categories:  document.getElementById("categories"),
    total:       document.getElementById("totalScore"),
    statusLabel: document.getElementById("statusLabel"),
    statusHint:  document.getElementById("statusHint"),
    statusBar:   document.getElementById("statusBar"),
    gaugeFill:   document.querySelector(".gauge__fill"),
    recosList:   document.getElementById("recosList"),
    recosTag:    document.getElementById("recosTag"),
    copyBtn:     document.getElementById("copyBtn"),
    resetBtn:    document.getElementById("resetBtn")
  };

  /* ---- Build sliders ---- */
  function buildCategories() {
    var html = CATEGORIES.map(function (cat) {
      return (
        '<div class="cat" data-key="' + cat.key + '">' +
          '<div class="cat__top">' +
            '<div>' +
              '<span class="cat__name">' + cat.name + '</span>' +
              '<span class="cat__desc">' + cat.desc + '</span>' +
            '</div>' +
            '<span class="cat__score" data-score>0<span>/10</span></span>' +
          '</div>' +
          '<input class="cat__range" type="range" min="0" max="10" step="1" value="0" ' +
            'aria-label="' + cat.name + ' score" data-input>' +
          '<div class="cat__scale"><span>0</span><span>5</span><span>10</span></div>' +
        '</div>'
      );
    }).join("");

    el.categories.innerHTML = html;

    // Wire up each slider
    Array.prototype.forEach.call(el.categories.querySelectorAll(".cat"), function (node) {
      var key   = node.getAttribute("data-key");
      var input = node.querySelector("[data-input]");
      input.addEventListener("input", function () {
        scores[key] = parseInt(input.value, 10) || 0;
        node.querySelector("[data-score]").firstChild.nodeValue = scores[key];
        input.style.setProperty("--pct", (scores[key] * 10) + "%");
        node.classList.toggle("is-weak", scores[key] < WEAK_THRESHOLD);
        render();
      });
    });
  }

  /* ---- Helpers ---- */
  function getTotal() {
    var sum = 0;
    CATEGORIES.forEach(function (cat) { sum += scores[cat.key]; });
    return sum * 2; // 5 × 10 = 50 raw → ×2 = /100
  }

  function getStatus(total) {
    for (var i = 0; i < STATUSES.length; i++) {
      if (total <= STATUSES[i].max) return STATUSES[i];
    }
    return STATUSES[STATUSES.length - 1];
  }

  // Weakest areas: scores below threshold, sorted ascending, then by display order.
  function getWeakAreas() {
    return CATEGORIES
      .map(function (cat, i) { return { cat: cat, score: scores[cat.key], order: i }; })
      .filter(function (item) { return item.score < WEAK_THRESHOLD; })
      .sort(function (a, b) { return a.score - b.score || a.order - b.order; });
  }

  /* ---- Render ---- */
  function render() {
    var total  = getTotal();
    var status = getStatus(total);
    var weak   = getWeakAreas();

    // Gauge + total
    el.total.textContent = total;
    el.gaugeFill.style.strokeDashoffset =
      GAUGE_CIRCUMFERENCE - (GAUGE_CIRCUMFERENCE * total / 100);

    // Status label + colours
    var col = STATUS_COLORS[status.klass];
    el.statusLabel.textContent = status.label;
    el.statusLabel.style.color = col.c;
    el.statusLabel.style.background = col.soft;
    el.statusLabel.style.borderColor = col.line;
    el.statusHint.textContent = status.hint;
    el.statusBar.style.width = total + "%";
    el.gaugeFill.style.stroke = col.c;

    // Recommendations
    if (weak.length === 0) {
      el.recosTag.textContent = "All areas strong";
      el.recosList.innerHTML =
        '<p class="recos__empty">Every pillar is scoring ' + WEAK_THRESHOLD +
        '+ — no critical gaps. Focus on optimising and protecting the system.</p>';
    } else {
      el.recosTag.textContent = "Weakest areas first";
      el.recosList.innerHTML = weak.map(function (item, idx) {
        var mods = item.cat.modules.map(function (m) {
          return "<span>" + m + "</span>";
        }).join("");
        return (
          '<div class="reco">' +
            '<div class="reco__rank">' + (idx + 1) + '</div>' +
            '<div class="reco__body">' +
              '<div class="reco__name">' + item.cat.name +
                '<span class="reco__score">' + item.score + '/10</span>' +
              '</div>' +
              '<div class="reco__modules">' + mods + '</div>' +
            '</div>' +
          '</div>'
        );
      }).join("");
    }
  }

  /* ---- Copy summary ---- */
  function buildSummary() {
    var total  = getTotal();
    var status = getStatus(total);
    var weak   = getWeakAreas();
    var lines  = [];

    lines.push("MONTARRO — REVENUE INFRASTRUCTURE SCORECARD");
    lines.push("===========================================");
    lines.push("Total Score: " + total + "/100  —  " + status.label);
    lines.push("");
    lines.push("Scores by area:");
    CATEGORIES.forEach(function (cat) {
      lines.push("  • " + cat.name + ": " + scores[cat.key] + "/10");
    });
    lines.push("");

    if (weak.length === 0) {
      lines.push("Weakest areas: none — every pillar scores " + WEAK_THRESHOLD + "+.");
      lines.push("");
      lines.push("Recommended focus: optimise and protect the existing system.");
    } else {
      lines.push("Weakest areas:");
      weak.forEach(function (item) {
        lines.push("  • " + item.cat.name + " (" + item.score + "/10)");
      });
      lines.push("");
      lines.push("Recommended modules:");
      weak.forEach(function (item) {
        lines.push("  • " + item.cat.name + ": " + item.cat.modules.join(", "));
      });
    }

    lines.push("");
    lines.push("— Generated with the Montarro Scorecard —");
    return lines.join("\n");
  }

  function flashCopied() {
    var label = el.copyBtn.querySelector(".btn__label");
    var original = label.textContent;
    label.textContent = "Copied ✓";
    el.copyBtn.classList.add("is-copied");
    setTimeout(function () {
      label.textContent = original;
      el.copyBtn.classList.remove("is-copied");
    }, 1800);
  }

  function copySummary() {
    var text = buildSummary();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(flashCopied, function () {
        legacyCopy(text);
      });
    } else {
      legacyCopy(text);
    }
  }

  // Fallback for restrictive iframe/Notion contexts.
  function legacyCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      flashCopied();
    } catch (e) {
      window.prompt("Copy the summary below:", text);
    }
    document.body.removeChild(ta);
  }

  /* ---- Reset ---- */
  function reset() {
    CATEGORIES.forEach(function (cat) { scores[cat.key] = 0; });
    Array.prototype.forEach.call(el.categories.querySelectorAll(".cat"), function (node) {
      var input = node.querySelector("[data-input]");
      input.value = 0;
      input.style.setProperty("--pct", "0%");
      node.querySelector("[data-score]").firstChild.nodeValue = 0;
      node.classList.add("is-weak");
    });
    render();
  }

  /* ---- Init ---- */
  buildCategories();
  el.copyBtn.addEventListener("click", copySummary);
  el.resetBtn.addEventListener("click", reset);
  render();
})();
