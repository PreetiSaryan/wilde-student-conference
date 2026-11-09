(function () {
  var navToggle = document.querySelector("#nav-toggle");
  var siteNav = document.querySelector("#site-nav");

  function setNavOpen(open) {
    document.body.classList.toggle("nav-open", Boolean(open));
  }

  function closeNav() {
    if (!navToggle) return;
    navToggle.checked = false;
    setNavOpen(false);
  }

  if (navToggle) {
    navToggle.addEventListener("change", function () {
      setNavOpen(navToggle.checked);
    });
  }

  document.querySelectorAll(".site-nav a, .nav-cta").forEach(function (link) {
    link.addEventListener("click", function () {
      closeNav();
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeNav();
  });

  window.addEventListener("resize", function () {
    if (window.matchMedia("(min-width: 901px)").matches) closeNav();
  });

  if (siteNav) {
    siteNav.addEventListener("click", function (event) {
      if (event.target === siteNav) closeNav();
    });
  }

  var programmeNote = document.getElementById("programme-note");
  if (programmeNote && window.WILDE_PROGRAMME && window.WILDE_PROGRAMME.note) {
    programmeNote.textContent = window.WILDE_PROGRAMME.note;
  }

  function pageBaseUrl() {
    return window.location.href.split("#")[0].replace(/index\.html$/i, "");
  }

  function absoluteShareUrl(id) {
    var base = pageBaseUrl();
    return base + "#" + id;
  }

  document.querySelectorAll(".share-url[data-share-id]").forEach(function (link) {
    var id = link.getAttribute("data-share-id");
    if (!id) return;
    var url = absoluteShareUrl(id);
    link.setAttribute("href", "#" + id);
    link.textContent = url;
    link.title = "Copy or open this direct link";
  });

  /* Sections open by default: only the active next steps for visitors. */
  var OPEN_BY_DEFAULT = {
    registration: true,
    schedule: true,
  };

  function openFoldAncestors(node) {
    var el = node;
    while (el && el !== document.body) {
      if (
        el.tagName === "DETAILS" &&
        (el.classList.contains("section-fold") ||
          el.classList.contains("read-more-fold") ||
          el.classList.contains("faq-item"))
      ) {
        el.open = true;
      }
      el = el.parentElement;
    }
  }

  function enhanceSectionFolds() {
    document.querySelectorAll("main > section.section[id]").forEach(function (section) {
      if (section.dataset.foldReady === "true") return;
      var container = section.querySelector(":scope > .container");
      if (!container) return;

      var kids = Array.prototype.slice.call(container.children);
      if (kids.length < 2) return;

      var summarySource = kids[0];
      var details = document.createElement("details");
      details.className = "section-fold";
      if (OPEN_BY_DEFAULT[section.id]) details.open = true;

      var summary = document.createElement("summary");
      summary.className = "section-fold-summary";
      summary.appendChild(summarySource);

      var hint = document.createElement("span");
      hint.className = "section-fold-hint";
      hint.setAttribute("aria-hidden", "true");
      summary.appendChild(hint);

      var body = document.createElement("div");
      body.className = "section-fold-body";
      kids.slice(1).forEach(function (child) {
        body.appendChild(child);
      });

      details.appendChild(summary);
      details.appendChild(body);
      container.appendChild(details);
      section.dataset.foldReady = "true";
      section.classList.add("is-collapsible");
    });

    document.querySelectorAll(".read-more-fold").forEach(function (fold) {
      var hint = fold.querySelector(".read-more-hint");
      if (!hint) return;
      function syncHint() {
        hint.textContent = fold.open ? "Show less" : "Read more";
      }
      syncHint();
      fold.addEventListener("toggle", syncHint);
    });
  }

  function resolveHashTarget(hash) {
    if (!hash || hash === "#") return null;
    if (hash.indexOf("#session-") === 0 || hash === "#workshops") {
      return document.getElementById("schedule");
    }
    if (hash.indexOf("#person-") === 0) {
      return document.getElementById("people") || document.querySelector(hash);
    }
    if (hash === "#register" || hash === "#guidelines") {
      return document.getElementById("registration") || document.querySelector(hash);
    }
    return document.querySelector(hash);
  }

  function openFromHash() {
    var hash = window.location.hash;
    var target = resolveHashTarget(hash);
    if (!target) return null;
    openFoldAncestors(target);
    if (hash && hash !== "#" + target.id) {
      var deep = document.querySelector(hash);
      if (deep) openFoldAncestors(deep);
    }
    return target;
  }

  function scrollToHashTarget() {
    var target = openFromHash();
    if (!target) return;
    var hash = window.location.hash;
    var deep =
      hash && hash.indexOf("#session-") !== 0 ? document.querySelector(hash) : null;
    var scrollEl = deep && deep !== target ? deep : target;
    window.setTimeout(function () {
      scrollEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  enhanceSectionFolds();
  openFromHash();
  window.addEventListener("load", scrollToHashTarget);
  window.addEventListener("hashchange", scrollToHashTarget);
  scrollToHashTarget();

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function () {
      var href = link.getAttribute("href");
      if (!href || href === "#") return;
      window.setTimeout(function () {
        var target = resolveHashTarget(href);
        if (target) openFoldAncestors(target);
        var deep = document.querySelector(href);
        if (deep) openFoldAncestors(deep);
      }, 0);
    });
  });

  var navLinks = document.querySelectorAll(".site-nav a");
  if (!("IntersectionObserver" in window)) return;

  var sections = Array.prototype.map
    .call(navLinks, function (link) {
      return document.querySelector(link.getAttribute("href"));
    })
    .filter(function (el) {
      return el && el.tagName === "SECTION";
    });

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (link) {
          if (link.getAttribute("href") === id) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0.01 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
