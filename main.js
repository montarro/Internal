/* =====================================================================
   Turf and Landscaping — site behaviour
   Plain JS, no dependencies.
   ===================================================================== */
(function () {
  "use strict";

  /* -------------------------------------------------------------------
     QUOTE FORM WEBHOOK
     Paste the webhook URL supplied by the client between the quotes.
     While this is empty the form validates and shows a friendly message
     telling the visitor to call — it never silently fails.
     ------------------------------------------------------------------- */
  var WEBHOOK_URL = ""; // e.g. "https://hook.example.com/turf-quote"

  var BUSINESS_PHONE = "0457357085"; // digits only, for the fallback message

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");

  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      var open = mobileNav.getAttribute("data-open") === "true";
      mobileNav.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });
    // Close the drawer after tapping a link
    mobileNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        mobileNav.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Quote form ---------- */
  var form = document.getElementById("quote-form");
  if (!form) return;

  var statusEl = form.querySelector(".form__status");
  var submitBtn = form.querySelector('button[type="submit"]');

  function setStatus(msg, state) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.setAttribute("data-state", state || "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Honeypot: real people leave this empty. Bots fill it.
    var hp = form.querySelector('input[name="company"]');
    if (hp && hp.value.trim() !== "") { return; }

    // Native validation first
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var data = Object.fromEntries(new FormData(form).entries());
    delete data.company;
    data.source_page = window.location.pathname;
    data.submitted_at = new Date().toISOString();

    if (!WEBHOOK_URL) {
      // No endpoint wired up yet — guide the visitor to the phone, don't pretend it sent.
      setStatus(
        "Thanks! Our online form isn't connected yet — please call us on " +
        "0457 357 085 and we'll book your free on-site quote straight away.",
        "error"
      );
      return;
    }

    setStatus("Sending your request…", "");
    if (submitBtn) { submitBtn.disabled = true; }

    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) { throw new Error("Bad response " + res.status); }
        form.reset();
        setStatus(
          "Thanks — we've got your details and will call you shortly to arrange your free on-site quote.",
          "ok"
        );
      })
      .catch(function () {
        setStatus(
          "Sorry, something went wrong sending your request. Please call us on 0457 357 085.",
          "error"
        );
      })
      .finally(function () {
        if (submitBtn) { submitBtn.disabled = false; }
      });
  });
})();
