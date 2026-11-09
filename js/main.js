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

  /* Preview height per section: enough for heading intro + one row/teaser. */
  var PREVIEW_HEIGHTS = {
    about: "7.5rem",
    aims: "14rem",
    dates: "10.5rem",
    "pre-event": "13rem",
    schedule: "16rem",
    people: "18rem",
    expo: "14rem",
    registration: "15rem",
    partners: "11rem",
    faqs: "9rem",
    reach: "11rem",
    contact: "13rem",
  };

  function setPreviewExpanded(preview, expanded) {
    if (!preview) return;
    preview.classList.toggle("is-expanded", Boolean(expanded));
    var button = preview.querySelector(".section-preview-toggle");
    if (!button) return;
    button.setAttribute("aria-expanded", expanded ? "true" : "false");
    button.textContent = expanded ? "Show less" : "Read more";
  }

  function openFoldAncestors(node) {
    var el = node;
    while (el && el !== document.body) {
      if (el.classList && el.classList.contains("section-preview")) {
        setPreviewExpanded(el, true);
      }
      if (
        el.tagName === "DETAILS" &&
        (el.classList.contains("read-more-fold") ||
          el.classList.contains("faq-item"))
      ) {
        el.open = true;
      }
      el = el.parentElement;
    }
  }

  function enhanceSectionPreviews() {
    document.querySelectorAll("main > section.section[id]").forEach(function (section) {
      if (section.dataset.foldReady === "true") return;
      var container = section.querySelector(":scope > .container");
      if (!container) return;

      var kids = Array.prototype.slice.call(container.children);
      if (kids.length < 2) return;

      var preview = document.createElement("div");
      preview.className = "section-preview";
      preview.style.setProperty(
        "--preview-height",
        PREVIEW_HEIGHTS[section.id] || "12rem"
      );

      var head = document.createElement("div");
      head.className = "section-preview-head";
      head.appendChild(kids[0]);

      var clip = document.createElement("div");
      clip.className = "section-preview-clip";

      var content = document.createElement("div");
      content.className = "section-preview-content";
      kids.slice(1).forEach(function (child) {
        content.appendChild(child);
      });
      clip.appendChild(content);

      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "section-preview-toggle";
      toggle.textContent = "Read more";
      toggle.setAttribute("aria-expanded", "false");
      toggle.addEventListener("click", function () {
        setPreviewExpanded(preview, !preview.classList.contains("is-expanded"));
      });

      preview.appendChild(head);
      preview.appendChild(clip);
      preview.appendChild(toggle);
      container.appendChild(preview);

      section.dataset.foldReady = "true";
      section.classList.add("is-collapsible");

      /* If content already fits the preview, hide the toggle. */
      window.requestAnimationFrame(function () {
        if (content.scrollHeight <= clip.clientHeight + 8) {
          preview.dataset.short = "true";
          setPreviewExpanded(preview, true);
        }
      });
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

  enhanceSectionPreviews();
  openFromHash();
  window.addEventListener("load", function () {
    /* Re-measure after fonts/images/schedule render. */
    document.querySelectorAll(".section-preview").forEach(function (preview) {
      var clip = preview.querySelector(".section-preview-clip");
      var content = preview.querySelector(".section-preview-content");
      if (!clip || !content) return;
      if (content.scrollHeight <= clip.clientHeight + 8) {
        preview.dataset.short = "true";
        setPreviewExpanded(preview, true);
      }
    });
    scrollToHashTarget();
  });
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
