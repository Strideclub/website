/* STRIDE · Landing page behaviour
   - reveal on scroll, solid nav after hero
   - remembers where a visitor came from (utm_*) and sends it with the signup
   - newsletter form → Brevo (action URL set in data-action on the form) */
(function () {
  document.documentElement.classList.remove("no-js");

  /* ---- Solid nav after the hero ---- */
  var nav = document.querySelector(".nav");
  var hero = document.querySelector(".hero");
  if (nav && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      nav.classList.toggle("is-solid", !e[0].isIntersecting);
    }, { rootMargin: "-80px 0px 0px 0px" }).observe(hero);
  }

  /* ---- Reveal on scroll (once) ---- */
  var items = document.querySelectorAll(".reveal, .zoom");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Source tracking (utm) ---- */
  function readSource() {
    var p = new URLSearchParams(location.search);
    var parts = ["utm_source", "utm_medium", "utm_campaign", "utm_content"]
      .map(function (k) { return p.get(k); })
      .filter(Boolean);
    var fromUrl = parts.join("/");
    try {
      if (fromUrl) sessionStorage.setItem("stride_source", fromUrl);
      return fromUrl || sessionStorage.getItem("stride_source") || (document.referrer ? "referrer/" + new URL(document.referrer).hostname : "direct");
    } catch (e) {
      return fromUrl || "direct";
    }
  }
  var source = readSource();

  // Keep utm params when switching language
  if (location.search) {
    document.querySelectorAll(".lang a").forEach(function (a) {
      a.href = a.getAttribute("href").split("?")[0] + location.search;
    });
  }

  /* ---- Scroll lanes: sleds move with the page ---- */
  var movers = document.querySelectorAll("[data-mover]");
  if (movers.length) {
    var ticking = false;
    var update = function () {
      ticking = false;
      var max = document.documentElement.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      movers.forEach(function (m) {
        var lane = m.parentElement;
        var travel = lane.clientHeight - m.offsetHeight - 16;
        // the puller is a touch behind the pusher, so the two lanes feel alive
        var q = m.dataset.mover === "pull" ? Math.max(0, p - 0.03) / 0.97 : p;
        m.style.transform = "translateY(" + (8 + q * travel).toFixed(1) + "px)";
        // walking legs: stride length follows scroll position
        var step = Math.sin(scrollY / 18);
        var a = m.querySelector(".leg-a"), b = m.querySelector(".leg-b");
        if (a && b) {
          var dir = m.dataset.mover === "pull" ? 1 : -1;
          var ya = parseFloat(a.getAttribute("y1")) + dir * (18 + step * 4);
          var yb = parseFloat(b.getAttribute("y1")) + dir * (18 - step * 4);
          a.setAttribute("y2", ya.toFixed(1));
          b.setAttribute("y2", yb.toFixed(1));
        }
      });
    };
    addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    addEventListener("resize", update);
    update();
  }

  /* ---- Newsletter form ---- */
  document.querySelectorAll("form[data-signup]").forEach(function (form) {
    var input = form.querySelector('input[type="email"]');
    var msg = form.querySelector(".form-msg");
    var btn = form.querySelector('button[type="submit"]');
    var srcField = form.querySelector('input[name="SOURCE"]');
    if (srcField) srcField.value = source;

    function say(text, kind) {
      msg.textContent = text;
      msg.className = "form-msg small" + (kind ? " is-" + kind : "");
    }

    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var value = (input.value || "").trim();
      if (!value) { input.setAttribute("aria-invalid", "true"); say(form.dataset.msgEmpty, "error"); input.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { input.setAttribute("aria-invalid", "true"); say(form.dataset.msgInvalid, "error"); input.focus(); return; }
      input.removeAttribute("aria-invalid");
      var optin = form.querySelector('input[name="OPT_IN"]');
      if (optin && !optin.checked) { say(form.dataset.msgOptin, "error"); optin.focus(); return; }
      var hp = form.querySelector('input[name="email_address_check"]');
      if (hp && hp.value) { say(form.dataset.msgOk, "ok"); return; } // bot

      var action = form.dataset.action;
      btn.disabled = true;
      say(form.dataset.msgSending);

      if (!action) {
        // Not connected to Brevo yet: preview mode, nothing is sent.
        setTimeout(function () { say("[Preview] " + form.dataset.msgOk, "ok"); btn.disabled = false; form.reset(); if (srcField) srcField.value = source; }, 600);
        return;
      }

      var url = action + (action.indexOf("?") === -1 ? "?" : "&") + "isAjax=1";
      fetch(url, { method: "POST", body: new FormData(form) })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (res) {
          if (res && res.success) {
            say(form.dataset.msgOk, "ok");
            form.reset();
            if (srcField) srcField.value = source;
          } else {
            say(form.dataset.msgFail, "error");
          }
        })
        .catch(function () { say(form.dataset.msgFail, "error"); })
        .then(function () { btn.disabled = false; });
    });
  });
})();
