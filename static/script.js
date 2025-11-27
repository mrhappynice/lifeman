// --- 1. The "Life Brain" Definitions ---
const CATEGORIES = {
  "brain-dump": {
    name: "🧠 Quick Brain Dump",
    description: "Get it out of your head. Sort it later.",
    emoji: "📥",
    steps: [
      {
        title: "What's on your mind?",
        fields: [
          { id: "title", label: "Short Title", type: "text", required: true },
          // FIX: Added exact event_date ID
          {
            id: "event_date",
            label: "Date/Time (Optional)",
            type: "datetime-local",
          },
          {
            id: "description",
            label: "Details (#tags)",
            type: "textarea",
            required: true,
          },
          // FIX: Standardized Options
          {
            id: "frequency",
            label: "Is this recurring?",
            type: "select",
            options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"],
          },
        ],
      },
    ],
  },
  chore: {
    name: "🧹 Routine / Chore",
    description: "Cleaning, maintenance, bills.",
    emoji: "🔄",
    steps: [
      {
        title: "The Routine",
        fields: [
          {
            id: "title",
            label: "What needs doing?",
            type: "text",
            placeholder: "e.g. Take out Trash",
            required: true,
          },
          // FIX: Added exact event_date ID
          {
            id: "event_date",
            label: "Start Date (for recurring calc)",
            type: "datetime-local",
          },
          {
            id: "frequency",
            label: "How often?",
            type: "select",
            options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"],
          },
          {
            id: "assignee",
            label: "Who does this? (Optional)",
            type: "text",
            placeholder: "e.g. Dad, Kids",
          },
        ],
      },
      {
        title: "Details",
        fields: [
          {
            id: "description",
            label: "Instructions / Notes (Use #tags)",
            type: "textarea",
          },
          { id: "tools", label: "Tools/Supplies needed?", type: "text" },
        ],
      },
    ],
  },
  project: {
    name: "🛠️ Project / Fix",
    description: "Something broken or a goal.",
    emoji: "🚧",
    steps: [
      {
        title: "The Project",
        fields: [
          { id: "title", label: "Project Name", type: "text", required: true },
          // FIX: Added exact event_date ID
          {
            id: "event_date",
            label: "Deadline / Date",
            type: "datetime-local",
          },
          // FIX: Changed "Ongoing" to standard list
          {
            id: "frequency",
            label: "Timeline",
            type: "select",
            options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"],
          },
        ],
      },
      {
        title: "The Plan",
        fields: [
          {
            id: "description",
            label: "Desired Outcome (#tags)",
            type: "textarea",
          },
          { id: "budget", label: "Estimated Cost ($)", type: "number" },
          { id: "blockers", label: "What is stopping us?", type: "text" },
        ],
      },
    ],
  },
  inventory: {
    name: "📦 Life / Appointments",
    description: "Car, Health, House, etc..",
    emoji: "📋",
    steps: [
      {
        title: "System Info",
        fields: [
          {
            id: "title",
            label: "Item Name",
            type: "text",
            placeholder: "e.g. Honda Civic",
            required: true,
          },
          // FIX: Added exact event_date ID
          {
            id: "event_date",
            label: "Next Maintenance/Appt Date",
            type: "datetime-local",
          },
          // FIX: Changed "None" to standard list
          {
            id: "frequency",
            label: "Maintenance/Appt Cycle",
            type: "select",
            options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"],
          },
        ],
      },
      {
        title: "Reference Data",
        fields: [
          {
            id: "description",
            label: "Key Data (VIN, Names, ID #) - Use #tags",
            type: "textarea",
          },
          {
            id: "location",
            label: "Where is it happening/stored?",
            type: "text",
          },
        ],
      },
    ],
  },
};

// --- State ---
let allEntries = [];
let editingId = null;
let currentStep = 0;
let currentCatKey = null;
let wizardData = {};
let activeTag = null;

// --- Elements ---
const grid = document.getElementById("grid");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("wizard-body");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

document.addEventListener("DOMContentLoaded", fetchEntries);

// --- Core Functions ---

async function fetchEntries() {
  const res = await fetch("/api/entries");
  allEntries = await res.json();
  renderTagBar(); // <--- NEW
  renderGrid(); // <--- UPDATED: Removed argument, reads global state
  renderCalendar(); // <--- NEW: Ensure calendar updates on load too
}

// --- Tag System ---

function renderTagBar() {
  const container = document.getElementById("tag-filter-bar");
  const tags = new Set();

  // 1. Collect all tags from Tags Array AND Description
  allEntries.forEach((entry) => {
    if (entry.tags) entry.tags.forEach((t) => tags.add(t));

    // Also Regex scan the description for #tags
    const matches = entry.description ? entry.description.match(/#\w+/g) : [];
    if (matches) matches.forEach((m) => tags.add(m.substring(1))); // remove #
  });

  // 2. Build HTML
  let html = `<button class="chip ${activeTag === null ? "active" : ""}" onclick="applyTagFilter(null)">All</button>`;

  Array.from(tags)
    .sort()
    .forEach((tag) => {
      const isActive = activeTag === tag ? "active" : "";
      html += `<button class="chip ${isActive}" onclick="applyTagFilter('${tag}')">#${tag}</button>`;
    });

  container.innerHTML = html;
}

function applyTagFilter(tag) {
  activeTag = tag;
  renderTagBar(); // Re-render chips to update 'active' class styling

  if (currentView === "list") renderGrid();
  else renderCalendar();
}

// Helper to check if an entry matches the active tag
function entryMatchesFilter(entry) {
  if (!activeTag) return true;

  const tag = activeTag;
  const inTags = entry.tags && entry.tags.includes(tag);
  const inDesc = entry.description && entry.description.includes("#" + tag);

  return inTags || inDesc;
}

function renderGrid() {
  grid.innerHTML = "";

  // FILTER: Only show matching entries
  const visibleEntries = allEntries.filter((entry) =>
    entryMatchesFilter(entry),
  );

  if (visibleEntries.length === 0) {
    grid.innerHTML = `<div style="text-align:center; grid-column:1/-1; color:#555; margin-top:50px;">
            <h2>No entries found.</h2>
        </div>`;
    return;
  }

  visibleEntries.forEach((entry) => {
    const descWithTags = parseTags(entry.description || "");

    const card = document.createElement("div");
    card.className = "card";
    // ... (rest of card generation remains the same) ...
    card.innerHTML = `
            <div class="card-top">
                <span style="font-size:1.5rem">${CATEGORIES[entry.template_type]?.emoji || "📄"}</span>
                <span class="freq-badge freq-${entry.frequency || "One-Time"}">${entry.frequency || "One-Time"}</span>
            </div>
            <h3>${entry.title}</h3>
            <p>${descWithTags}</p>
            <div class="card-actions">
                <button class="btn-icon" onclick="openEdit('${entry.id}')">✏️ Edit</button>
                <button class="btn-icon" style="color:var(--danger)" onclick="deleteEntry('${entry.id}')">🗑️</button>
            </div>
        `;
    grid.appendChild(card);
  });
}

// Convert "#tag" text into clickable spans
function parseTags(text) {
  if (!text) return "";
  return text.replace(
    /#(\w+)/g,
    '<span class="hashtag" onclick="filterByTag(\'$1\')">#$1</span>',
  );
}

function filterByTag(tag) {
  const filtered = allEntries.filter((e) => {
    const inDesc = e.description && e.description.includes("#" + tag);
    const inTags = e.tags && e.tags.includes(tag);
    return inDesc || inTags;
  });
  renderGrid(filtered);
  // Visual feedback
  document.getElementById("filter-label").innerText = `Filtering by: #${tag}`;
  document.getElementById("clear-filter").classList.remove("hidden");
}

function clearFilter() {
  renderGrid(allEntries);
  document.getElementById("filter-label").innerText = "All Items";
  document.getElementById("clear-filter").classList.add("hidden");
}

// --- Wizard / Editor Logic ---

function openNew() {
  editingId = null;
  wizardData = {};
  showCategorySelect();
  modal.classList.add("open");
}

async function openEdit(id) {
  const entry = allEntries.find((e) => e.id === id);
  if (!entry) return;

  editingId = id;
  currentCatKey = entry.template_type;

  // Helper to format date for input field (YYYY-MM-DDTHH:mm)
  let formattedDate = "";
  if (entry.event_date) {
    const d = new Date(entry.event_date);
    // Adjust to local timezone string manually to fit input
    const pad = (n) => (n < 10 ? "0" + n : n);
    formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // Populate wizardData
  wizardData = {
    title: entry.title,
    description: entry.description,
    frequency: entry.frequency,
    event_date: formattedDate, // <--- LOAD THE DATE HERE
    ...entry.details,
  };

  startWizard(currentCatKey);
  modal.classList.add("open");
}

function showCategorySelect() {
  modalBody.innerHTML = `
        <h2 style="margin-bottom:20px; text-align:center;">What are we organizing?</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px;">
            ${Object.entries(CATEGORIES)
              .map(
                ([key, cat]) => `
                <div onclick="startWizard('${key}')"
                     style="background:#2c303a; padding:20px; border-radius:12px; cursor:pointer; text-align:center; border:1px solid #333; transition:0.2s;">
                    <div style="font-size:2rem; margin-bottom:10px;">${cat.emoji}</div>
                    <strong>${cat.name}</strong><br>
                    <small style="color:#888">${cat.description}</small>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
  prevBtn.classList.add("hidden");
  nextBtn.classList.add("hidden");
}

function startWizard(key) {
  currentCatKey = key;
  currentStep = 0;
  renderStep();
}

function renderStep() {
  const template = CATEGORIES[currentCatKey];
  const step = template.steps[currentStep];

  // Build Form
  let html = `<h2>${step.title}</h2>`;
  step.fields.forEach((field) => {
    const val = wizardData[field.id] || "";
    html += `<div class="form-group"><label>${field.label}</label>`;

    if (field.type === "textarea") {
      html += `<textarea id="inp_${field.id}" rows="4">${val}</textarea>`;
    } else if (field.type === "select") {
      html += `<select id="inp_${field.id}">
                ${field.options.map((o) => `<option value="${o}" ${val === o ? "selected" : ""}>${o}</option>`).join("")}
            </select>`;
    } else {
      html += `<input type="${field.type}" id="inp_${field.id}" value="${val}" placeholder="${field.placeholder || ""}">`;
    }
    html += `</div>`;
  });

  modalBody.innerHTML = html;

  // Buttons
  prevBtn.classList.remove("hidden");
  nextBtn.classList.remove("hidden");
  nextBtn.innerText =
    currentStep === template.steps.length - 1
      ? editingId
        ? "Update"
        : "Save"
      : "Next";
}

// Logic to move between steps
window.moveWizard = async (dir) => {
  // 1. Save current slide data to wizardData object
  const inputs = modalBody.querySelectorAll("input, select, textarea");
  inputs.forEach((i) => {
    const key = i.id.replace("inp_", "");
    wizardData[key] = i.value;
  });

  // 2. Calculate next step
  const template = CATEGORIES[currentCatKey];
  const nextIdx = currentStep + dir;

  if (dir === -1 && currentStep === 0) {
    if (editingId)
      closeModal(); // If editing and go back, just close
    else showCategorySelect(); // If new, go back to chooser
    return;
  }

  if (nextIdx >= template.steps.length) {
    await saveData();
    return;
  }

  currentStep = nextIdx;
  renderStep();
};

async function saveData() {
  const payload = {
    template_type: currentCatKey,
    title: wizardData.title || "Untitled",
    description: wizardData.description || "",
    frequency: wizardData.frequency || "One-Time",
    // NEW: Send the date if it exists
    event_date: wizardData.event_date
      ? new Date(wizardData.event_date).toISOString()
      : null,
    tags: extractTags(wizardData.description || ""),
    details: wizardData,
  };

  const url = editingId ? `/api/entries/${editingId}` : "/api/entries";
  const method = editingId ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    // FIX: Check if the server rejected the data
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Server Error:", errorText);
      alert(
        "Error saving entry! Check console for details.\n\nServer said: " +
          res.status,
      );
      return;
    }

    // If we get here, it worked
    closeModal();
    fetchEntries();
  } catch (e) {
    console.error(e);
    alert("Network Error: Could not reach the server.");
  }
}

function extractTags(text) {
  const match = text.match(/#\w+/g);
  return match ? match.map((t) => t.substring(1)) : []; // Remove '#'
}

async function deleteEntry(id) {
  if (confirm("Are you sure you want to remove this?")) {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    fetchEntries();
  }
}

function closeModal() {
  modal.classList.remove("open");
}

// --- Calendar Logic ---

let currentDate = new Date();
let currentView = "list";

function switchView(view) {
  currentView = view;
  document
    .getElementById("view-list")
    .classList.toggle("active", view === "list");
  document
    .getElementById("view-cal")
    .classList.toggle("active", view === "calendar");

  if (view === "calendar") {
    document.getElementById("grid").classList.add("hidden");
    document.getElementById("calendar-view").classList.remove("hidden");
    renderCalendar();
  } else {
    document.getElementById("grid").classList.remove("hidden");
    document.getElementById("calendar-view").classList.add("hidden");
  }
}

function changeMonth(dir) {
  currentDate.setMonth(currentDate.getMonth() + dir);
  renderCalendar();
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Update Header
  const monthNames = [
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
  document.getElementById("cal-month-name").innerText =
    `${monthNames[month]} ${year}`;

  const daysContainer = document.getElementById("cal-days");
  daysContainer.innerHTML = "";

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 1. Add Empty Slots for previous month
  for (let i = 0; i < firstDayIndex; i++) {
    const div = document.createElement("div");
    div.className = "cal-day";
    div.style.background = "#111"; // dim
    daysContainer.appendChild(div);
  }

  // 2. Add Days
  const today = new Date();
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "cal-day";
    if (
      i === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    ) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerHTML = `<span class="day-number">${i}</span>`;

    // Find Events for this day
    const dayEvents = getEventsForDay(year, month, i);
    dayEvents.forEach((evt) => {
      const el = document.createElement("div");
      el.className = `cal-event type-${evt.type}`;
      el.innerText = evt.title;
      el.onclick = (e) => {
        e.stopPropagation();
        openEdit(evt.id);
      };
      dayDiv.appendChild(el);
    });

    daysContainer.appendChild(dayDiv);
  }
}

function getEventsForDay(year, month, day) {
  const targetDate = new Date(year, month, day);
  const dayOfWeek = targetDate.getDay();
  const dayOfMonth = day;
  const targetMonth = month;

  let events = [];

  allEntries.forEach((entry) => {
    if (!entryMatchesFilter(entry)) return;
    const freq = entry.frequency || "One-Time";
    const title = entry.title;
    const id = entry.id;

    // 1. Determine the "Base Date"
    // Use the manually picked date. If none exists, use the date it was created.
    const baseDateStr = entry.event_date || entry.created_at;
    const baseDate = new Date(baseDateStr);

    // --- FIXED SECTION ---
    // 1. One-Time Events
    // Now uses baseDate, so items appear even if you didn't pick a deadline.
    if (freq === "One-Time") {
      if (
        baseDate.getFullYear() === year &&
        baseDate.getMonth() === month &&
        baseDate.getDate() === day
      ) {
        events.push({
          id,
          title,
          type: "one-time",
          category: entry.template_type,
        });
      }
    }
    // ---------------------

    // 2. Daily
    if (freq === "Daily") {
      // Check if target day is AFTER the start date
      // Note: We clone baseDate with new Date() to avoid modifying the original in the loop
      if (targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)) {
        events.push({
          id,
          title,
          type: "daily",
          category: entry.template_type,
        });
      }
    }

    // 3. Weekly
    if (freq === "Weekly") {
      if (
        baseDate.getDay() === dayOfWeek &&
        targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)
      ) {
        events.push({
          id,
          title,
          type: "weekly",
          category: entry.template_type,
        });
      }
    }

    // 4. Monthly
    if (freq === "Monthly") {
      if (
        baseDate.getDate() === dayOfMonth &&
        targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)
      ) {
        events.push({
          id,
          title,
          type: "monthly",
          category: entry.template_type,
        });
      }
    }

    // 5. Yearly
    if (freq === "Yearly") {
      if (
        baseDate.getMonth() === targetMonth &&
        baseDate.getDate() === dayOfMonth &&
        targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)
      ) {
        events.push({
          id,
          title,
          type: "yearly",
          category: entry.template_type,
        });
      }
    }
  });

  return events;
}
