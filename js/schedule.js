(function () {
  var data = window.WILDE_PROGRAMME;
  if (!data) return;

  var scheduleRoot = document.getElementById("schedule-board");
  var peopleRoot = document.getElementById("people-board");
  var sortGroup = document.getElementById("schedule-sort");
  if (!scheduleRoot || !peopleRoot || !sortGroup) return;

  var peopleById = {};
  data.people.forEach(function (person) {
    peopleById[person.id] = person;
  });

  var currentSort = "date";
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

  function roomSortKey(room) {
    var match = String(room).match(/^([A-Za-z]+)?-?(\d+)$/);
    if (!match) return [String(room), 0];
    return [match[1] || "", Number(match[2])];
  }

  function compareRooms(a, b) {
    var ra = roomSortKey(a);
    var rb = roomSortKey(b);
    if (ra[0] !== rb[0]) return ra[0].localeCompare(rb[0]);
    if (ra[1] !== rb[1]) return ra[1] - rb[1];
    return String(a).localeCompare(String(b));
  }

  function groupSessions(sortKey) {
    var groups = [];
    var index = {};

    function pushGroup(key, label, meta) {
      if (!index[key]) {
        index[key] = {
          key: key,
          label: label,
          meta: meta || "",
          sessions: [],
        };
        groups.push(index[key]);
      }
      return index[key];
    }

    var sessions = data.sessions.slice().sort(compareSessions);

    if (sortKey === "date") {
      sessions.forEach(function (session) {
        pushGroup(session.date, formatDate(session.date), "By date").sessions.push(
          session
        );
      });
      return groups;
    }

    if (sortKey === "workshop") {
      sessions.forEach(function (session) {
        var label;
        var key;
        var meta;
        if (isWorkshopLike(session)) {
          label = session.workshop || session.title;
          key = "workshop-" + slugify(session.workshop || session.id);
          meta = typeLabel(session);
        } else if (session.type === "talk") {
          label = "Talks (open sessions)";
          key = "talks";
          meta = "Talk";
        } else {
          label = "Registration, breaks and ceremonies";
          key = "other";
          meta = "Programme";
        }
        pushGroup(key, label, meta).sessions.push(session);
      });
      groups.sort(function (a, b) {
        var rank = { talks: 1, other: 2 };
        var ra = rank[a.key] || 0;
        var rb = rank[b.key] || 0;
        if (ra !== rb) return ra - rb;
        return a.label.localeCompare(b.label);
      });
      return groups;
    }

    if (sortKey === "people") {
      if (!data.people.length) {
        return [
          {
            key: "people-empty",
            label: "Resource people to be announced",
            meta: "By people",
            sessions: [],
            emptyMessage:
              "Names and photos of resource people are not in the published schedule yet. When they are confirmed, each person will appear here with links to their workshops and talks.",
          },
        ];
      }
      data.people
        .slice()
        .sort(function (a, b) {
          return a.name.localeCompare(b.name);
        })
        .forEach(function (person) {
          var owned = personSessions(person.id);
          if (!owned.length) return;
          pushGroup(
            "person-" + person.id,
            person.name,
            person.role
          ).sessions = owned;
        });
      return groups;
    }

    if (sortKey === "room") {
      sessions.forEach(function (session) {
        var label =
          session.room.indexOf("Parallel") === 0 || session.room === "Main"
            ? session.room + " track"
            : "Room " + session.room;
        pushGroup(
          "room-" + slugify(session.room),
          label,
          "By track / room"
        ).sessions.push(session);
      });
      groups.sort(function (a, b) {
        var roomA = a.label.replace(/\s+track$/, "").replace(/^Room\s+/, "");
        var roomB = b.label.replace(/\s+track$/, "").replace(/^Room\s+/, "");
        var trackA = trackOrder.hasOwnProperty(roomA) ? trackOrder[roomA] : 99;
        var trackB = trackOrder.hasOwnProperty(roomB) ? trackOrder[roomB] : 99;
        if (trackA !== trackB) return trackA - trackB;
        return compareRooms(roomA, roomB);
      });
      return groups;
    }

    return groups;
  }

  function personChips(session) {
    var people = sessionPeople(session);
    if (!people.length) return "";
    return (
      '<ul class="person-chips" aria-label="Resource people">' +
      people
        .map(function (person) {
          return (
            '<li><a class="person-chip" href="#person-' +
            escapeHtml(person.id) +
            '">' +
            '<img src="' +
            escapeHtml(person.photo) +
            '" alt="" width="36" height="36" loading="lazy" />' +
            "<span>" +
            escapeHtml(person.name) +
            "</span></a></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function sessionCard(session, options) {
    options = options || {};
    var people = sessionPeople(session);
    var lead = people[0];
    var workshopLine =
      isWorkshopLike(session) && !options.hideWorkshop
        ? '<p class="session-workshop-line">' +
          escapeHtml(typeLabel(session)) +
          "</p>"
        : "";
    var trackLabel =
      session.room === "Main" || String(session.room).indexOf("Parallel") === 0
        ? "Track"
        : "Room";

    return (
      '<article class="session-card session-' +
      escapeHtml(session.type) +
      '" id="session-' +
      escapeHtml(session.id) +
      '">' +
      '<div class="session-card-top">' +
      (lead
        ? '<a class="session-photo-link" href="#person-' +
          escapeHtml(lead.id) +
          '" aria-label="' +
          escapeHtml(lead.name) +
          '">' +
          '<img class="session-photo" src="' +
          escapeHtml(lead.photo) +
          '" alt="' +
          escapeHtml(lead.name) +
          '" width="72" height="90" loading="lazy" />' +
          "</a>"
        : "") +
      '<div class="session-card-copy">' +
      '<p class="when">' +
      escapeHtml(formatTime(session.start)) +
      " – " +
      escapeHtml(formatTime(session.end)) +
      " · " +
      escapeHtml(accessLabel(session)) +
      "</p>" +
      workshopLine +
      "<h4>" +
      escapeHtml(session.title) +
      "</h4>" +
      '<p class="session-summary">' +
      escapeHtml(session.summary) +
      "</p>" +
      '<dl class="session-meta">' +
      "<div><dt>Date</dt><dd>" +
      escapeHtml(formatDate(session.date)) +
      "</dd></div>" +
      "<div><dt>" +
      escapeHtml(trackLabel) +
      "</dt><dd>" +
      escapeHtml(session.room) +
      "</dd></div>" +
      "<div><dt>Type</dt><dd>" +
      escapeHtml(typeLabel(session)) +
      "</dd></div>" +
      "</dl>" +
      personChips(session) +
      "</div></div></article>"
    );
  }

  function renderSchedule() {
    var groups = groupSessions(currentSort);
    var html = groups
      .map(function (group) {
        var body = group.emptyMessage
          ? '<p class="pending">' + escapeHtml(group.emptyMessage) + "</p>"
          : '<div class="session-list">' +
            group.sessions
              .map(function (session) {
                return sessionCard(session, {
                  hideWorkshop:
                    currentSort === "workshop" && isWorkshopLike(session),
                });
              })
              .join("") +
            "</div>";

        return (
          '<section class="schedule-group" aria-labelledby="group-' +
          escapeHtml(group.key) +
          '">' +
          '<header class="schedule-group-head">' +
          '<p class="day-kicker">' +
          escapeHtml(group.meta || "Programme") +
          "</p>" +
          '<h3 id="group-' +
          escapeHtml(group.key) +
          '">' +
          escapeHtml(group.label) +
          "</h3>" +
          "</header>" +
          body +
          "</section>"
        );
      })
      .join("");

    scheduleRoot.innerHTML = html || '<p class="pending">No sessions to show yet.</p>';
  }

  function renderPeople() {
    if (!data.people.length) {
      peopleRoot.innerHTML =
        '<div class="people-empty">' +
        "<p>Resource-person names and photographs are not listed in the published schedule yet.</p>" +
        "<p>When the organisers confirm who is leading each talk and workshop, their profiles and photos will appear here, linked to the sessions above.</p>" +
        "</div>";
      return;
    }

    var html = data.people
      .map(function (person) {
        var sessions = personSessions(person.id);
        var links = sessions
          .map(function (session) {
            return (
              '<li><a href="#session-' +
              escapeHtml(session.id) +
              '">' +
              escapeHtml(session.title) +
              "</a>" +
              '<span class="person-session-meta">' +
              escapeHtml(session.room) +
              " · " +
              escapeHtml(formatDate(session.date).split(" ").slice(0, 3).join(" ")) +
              "</span></li>"
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
            ? '<div class="person-sessions"><h4>Sessions at WILDE</h4><ul>' +
              links +
              "</ul></div>"
            : "") +
          "</div></article>"
        );
      })
      .join("");

    peopleRoot.innerHTML = html;
  }

  function renderOrganizers() {
    var root = document.getElementById("organizer-board");
    var organizers = data.organizers || (data.organizer ? [data.organizer] : []);
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
              escapeHtml(org.website.replace(/^https?:\/\//, "").replace(/\/$/, "")) +
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

  sortGroup.addEventListener("click", function (event) {
    var button = event.target.closest("[data-sort]");
    if (!button) return;
    currentSort = button.getAttribute("data-sort");
    sortGroup.querySelectorAll("[data-sort]").forEach(function (node) {
      var active = node === button;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-pressed", active ? "true" : "false");
    });
    renderSchedule();
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#session-"], a[href^="#person-"]');
    if (!link) return;
    var target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    target.classList.add("is-flash");
    window.setTimeout(function () {
      target.classList.remove("is-flash");
    }, 1600);
  });

  renderSchedule();
  renderPeople();
  renderOrganizers();
})();
