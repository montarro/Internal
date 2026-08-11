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

     Payload format:
       • no photos attached → JSON body
       • photos attached    → multipart/form-data (so the files come through)
     ------------------------------------------------------------------- */
  var WEBHOOK_URL = "";

  var MAX_FILES = 5;
  var MAX_BYTES = 10 * 1024 * 1024; // 10MB per photo

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
  var photos = form.querySelector("#photos");
  var photoList = form.querySelector("#photo-list");

  function setStatus(msg, state) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.setAttribute("data-state", state || "");
  }

  function readableSize(bytes) {
    return bytes < 1024 * 1024
      ? Math.round(bytes / 1024) + " KB"
      : (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ---------- Photo picker: validate and list the chosen files ---------- */
  function validatePhotos() {
    if (!photos || !photos.files.length) {
      if (photoList) { photoList.innerHTML = ""; }
      photos && photos.setCustomValidity("");
      return true;
    }

    var files = Array.prototype.slice.call(photos.files);
    var problem = "";

    if (files.length > MAX_FILES) {
      problem = "Please choose no more than " + MAX_FILES + " photos.";
    } else {
      for (var i = 0; i < files.length; i++) {
        if (files[i].type && files[i].type.indexOf("image/") !== 0) {
          problem = '"' + files[i].name + '" isn\'t an image file.';
          break;
        }
        if (files[i].size > MAX_BYTES) {
          problem = '"' + files[i].name + '" is ' + readableSize(files[i].size) +
                    " — please keep photos under 10MB.";
          break;
        }
      }
    }

    if (photoList) {
      photoList.innerHTML = "";
      files.forEach(function (f) {
        var li = document.createElement("li");
        li.textContent = f.name + " · " + readableSize(f.size);
        photoList.appendChild(li);
      });
    }

    photos.setCustomValidity(problem);
    if (problem) { setStatus(problem, "error"); } else { setStatus("", ""); }
    return !problem;
  }

  if (photos) { photos.addEventListener("change", validatePhotos); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    // Honeypot: real people leave this empty. Bots fill it.
    var hp = form.querySelector('input[name="company"]');
    if (hp && hp.value.trim() !== "") { return; }

    if (!validatePhotos()) { return; }

    // Native validation
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var hasPhotos = photos && photos.files.length > 0;
    var body, headers;

    if (hasPhotos) {
      // multipart so the image files actually reach the webhook
      body = new FormData(form);
      body.delete("company");
      body.append("source_page", window.location.pathname);
      body.append("submitted_at", new Date().toISOString());
      headers = undefined; // let the browser set the multipart boundary
    } else {
      var data = Object.fromEntries(new FormData(form).entries());
      delete data.company;
      delete data.photos;
      data.source_page = window.location.pathname;
      data.submitted_at = new Date().toISOString();
      body = JSON.stringify(data);
      headers = { "Content-Type": "application/json" };
    }

    if (!WEBHOOK_URL) {
      // No endpoint wired up yet — guide the visitor to the phone, don't pretend it sent.
      setStatus(
        "Thanks! Our online form isn't connected yet — please call us on " +
        "0457 357 085 and we'll book your free on-site quote straight away.",
        "error"
      );
      return;
    }

    setStatus(hasPhotos ? "Uploading your photos…" : "Sending your request…", "");
    if (submitBtn) { submitBtn.disabled = true; }

    fetch(WEBHOOK_URL, { method: "POST", headers: headers, body: body })
      .then(function (res) {
        if (!res.ok) { throw new Error("Bad response " + res.status); }
        form.reset();
        if (photoList) { photoList.innerHTML = ""; }
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
