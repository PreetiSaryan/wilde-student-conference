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
