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

  document.querySelectorAll('.site-nav a, .nav-cta').forEach(function (link) {
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
    if (base.slice(-1) !== "/" && base.indexOf("?") === -1) {
      /* keep as-is for both root and project pages */
    }
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

  function scrollToHashTarget() {
    var hash = window.location.hash;
    if (!hash || hash.indexOf("#session-") === 0 || hash === "#workshops") {
      return;
    }
    var target = document.querySelector(hash);
    if (!target) return;
    window.setTimeout(function () {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  window.addEventListener("load", scrollToHashTarget);
  window.addEventListener("hashchange", scrollToHashTarget);
  scrollToHashTarget();

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
