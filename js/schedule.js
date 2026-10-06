(function () {
  var data = window.WILDE_PROGRAMME;
  if (!data) return;

  var scheduleRoot = document.getElementById("schedule-board");
  var workshopsRoot = document.getElementById("workshops-board");
  var peopleRoot = document.getElementById("people-board");
  var dayTabs = document.getElementById("day-tabs");
  if (!scheduleRoot || !dayTabs) return;

  var peopleById = {};
  (data.people || []).forEach(function (person) {
    peopleById[person.id] = person;
  });

  var currentDay = "2026-11-15";
  var weekdayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  var monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  var trackOrder = {
    Main: 0,
    "Parallel 1": 1,
    "Parallel 2": 2,
  };
  var typeLabels = {
    workshop: "Workshop",
    talk: "Talk",
    activity: "Activity",
    registration: "Registration",
    ceremony: "Ceremony",
    break: "Break",
    networking: "Networking",
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function parseDate(iso) {
    var parts = iso.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(iso) {
    var date = parseDate(iso);
    return (
      weekdayNames[date.getDay()] +
      " " +
      date.getDate() +
      " " +
      monthNames[date.getMonth()] +
      " " +
      date.getFullYear()
    );
  }

  function formatTime(value) {
    var bits = value.split(":").map(Number);
    var hours = bits[0];
    var minutes = bits[1];
    var suffix = hours >= 12 ? "pm" : "am";
    var hour12 = hours % 12 || 12;
    return hour12 + ":" + String(minutes).padStart(2, "0") + " " + suffix;
  }

  function accessLabel(session) {
    if (session.access === "registered") return "Registered participants";
    if (session.type === "talk") return "Open to any student";
    return "Open session";
  }

  function typeLabel(session) {
    return typeLabels[session.type] || "Session";
  }

  function isWorkshopLike(session) {
    return session.type === "workshop" || session.type === "activity";
  }

  function compareSessions(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    var trackA = trackOrder.hasOwnProperty(a.room) ? trackOrder[a.room] : 99;
    var trackB = trackOrder.hasOwnProperty(b.room) ? trackOrder[b.room] : 99;
    if (trackA !== trackB) return trackA - trackB;
    return a.title.localeCompare(b.title);
  }

  function sessionPeople(session) {
    return (session.people || [])
      .map(function (id) {
        return peopleById[id];
      })
      .filter(Boolean);
  }

  function personSessions(personId) {
    return data.sessions
      .filter(function (session) {
        return (session.people || []).indexOf(personId) !== -1;
      })
      .slice()
      .sort(compareSessions);
  }

  function daySessions(day) {
    return data.sessions
      .filter(function (session) {
        return session.date === day;
      })
      .slice()
      .sort(compareSessions);
  }

  function groupBySlot(sessions) {
    var slots = [];
    var index = {};
    sessions.forEach(function (session) {
      var key = session.start + "-" + session.end;
      if (!index[key]) {
        index[key] = {
          key: key,
          start: session.start,
          end: session.end,
          sessions: [],
        };
        slots.push(index[key]);
      }
      index[key].sessions.push(session);
    });
    return slots;
  }

  function compactCard(session) {
    var people = sessionPeople(session);
    var chips = people.length
      ? '<ul class="person-chips">' +
        people
          .map(function (person) {
            return (
              '<li><a class="person-chip" href="#person-' +
              escapeHtml(person.id) +
              '"><img src="' +
              escapeHtml(person.photo) +
              '" alt="" width="28" height="28" loading="lazy" /><span>' +
              escapeHtml(person.name) +
              "</span></a></li>"
            );
          })
          .join("") +
        "</ul>"
      : "";

    return (
      '<article class="slot-card session-' +
      escapeHtml(session.type) +
      '" id="session-' +
      escapeHtml(session.id) +
      '">' +
      '<p class="slot-track">' +
      escapeHtml(session.room) +
      " · " +
      escapeHtml(typeLabel(session)) +
      "</p>" +
      "<h4>" +
      escapeHtml(session.title) +
      "</h4>" +
      '<p class="session-summary">' +
      escapeHtml(accessLabel(session)) +
      "</p>" +
      chips +
      "</article>"
    );
  }

  function renderSchedule() {
    var sessions = daySessions(currentDay);
    var slots = groupBySlot(sessions);
    var dayLabel = formatDate(currentDay);

    if (!slots.length) {
      scheduleRoot.innerHTML = '<p class="pending">No sessions for this day yet.</p>';
      return;
    }

    scheduleRoot.innerHTML =
      '<p class="schedule-day-label">' +
      escapeHtml(dayLabel) +
      "</p>" +
      '<ol class="day-timeline">' +
      slots
        .map(function (slot) {
          return (
            '<li class="time-slot">' +
            '<div class="time-rail">' +
            '<p class="time-range">' +
            escapeHtml(formatTime(slot.start)) +
            '<span class="time-sep">–</span>' +
            escapeHtml(formatTime(slot.end)) +
            "</p>" +
            "</div>" +
            '<div class="slot-grid slot-count-' +
            Math.min(slot.sessions.length, 3) +
            '">' +
            slot.sessions.map(compactCard).join("") +
            "</div></li>"
          );
        })
        .join("") +
      "</ol>";
  }

  function renderWorkshops() {
    if (!workshopsRoot) return;
    var workshops = data.sessions
      .filter(isWorkshopLike)
      .slice()
      .sort(compareSessions);

    if (!workshops.length) {
      workshopsRoot.innerHTML = '<p class="pending">Workshops will appear here.</p>';
      return;
    }

    workshopsRoot.innerHTML = workshops
      .map(function (session) {
        return (
          '<a class="workshop-card session-' +
          escapeHtml(session.type) +
          '" href="#session-' +
          escapeHtml(session.id) +
          '">' +
          '<p class="day-kicker">' +
          escapeHtml(typeLabel(session)) +
          (session.code ? " · " + escapeHtml(session.code) : "") +
          "</p>" +
          "<h3>" +
          escapeHtml(session.workshop || session.title) +
          "</h3>" +
          "<p>" +
          escapeHtml(formatDate(session.date).split(" ").slice(0, 3).join(" ")) +
          " · " +
          escapeHtml(formatTime(session.start)) +
          " – " +
          escapeHtml(formatTime(session.end)) +
          "</p>" +
          '<p class="workshop-meta">' +
          escapeHtml(session.room) +
          " track · Registered participants</p>" +
          "</a>"
        );
      })
      .join("");
  }

  function renderPeople() {
    if (!peopleRoot) return;
    if (!data.people || !data.people.length) {
      peopleRoot.innerHTML =
        '<div class="people-empty">' +
        "<p>Resource-person names and photographs are not listed in the published schedule yet.</p>" +
        "<p>When leads are confirmed, profiles will appear here with links to their sessions.</p>" +
        "</div>";
      return;
    }

    peopleRoot.innerHTML = data.people
      .map(function (person) {
        var sessions = personSessions(person.id);
        var links = sessions
          .map(function (session) {
            return (
              '<li><a href="#session-' +
              escapeHtml(session.id) +
              '">' +
              escapeHtml(session.title) +
              "</a></li>"
            );
          })
          .join("");

        return (
          '<article class="person-card" id="person-' +
          escapeHtml(person.id) +
          '">' +
          '<div class="person-photo-wrap">' +
          '<img class="person-photo" src="' +
          escapeHtml(person.photo) +
          '" alt="Portrait of ' +
          escapeHtml(person.name) +
          '" width="220" height="275" loading="lazy" />' +
          "</div>" +
          '<div class="person-copy">' +
          "<h3>" +
          escapeHtml(person.name) +
          "</h3>" +
          '<p class="person-role">' +
          escapeHtml(person.role) +
          " · " +
          escapeHtml(person.affiliation) +
          "</p>" +
          "<p>" +
          escapeHtml(person.bio) +
          "</p>" +
          (links
            ? '<div class="person-sessions"><h4>Sessions</h4><ul>' +
              links +
              "</ul></div>"
            : "") +
          "</div></article>"
        );
      })
      .join("");
  }

  function renderOrganizers() {
    var root = document.getElementById("organizer-board");
    var organizers = data.organizers || [];
    if (!root || !organizers.length) return;

    root.innerHTML = organizers
      .map(function (org) {
        var contacts = [];
        if (org.phone) {
          contacts.push(
            '<li><a href="tel:' +
              escapeHtml(org.phone.replace(/\s+/g, "")) +
              '">' +
              escapeHtml(org.phone) +
              "</a></li>"
          );
        }
        if (org.email) {
          contacts.push(
            '<li><a href="mailto:' +
              escapeHtml(org.email) +
              '">' +
              escapeHtml(org.email) +
              "</a></li>"
          );
        }
        if (org.website) {
          contacts.push(
            '<li><a href="' +
              escapeHtml(org.website) +
              '" rel="noopener noreferrer">' +
              escapeHtml(
                org.website.replace(/^https?:\/\//, "").replace(/\/$/, "")
              ) +
              "</a></li>"
          );
        }

        return (
          '<article class="organizer-card" id="organizer-' +
          escapeHtml(org.id || slugify(org.name)) +
          '">' +
          '<a class="organizer-logo-link" href="' +
          escapeHtml(org.website || "#") +
          '" rel="noopener noreferrer">' +
          '<img class="organizer-logo" src="' +
          escapeHtml(org.logo) +
          '" alt="' +
          escapeHtml(org.name) +
          ' logo" width="160" height="160" loading="lazy" />' +
          "</a>" +
          '<div class="organizer-copy">' +
          '<p class="day-kicker">' +
          escapeHtml(org.role || "Organiser") +
          "</p>" +
          "<h3>" +
          escapeHtml(org.name) +
          "</h3>" +
          (org.blurb ? "<p>" + escapeHtml(org.blurb) + "</p>" : "") +
          (org.address
            ? "<address>" + escapeHtml(org.address) + "</address>"
            : "") +
          (contacts.length
            ? '<ul class="contact-list">' + contacts.join("") + "</ul>"
            : "") +
          "</div></article>"
        );
      })
      .join("");
  }

  function setActiveDay(day, tab) {
    currentDay = day;
    dayTabs.querySelectorAll("[data-day]").forEach(function (node) {
      var active = node === tab;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
    });
    scheduleRoot.setAttribute("aria-labelledby", tab.id);
    renderSchedule();
  }

  dayTabs.addEventListener("click", function (event) {
    var tab = event.target.closest("[data-day]");
    if (!tab) return;
    setActiveDay(tab.getAttribute("data-day"), tab);
  });

  dayTabs.addEventListener("keydown", function (event) {
    var tabs = Array.prototype.slice.call(dayTabs.querySelectorAll("[data-day]"));
    var current = document.activeElement;
    var index = tabs.indexOf(current);
    if (index < 0) return;
    var next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + tabs.length) % tabs.length;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
    setActiveDay(tabs[next].getAttribute("data-day"), tabs[next]);
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest(
      'a[href^="#session-"], a.workshop-card[href^="#session-"]'
    );
    if (!link) return;
    var href = link.getAttribute("href");
    var sessionId = href.replace("#session-", "");
    var session = data.sessions.find(function (item) {
      return item.id === sessionId;
    });
    if (session && session.date !== currentDay) {
      var tab = dayTabs.querySelector('[data-day="' + session.date + '"]');
      if (tab) setActiveDay(session.date, tab);
    }
    window.setTimeout(function () {
      var target = document.querySelector(href);
      if (!target) return;
      target.classList.add("is-flash");
      window.setTimeout(function () {
        target.classList.remove("is-flash");
      }, 1600);
    }, 50);
  });

  renderSchedule();
  renderWorkshops();
  renderPeople();
  renderOrganizers();
})();
