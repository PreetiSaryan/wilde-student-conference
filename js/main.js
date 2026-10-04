(function () {
  var navToggle = document.querySelector("#nav-toggle");

  document.querySelectorAll(".site-nav a").forEach(function (link) {
    link.addEventListener("click", function () {
      if (navToggle) navToggle.checked = false;
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && navToggle) navToggle.checked = false;
  });

  function isLiveLink(id) {
    var link = document.getElementById(id);
    if (!link) return false;
    return /^https?:\/\//i.test(link.getAttribute("href") || "");
  }

  function hideNote(id) {
    var note = document.getElementById(id);
    if (note) note.hidden = true;
  }

  if (isLiveLink("attendee-registration")) hideNote("attendee-note");
  if (isLiveLink("talk-abstract") && isLiveLink("workshop-abstract")) {
    hideNote("abstract-note");
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
    .filter(Boolean);

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
    { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });
})();
