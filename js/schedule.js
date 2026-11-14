(function () {
  var data = window.WILDE_PROGRAMME;
  if (!data) return;

  var scheduleRoot = document.getElementById("schedule-board");
  var peopleRoot = document.getElementById("people-board");
  var expoRoot = document.getElementById("expo-booths");
  var dayTabs = document.getElementById("day-tabs");
  if (!scheduleRoot || !dayTabs) return;

  var peopleById = {};
  (data.people || []).forEach(function (person) {
    peopleById[person.id] = person;
  });

  var currentView = "2026-11-17";
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
  // Fixed parallel columns by room. BCA Computer Lab and LH-42 never overlap,
  // so they share the middle column; Conference Hall and LH-35 stay left/right.
  var roomColumns = {
    "Conference Hall": 0,
    "BCA Computer Lab": 1,
    "LH-42": 1,
    "LH-35": 2,
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

  /* Escape text, then italicize known scientific names for display. */
  var SCIENTIFIC_NAMES = [
    "Vulpes vulpes montana",
    "Vulpes vulpes",
    "V. v. montana",
    "Lepus nigricollis",
    "Apis cerana",
    "A. cerana",
  ];

  function formatSciHtml(value) {
    var text = escapeHtml(value || "");
    SCIENTIFIC_NAMES.forEach(function (name) {
      var pattern = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = text.replace(
        new RegExp(pattern, "g"),
        "<i>" + escapeHtml(name) + "</i>"
      );
    });
    return text;
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

  function accessLabel() {
    return "Registered participants";
  }

  function typeLabel(session) {
    return typeLabels[session.type] || "Session";
  }

  function isWorkshopLike(session) {
    return session.type === "workshop" || session.type === "activity";
  }

  function roomColumnIndex(room) {
    return roomColumns.hasOwnProperty(room) ? roomColumns[room] : -1;
  }

  function compareSessions(a, b) {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    var trackA = roomColumnIndex(a.room);
    var trackB = roomColumnIndex(b.room);
    trackA = trackA < 0 ? 99 : trackA;
    trackB = trackB < 0 ? 99 : trackB;
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

  function personById(id) {
    return peopleById[id] || null;
  }

  function personSessions(personId) {
    return data.sessions
      .filter(function (session) {
        if ((session.people || []).indexOf(personId) !== -1) return true;
        if (
          (session.talks || []).some(function (talk) {
            return (talk.people || []).indexOf(personId) !== -1;
          })
        ) {
          return true;
        }
        if ((session.posters || []).indexOf(personId) !== -1) return true;
        return false;
      })
      .slice()
      .sort(compareSessions);
  }

  function initialsFor(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("");
  }

  function personThumb(person) {
    if (person.photo) {
      return (
        '<img src="' +
        escapeHtml(person.photo) +
        '" alt="" width="28" height="28" loading="lazy" />'
      );
    }
    return (
      '<span class="person-chip-fallback" aria-hidden="true">' +
      escapeHtml(initialsFor(person.name)) +
      "</span>"
    );
  }

  function presentationAbstract(person) {
    return person && person.presentation && person.presentation.abstract
      ? person.presentation.abstract
      : "";
  }

  function renderExpandableTitle(options) {
    var tag = options.tag || "li";
    var timeLabel = options.start
      ? escapeHtml(formatTime(options.start)) +
        (options.end
          ? '<span class="time-sep">–</span>' + escapeHtml(formatTime(options.end))
          : "")
      : "";
    var speaker = options.speaker
      ? '<a class="talk-speaker" href="#person-' +
        escapeHtml(options.speaker.id) +
        '">' +
        escapeHtml(options.speaker.name) +
        "</a>"
      : options.speakerName
        ? escapeHtml(options.speakerName)
        : "";
    var metaBits = [];
    if (timeLabel) metaBits.push('<span class="talk-time">' + timeLabel + "</span>");
    if (speaker) metaBits.push(speaker);
    if (options.kind) metaBits.push(escapeHtml(options.kind));

    var abstract = options.abstract
      ? '<p class="talk-abstract-body">' +
        formatSciHtml(options.abstract) +
        "</p>"
      : "";
    var open =
      "<" +
      tag +
      ' class="talk-item' +
      (options.abstract ? "" : " talk-item-plain") +
      '" id="' +
      escapeHtml(options.id || "") +
      '">';
    var close = "</" + tag + ">";

    if (!options.abstract) {
      return (
        open +
        (metaBits.length
          ? '<p class="talk-meta">' + metaBits.join(" · ") + "</p>"
          : "") +
        '<p class="talk-title">' +
        formatSciHtml(options.title) +
        "</p>" +
        close
      );
    }

    return (
      open +
      '<details class="talk-abstract">' +
      "<summary>" +
      (metaBits.length
        ? '<span class="talk-meta">' + metaBits.join(" · ") + "</span>"
        : "") +
      '<span class="talk-title">' +
      formatSciHtml(options.title) +
      "</span>" +
      '<span class="talk-hint">Show abstract</span>' +
      "</summary>" +
      abstract +
      "</details>" +
      close
    );
  }

  function renderTalksList(session) {
    if (!session.talks || !session.talks.length) return "";
    return (
      '<ul class="talk-list">' +
      session.talks
        .map(function (talk) {
          var speakerId = (talk.people || [])[0];
          var speaker = speakerId ? personById(speakerId) : null;
          return renderExpandableTitle({
            id: talk.id,
            title: talk.title,
            start: talk.start,
            end: talk.end,
            speaker: speaker,
            abstract: presentationAbstract(speaker),
          });
        })
        .join("") +
      "</ul>"
    );
  }

  function renderPostersList(session) {
    if (!session.posters || !session.posters.length) return "";
    return (
      '<ul class="talk-list poster-list">' +
      session.posters
        .map(function (personId) {
          var person = personById(personId);
          if (!person || !person.presentation) return "";
          return renderExpandableTitle({
            id: "poster-" + person.id + "-" + session.id,
            title: person.presentation.title,
            speaker: person,
            kind: "Poster",
            abstract: person.presentation.abstract,
          });
        })
        .join("") +
      "</ul>"
    );
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
    var hasTalks = session.talks && session.talks.length;
    var hasPosters = session.posters && session.posters.length;
    var people = sessionPeople(session);
    var chips =
      !hasTalks && !hasPosters && people.length
        ? '<ul class="person-chips">' +
          people
            .map(function (person) {
              return (
                '<li><a class="person-chip" href="#person-' +
                escapeHtml(person.id) +
                '">' +
                personThumb(person) +
                "<span>" +
                escapeHtml(person.name) +
                "</span></a></li>"
              );
            })
            .join("") +
          "</ul>"
        : "";

    var detail =
      session.type === "workshop" && session.summary
        ? session.summary
        : hasTalks || hasPosters
          ? session.summary || ""
          : accessLabel();
    var preEvent =
      session.preEvent && session.preEvent.href
        ? '<p class="session-pre-event"><a href="' +
          escapeHtml(session.preEvent.href) +
          '">' +
          escapeHtml(
            session.preEvent.label ||
              "Participate in the pre-event competition if you want to take part"
          ) +
          "</a></p>"
        : "";

    var roomLine = session.room
      ? escapeHtml(session.room) + " · "
      : "";
    var capacityLine = session.capacity
      ? '<p class="session-capacity">Capacity: <strong>' +
        escapeHtml(session.capacity) +
        "</strong> students</p>"
      : "";

    return (
      '<article class="slot-card session-' +
      escapeHtml(session.type) +
      '" id="session-' +
      escapeHtml(session.id) +
      '">' +
      '<p class="slot-track">' +
      roomLine +
      escapeHtml(typeLabel(session)) +
      "</p>" +
      "<h4>" +
      escapeHtml(session.title) +
      "</h4>" +
      capacityLine +
      (detail
        ? '<p class="session-summary">' + escapeHtml(detail) + "</p>"
        : "") +
      renderTalksList(session) +
      renderPostersList(session) +
      preEvent +
      chips +
      "</article>"
    );
  }

  function emptySlotCard() {
    return '<div class="slot-card slot-card-empty" aria-hidden="true"></div>';
  }

  function renderSlotGrid(sessions) {
    var useParallel =
      sessions.length > 1 &&
      sessions.every(function (session) {
        return roomColumnIndex(session.room) >= 0;
      });

    if (!useParallel) {
      return (
        '<div class="slot-grid slot-count-1">' +
        sessions.map(compactCard).join("") +
        "</div>"
      );
    }

    var cells = [null, null, null];
    sessions.forEach(function (session) {
      var index = roomColumnIndex(session.room);
      if (index >= 0) cells[index] = session;
    });

    return (
      '<div class="slot-grid slot-count-3 slot-grid-rooms">' +
      cells
        .map(function (session) {
          return session ? compactCard(session) : emptySlotCard();
        })
        .join("") +
      "</div>"
    );
  }

  function renderDaySchedule(day) {
    var sessions = daySessions(day);
    var slots = groupBySlot(sessions);
    var dayLabel = formatDate(day);

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
            renderSlotGrid(slot.sessions) +
            "</li>"
          );
        })
        .join("") +
      "</ol>";
  }

  function renderWorkshopsView() {
    var workshops = data.sessions
      .filter(isWorkshopLike)
      .slice()
      .sort(compareSessions);

    if (!workshops.length) {
      scheduleRoot.innerHTML = '<p class="pending">Workshops will appear here.</p>';
      return;
    }

    scheduleRoot.innerHTML =
      '<p class="schedule-day-label">Workshops</p>' +
      '<p class="programme-note">Tap a workshop to jump to its place in the day schedule.</p>' +
      '<div class="workshops-board">' +
      workshops
        .map(function (session) {
          return (
            '<article class="workshop-card session-' +
            escapeHtml(session.type) +
            '">' +
            '<a class="workshop-card-main" href="#session-' +
            escapeHtml(session.id) +
            '">' +
            '<p class="day-kicker">' +
            escapeHtml(session.code || typeLabel(session)) +
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
            (session.summary
              ? '<p class="workshop-abstract">' +
                escapeHtml(session.summary) +
                "</p>"
              : "") +
            '<p class="workshop-meta">' +
            escapeHtml(session.room || "Room TBD") +
            (session.capacity
              ? " · Capacity: " + escapeHtml(session.capacity) + " students"
              : "") +
            " · Registered participants</p>" +
            "</a>" +
            (session.preEvent && session.preEvent.href
              ? '<p class="session-pre-event"><a href="' +
                escapeHtml(session.preEvent.href) +
                '">' +
                escapeHtml(
                  session.preEvent.label ||
                    "Participate in the pre-event competition if you want to take part"
                ) +
                "</a></p>"
              : "") +
            "</article>"
          );
        })
        .join("") +
      "</div>";
  }

  function renderCurrentView() {
    if (currentView === "workshops") {
      renderWorkshopsView();
      return;
    }
    renderDaySchedule(currentView);
  }

  function isWorkshopLead(person) {
    return /workshop\s*lead/i.test(person.role || "");
  }

  function isResourcePerson(person) {
    return /workshop\s*lead|invited speaker|keynote speaker|resource person|expo\s*lead/i.test(
      person.role || ""
    );
  }

  function isStudentPresenter(person) {
    return /student speaker|poster presenter/i.test(person.role || "");
  }

  function hasStudentTalk(person) {
    return !!(person.presentation && person.presentation.kind === "talk");
  }

  function presentationKindLabel(person) {
    if (!person.presentation) return "";
    if (person.presentation.kind === "poster") return "Poster";
    if (isStudentPresenter(person) || /student speaker/i.test(person.role || "")) {
      return "Student talk";
    }
    return "Talk";
  }

  function renderPersonCard(person, options) {
    options = options || {};
    var cardId = options.cardId || person.id;
    var roleLabel = options.roleLabel || person.role;
    var presentationIdPrefix = options.presentationIdPrefix || "person-presentation-";
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

    var presentation = person.presentation
      ? renderExpandableTitle({
          tag: "div",
          id: presentationIdPrefix + person.id,
          title: person.presentation.title,
          kind: presentationKindLabel(person),
          abstract: person.presentation.abstract,
        })
      : "";

    var photoInner = person.photo
      ? '<img class="person-photo" src="' +
        escapeHtml(person.photo) +
        '" alt="Portrait of ' +
        escapeHtml(person.name) +
        '" width="280" height="280" loading="lazy" />'
      : '<div class="person-photo person-photo-fallback" aria-hidden="true">' +
        escapeHtml(initialsFor(person.name)) +
        "</div>";
    var photo = person.profileUrl
      ? '<a class="person-photo-link" href="' +
        escapeHtml(person.profileUrl) +
        '" rel="noopener noreferrer" target="_blank" aria-label="Profile of ' +
        escapeHtml(person.name) +
        '">' +
        photoInner +
        "</a>"
      : photoInner;
    var nameHeading = person.profileUrl
      ? '<h3><a class="person-name-link" href="' +
        escapeHtml(person.profileUrl) +
        '" rel="noopener noreferrer" target="_blank">' +
        escapeHtml(person.name) +
        "</a></h3>"
      : "<h3>" + escapeHtml(person.name) + "</h3>";

    return (
      '<article class="person-card" id="person-' +
      escapeHtml(cardId) +
      '">' +
      '<div class="person-photo-wrap">' +
      photo +
      "</div>" +
      '<div class="person-copy">' +
      nameHeading +
      '<p class="person-role">' +
      escapeHtml(roleLabel) +
      (person.affiliation
        ? " · " +
          (person.website
            ? '<a class="person-org" href="' +
              escapeHtml(person.website) +
              '" rel="noopener noreferrer" target="_blank">' +
              escapeHtml(person.affiliation) +
              "</a>"
            : escapeHtml(person.affiliation))
        : "") +
      "</p>" +
      (person.bio
        ? '<div class="person-bio">' +
          '<p class="person-bio-text">' +
          escapeHtml(person.bio) +
          "</p>" +
          '<button type="button" class="person-bio-toggle" aria-expanded="false">' +
          "Read more</button></div>"
        : "") +
      (presentation
        ? '<div class="person-presentation">' + presentation + "</div>"
        : "") +
      (links
        ? '<div class="person-sessions"><h4>Sessions</h4><ul>' +
          links +
          "</ul></div>"
        : "") +
      "</div></article>"
    );
  }

  function enhancePersonBios() {
    if (!peopleRoot) return;
    peopleRoot.querySelectorAll(".person-bio").forEach(function (bio) {
      var text = bio.querySelector(".person-bio-text");
      var button = bio.querySelector(".person-bio-toggle");
      if (!text || !button) return;
      if (text.scrollHeight <= text.clientHeight + 2) {
        button.hidden = true;
      }
    });
  }

  function renderPeopleGroup(title, intro, people, featured, cardOptionsFor, groupId) {
    if (!people.length) return "";
    return (
      '<section class="people-group' +
      (featured ? " people-group-featured" : "") +
      '"' +
      (groupId ? ' id="' + escapeHtml(groupId) + '"' : "") +
      ">" +
      "<h3>" +
      escapeHtml(title) +
      "</h3>" +
      (intro ? '<p class="people-group-intro">' + escapeHtml(intro) + "</p>" : "") +
      '<div class="people-board">' +
      people
        .map(function (person) {
          return renderPersonCard(
            person,
            cardOptionsFor ? cardOptionsFor(person) : null
          );
        })
        .join("") +
      "</div></section>"
    );
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

    var resources = data.people.filter(isResourcePerson);
    var presenters = data.people.filter(function (person) {
      return (
        isStudentPresenter(person) ||
        (hasStudentTalk(person) && isWorkshopLead(person))
      );
    });

    peopleRoot.innerHTML =
      renderPeopleGroup(
        "Resource people",
        "Keynote speaker, workshop leads, invited speakers, and expo leads.",
        resources,
        true,
        null,
        "resource-people"
      ) +
      renderPeopleGroup(
        "Student speakers and poster presenters",
        "Tap a title to read the abstract.",
        presenters,
        false,
        function (person) {
          if (!isWorkshopLead(person) || !hasStudentTalk(person)) return null;
          return {
            cardId: person.id + "-speaker",
            roleLabel: "Student speaker",
            presentationIdPrefix: "person-talk-presentation-",
          };
        }
      );

    enhancePersonBios();
  }

  if (peopleRoot && !peopleRoot.dataset.bioToggleBound) {
    peopleRoot.dataset.bioToggleBound = "true";
    peopleRoot.addEventListener("click", function (event) {
      var button = event.target.closest(".person-bio-toggle");
      if (!button || !peopleRoot.contains(button)) return;
      var bio = button.closest(".person-bio");
      if (!bio) return;
      var text = bio.querySelector(".person-bio-text");
      var anchorTop = (text || bio).getBoundingClientRect().top;
      var expanded = bio.classList.toggle("is-expanded");
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      button.textContent = expanded ? "Show less" : "Read more";
      window.requestAnimationFrame(function () {
        var delta = (text || bio).getBoundingClientRect().top - anchorTop;
        if (delta !== 0) window.scrollBy(0, delta);
        if (expanded) button.blur();
      });
    });
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

  function setActiveView(view, tab) {
    currentView = view;
    dayTabs.querySelectorAll("[data-view]").forEach(function (node) {
      var active = node === tab;
      node.classList.toggle("is-active", active);
      node.setAttribute("aria-selected", active ? "true" : "false");
    });
    scheduleRoot.setAttribute("aria-labelledby", tab.id);
    renderCurrentView();
  }

  function activateView(view) {
    var tab = dayTabs.querySelector('[data-view="' + view + '"]');
    if (!tab) return;
    setActiveView(view, tab);
  }

  dayTabs.addEventListener("click", function (event) {
    var tab = event.target.closest("[data-view]");
    if (!tab) return;
    setActiveView(tab.getAttribute("data-view"), tab);
  });

  dayTabs.addEventListener("keydown", function (event) {
    var tabs = Array.prototype.slice.call(
      dayTabs.querySelectorAll("[data-view]")
    );
    var current = document.activeElement;
    var index = tabs.indexOf(current);
    if (index < 0) return;
    var next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      next = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + tabs.length) % tabs.length;
    if (next < 0) return;
    event.preventDefault();
    tabs[next].focus();
    setActiveView(tabs[next].getAttribute("data-view"), tabs[next]);
  });

  document.addEventListener("click", function (event) {
    var link = event.target.closest('a[href^="#session-"]');
    if (!link) return;
    var href = link.getAttribute("href");
    var sessionId = href.replace("#session-", "");
    var session = data.sessions.find(function (item) {
      return item.id === sessionId;
    });
    if (session && currentView !== session.date) {
      activateView(session.date);
    }
    flashSession(href);
  });

  function flashSession(href) {
    window.setTimeout(function () {
      var target = document.querySelector(href);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      target.classList.add("is-flash");
      window.setTimeout(function () {
        target.classList.remove("is-flash");
      }, 1600);
    }, 80);
  }

  function openFromHash() {
    var hash = window.location.hash;
    if (!hash) return false;

    if (hash === "#workshops") {
      activateView("workshops");
      return true;
    }

    if (hash.indexOf("#session-") === 0) {
      var sessionId = hash.replace("#session-", "");
      var session = data.sessions.find(function (item) {
        return item.id === sessionId;
      });
      if (session) {
        activateView(session.date);
        flashSession(hash);
        return true;
      }
    }

    if (hash.indexOf("#person-") === 0 || hash === "#resource-people") {
      flashSession(hash);
      return true;
    }

    return false;
  }

  if (!openFromHash()) {
    renderCurrentView();
  }

  window.addEventListener("hashchange", function () {
    openFromHash();
  });

  document.querySelectorAll('a[href="#workshops"]').forEach(function (link) {
    link.addEventListener("click", function () {
      activateView("workshops");
    });
  });

  function renderExpoBooths() {
    if (!expoRoot) return;
    var booths = data.expo || [];
    if (!booths.length) {
      expoRoot.innerHTML = "";
      return;
    }

    expoRoot.innerHTML =
      '<div class="expo-booths-heading">' +
      "<h3>Confirmed expo booths</h3>" +
      "<p>Meet these organisations in the Science and Community Expo Zone.</p>" +
      "</div>" +
      '<div class="expo-booths">' +
      booths
        .map(function (booth) {
          var contacts = (booth.contacts || [])
            .map(function (id) {
              return peopleById[id];
            })
            .filter(Boolean);
          var contactHtml = contacts.length
            ? '<p class="expo-booth-contacts">Point of contact: ' +
              contacts
                .map(function (person) {
                  return (
                    '<a href="#person-' +
                    escapeHtml(person.id) +
                    '">' +
                    escapeHtml(person.name) +
                    "</a>"
                  );
                })
                .join(", ") +
              "</p>"
            : "";
          var logoInner =
            '<img class="expo-booth-logo' +
            (booth.logoDark ? " expo-booth-logo-dark" : "") +
            '" src="' +
            escapeHtml(booth.logo) +
            '" alt="' +
            escapeHtml(booth.organization) +
            ' logo" width="320" height="160" loading="lazy" />';
          var logo = booth.website
            ? '<a class="expo-booth-logo-link" href="' +
              escapeHtml(booth.website) +
              '" rel="noopener noreferrer" target="_blank">' +
              logoInner +
              "</a>"
            : logoInner;
          var name = booth.website
            ? '<h4><a href="' +
              escapeHtml(booth.website) +
              '" rel="noopener noreferrer" target="_blank">' +
              escapeHtml(booth.organization) +
              "</a></h4>"
            : "<h4>" + escapeHtml(booth.organization) + "</h4>";

          return (
            '<article class="expo-booth" id="' +
            escapeHtml(booth.id) +
            '">' +
            '<div class="expo-booth-brand">' +
            logo +
            name +
            "</div>" +
            '<p class="expo-booth-copy">' +
            escapeHtml(booth.booth || "") +
            "</p>" +
            contactHtml +
            "</article>"
          );
        })
        .join("") +
      "</div>";
  }

  renderPeople();
  renderOrganizers();
  renderExpoBooths();
})();
