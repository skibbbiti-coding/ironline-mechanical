/* Ironline Mechanical — site behaviour (vanilla, no dependencies) */
(function () {
  "use strict";

  var doc = document.documentElement;
  doc.classList.remove("no-js");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- Footer year ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Mobile menu ---------- */
  var menu = $("#mobile-menu");
  var openBtn = $("[data-menu-open]");
  var closeBtn = $("[data-menu-close]");
  var lastFocus = null;

  function focusables(ctx) {
    return $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', ctx);
  }
  function openMenu() {
    if (!menu) return;
    lastFocus = document.activeElement;
    menu.hidden = false;
    // force reflow so the transition runs
    void menu.offsetWidth;
    menu.classList.add("is-open");
    document.body.classList.add("menu-open");
    openBtn.setAttribute("aria-expanded", "true");
    closeBtn.setAttribute("aria-expanded", "true");
    var f = focusables(menu);
    if (f.length) f[1] ? f[1].focus() : f[0].focus();
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains("is-open")) return;
    menu.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    openBtn.setAttribute("aria-expanded", "false");
    closeBtn.setAttribute("aria-expanded", "false");
    setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, reduceMotion ? 0 : 500);
    if (lastFocus) lastFocus.focus();
  }
  if (menu && openBtn && closeBtn) {
    openBtn.addEventListener("click", openMenu);
    closeBtn.addEventListener("click", closeMenu);
    menu.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeMenu(); return; }
      if (e.key !== "Tab") return;
      var f = focusables(menu);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", closeMenu); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1000) closeMenu(); });
  }

  /* ---------- Mobile action bar: show after hero ---------- */
  var bar = $(".action-bar");
  if (bar) {
    var onScroll = function () { bar.classList.toggle("is-visible", window.scrollY > 420); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$(".reveal, .step");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Count-up numbers ---------- */
  var counters = $$("[data-count]");
  function formatNum(n, decimals) {
    return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }
  function runCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
    if (reduceMotion) { el.textContent = formatNum(target, decimals); return; }
    var dur = 1600, start = null;
    function tick(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = formatNum(target * eased, decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
        });
      }, { threshold: 0.5 });
      counters.forEach(function (c) { c.textContent = "0"; cio.observe(c); });
    } else {
      counters.forEach(runCount);
    }
  }

  /* ---------- Horizontal project strip ---------- */
  $$("[data-strip]").forEach(function (wrap) {
    var track = $(".strip", wrap);
    var prev = $("[data-strip-prev]", wrap);
    var next = $("[data-strip-next]", wrap);
    var prog = $(".strip-progress span", wrap);
    if (!track) return;
    function step() {
      var card = track.firstElementChild;
      if (!card) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }
    function update() {
      var max = track.scrollWidth - track.clientWidth;
      var x = track.scrollLeft;
      if (prev) prev.disabled = x <= 4;
      if (next) next.disabled = x >= max - 4;
      if (prog) {
        var vis = track.clientWidth / track.scrollWidth;
        prog.style.width = (vis * 100) + "%";
        prog.style.transform = "translateX(" + (max > 0 ? (x / max) * ((1 - vis) / vis) * 100 : 0) + "%)";
      }
    }
    if (prev) prev.addEventListener("click", function () { track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  /* ---------- Marquee: clone group for seamless loop ---------- */
  $$(".marquee__track").forEach(function (track) {
    var group = $(".marquee__group", track);
    if (!group) return;
    var clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  /* ---------- Projects: filters + view toggle ---------- */
  var pGrid = $("[data-project-grid]");
  if (pGrid) {
    var cards = $$(".p-card", pGrid);
    var filterBtns = $$("[data-filter]");
    var countEl = $("[data-result-count]");
    var emptyEl = $("[data-empty]");

    filterBtns.forEach(function (btn) {
      var f = btn.getAttribute("data-filter");
      var n = f === "all" ? cards.length : cards.filter(function (c) { return c.dataset.sector === f; }).length;
      var cEl = $(".count", btn);
      if (cEl) cEl.textContent = String(n).padStart(2, "0");
    });

    function applyFilter(f) {
      var shown = 0;
      cards.forEach(function (c) {
        var match = f === "all" || c.dataset.sector === f;
        c.hidden = !match;
        if (match) shown++;
      });
      filterBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-filter") === f)); });
      if (countEl) countEl.textContent = "Showing " + String(shown).padStart(2, "0") + " / " + String(cards.length).padStart(2, "0") + " projects";
      if (emptyEl) emptyEl.hidden = shown !== 0;
      try { history.replaceState(null, "", f === "all" ? location.pathname : "#" + f); } catch (e) { /* file:// */ }
    }
    filterBtns.forEach(function (b) {
      b.addEventListener("click", function () { applyFilter(b.getAttribute("data-filter")); });
    });
    var initial = (location.hash || "").replace("#", "");
    applyFilter(filterBtns.some(function (b) { return b.getAttribute("data-filter") === initial; }) ? initial : "all");

    var viewBtns = $$("[data-view]");
    function setView(v) {
      pGrid.classList.toggle("is-list", v === "list");
      viewBtns.forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === v)); });
      try { localStorage.setItem("ironline-view", v); } catch (e) { /* storage unavailable */ }
    }
    viewBtns.forEach(function (b) { b.addEventListener("click", function () { setView(b.getAttribute("data-view")); }); });
    var savedView = null;
    try { savedView = localStorage.getItem("ironline-view"); } catch (e) { /* ignore */ }
    if (savedView === "list") setView("list");
  }

  /* ---------- Lightbox ---------- */
  var lb = $("#lightbox");
  var gItems = $$("[data-lightbox]");
  if (lb && gItems.length) {
    var lbImg = $("img", lb);
    var lbCap = $("[data-lb-caption]", lb);
    var lbCount = $("[data-lb-count]", lb);
    var idx = 0, opener = null;
    function show(i) {
      idx = (i + gItems.length) % gItems.length;
      var it = gItems[idx];
      lbImg.src = it.getAttribute("data-full");
      lbImg.alt = $("img", it).alt;
      lbCap.textContent = it.getAttribute("data-caption") || "";
      lbCount.textContent = String(idx + 1).padStart(2, "0") + " / " + String(gItems.length).padStart(2, "0");
    }
    function openLb(i) {
      opener = document.activeElement;
      show(i);
      if (typeof lb.showModal === "function") lb.showModal(); else lb.setAttribute("open", "");
      document.body.classList.add("menu-open");
    }
    function closeLb() {
      if (typeof lb.close === "function") lb.close(); else lb.removeAttribute("open");
    }
    lb.addEventListener("close", function () {
      document.body.classList.remove("menu-open");
      if (opener) opener.focus();
    });
    gItems.forEach(function (it, i) { it.addEventListener("click", function () { openLb(i); }); });
    $("[data-lb-close]", lb).addEventListener("click", closeLb);
    $("[data-lb-prev]", lb).addEventListener("click", function () { show(idx - 1); });
    $("[data-lb-next]", lb).addEventListener("click", function () { show(idx + 1); });
    lb.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    lb.addEventListener("click", function (e) { if (e.target === lb || e.target.classList.contains("lightbox__stage")) closeLb(); });
  }

  /* ---------- Contact tabs ---------- */
  var tablist = $("[role='tablist']");
  if (tablist) {
    var tabs = $$("[role='tab']", tablist);
    function selectTab(tab, focus) {
      tabs.forEach(function (t) {
        var sel = t === tab;
        t.setAttribute("aria-selected", String(sel));
        t.tabIndex = sel ? 0 : -1;
        $("#" + t.getAttribute("aria-controls")).hidden = !sel;
      });
      if (focus) tab.focus();
      try { history.replaceState(null, "", "#" + tab.getAttribute("data-hash")); } catch (e) { /* ignore */ }
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { selectTab(t); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === "Home") n = tabs[0];
        if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); selectTab(n, true); }
      });
    });
    var h = (location.hash || "").replace("#", "");
    var match = tabs.filter(function (t) { return t.getAttribute("data-hash") === h; })[0];
    selectTab(match || tabs[0]);
    window.addEventListener("hashchange", function () {
      var hh = (location.hash || "").replace("#", "");
      var m = tabs.filter(function (t) { return t.getAttribute("data-hash") === hh; })[0];
      if (m) { selectTab(m); tablist.scrollIntoView({ block: "start" }); }
    });
  }

  /* ---------- Forms: client-side validation + inline success ---------- */
  $$("form[data-validate]").forEach(function (form) {
    var alertEl = $(".form-alert", form);

    function fieldWrap(el) { return el.closest(".field, .seg-field"); }
    function validateEl(el) {
      var wrap = fieldWrap(el);
      if (!wrap) return true;
      var ok = el.checkValidity();
      if (el.type === "radio") {
        ok = !!form.querySelector('input[name="' + el.name + '"]:checked') || !el.required;
      }
      wrap.classList.toggle("has-error", !ok);
      var errId = wrap.querySelector(".error") && wrap.querySelector(".error").id;
      if (el.type !== "radio") {
        el.setAttribute("aria-invalid", String(!ok));
        if (errId) el.setAttribute("aria-describedby", errId);
      }
      return ok;
    }

    $$("input, select, textarea", form).forEach(function (el) {
      el.addEventListener("blur", function () { if (el.type !== "radio" && el.type !== "file" && (el.value || fieldWrap(el) && fieldWrap(el).classList.contains("has-error"))) validateEl(el); });
      el.addEventListener("input", function () { if (fieldWrap(el) && fieldWrap(el).classList.contains("has-error")) validateEl(el); });
      el.addEventListener("change", function () { if (el.type === "radio" || el.tagName === "SELECT") validateEl(el); });
    });

    // Phone: light formatting
    $$('input[type="tel"]', form).forEach(function (el) {
      el.addEventListener("input", function () {
        var d = el.value.replace(/\D/g, "").slice(0, 10);
        if (d.length > 6) el.value = "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
        else if (d.length > 3) el.value = "(" + d.slice(0, 3) + ") " + d.slice(3);
        else el.value = d;
      });
    });

    // Upload placeholder (UI only — nothing is transmitted)
    var dz = $(".dropzone", form);
    if (dz) {
      var fileInput = $("input[type=file]", dz);
      var list = $(".file-list", form);
      ["dragenter", "dragover"].forEach(function (ev) { dz.addEventListener(ev, function () { dz.classList.add("is-drag"); }); });
      ["dragleave", "drop"].forEach(function (ev) { dz.addEventListener(ev, function () { dz.classList.remove("is-drag"); }); });
      fileInput.addEventListener("change", function () {
        var names = Array.prototype.map.call(fileInput.files, function (f) { return f.name; });
        list.textContent = names.length ? "Attached (preview only): " + names.join(", ") : "";
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault(); // Design concept: no data is sent anywhere.
      var fields = $$("input, select, textarea", form).filter(function (el) { return el.type !== "file"; });
      var firstBad = null;
      var seenRadio = {};
      fields.forEach(function (el) {
        if (el.type === "radio") { if (seenRadio[el.name]) return; seenRadio[el.name] = true; }
        if (!validateEl(el) && !firstBad) firstBad = el;
      });
      if (firstBad) {
        if (alertEl) { alertEl.classList.add("is-visible"); alertEl.focus(); }
        firstBad.focus({ preventScroll: true });
        firstBad.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        return;
      }
      if (alertEl) alertEl.classList.remove("is-visible");
      // Quick estimate: go to the thank-you page. Only a non-personal flag travels in the URL.
      var redirect = form.getAttribute("data-redirect");
      if (redirect) { window.location.href = redirect; return; }
      var success = $("#" + form.getAttribute("data-success"));
      var ref = $("[data-ref]", success);
      if (ref) ref.textContent = (form.getAttribute("data-prefix") || "IM") + "-" + new Date().getFullYear().toString().slice(2) + "-" + Math.floor(1000 + Math.random() * 9000);
      var nameEl = $("[data-name-echo]", success);
      var nameIn = $('[name="name"]', form);
      if (nameEl && nameIn) nameEl.textContent = nameIn.value.trim().split(" ")[0];
      form.hidden = true;
      success.hidden = false;
      success.setAttribute("tabindex", "-1");
      success.focus();
    });
  });

  $$("[data-reset-form]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var form = $("#" + btn.getAttribute("data-reset-form"));
      var success = btn.closest(".success");
      form.reset();
      $$(".has-error", form).forEach(function (w) { w.classList.remove("has-error"); });
      var list = $(".file-list", form); if (list) list.textContent = "";
      success.hidden = true;
      form.hidden = false;
      var first = $("input, select, textarea", form);
      if (first) first.focus();
    });
  });
})();
