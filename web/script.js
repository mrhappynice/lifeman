// ======================================================
// FILE: static/script.js (Netlify/Static Version)
// ======================================================

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
            { id: "event_date", label: "Date/Time (Optional)", type: "datetime-local" },
            { id: "description", label: "Details (#tags)", type: "textarea", required: true },
            { id: "frequency", label: "Is this recurring?", type: "select", options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"] },
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
            { id: "title", label: "What needs doing?", type: "text", placeholder: "e.g. Take out Trash", required: true },
            { id: "event_date", label: "Start Date (for recurring calc)", type: "datetime-local" },
            { id: "frequency", label: "How often?", type: "select", options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"] },
            { id: "assignee", label: "Who does this? (Optional)", type: "text", placeholder: "e.g. Dad, Kids" },
          ],
        },
        {
          title: "Details",
          fields: [
            { id: "description", label: "Instructions / Notes (Use #tags)", type: "textarea" },
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
            { id: "event_date", label: "Deadline / Date", type: "datetime-local" },
            { id: "frequency", label: "Timeline", type: "select", options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"] },
          ],
        },
        {
          title: "The Plan",
          fields: [
            { id: "description", label: "Desired Outcome (#tags)", type: "textarea" },
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
            { id: "title", label: "Item Name", type: "text", placeholder: "e.g. Honda Civic", required: true },
            { id: "event_date", label: "Next Maintenance/Appt Date", type: "datetime-local" },
            { id: "frequency", label: "Maintenance/Appt Cycle", type: "select", options: ["One-Time", "Daily", "Weekly", "Monthly", "Yearly"] },
          ],
        },
        {
          title: "Reference Data",
          fields: [
            { id: "description", label: "Key Data (VIN, Names, ID #) - Use #tags", type: "textarea" },
            { id: "location", label: "Where is it happening/stored?", type: "text" },
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
  
  // NEW: OS-Site Style State
  let activeTags = new Set(); 
  let searchQuery = ""; 
  
  // --- Elements ---
  const grid = document.getElementById("grid");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("wizard-body");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const searchInput = document.getElementById("search-input"); 
  
  document.addEventListener("DOMContentLoaded", () => {
      fetchEntries();
      
      searchInput.addEventListener("input", (e) => {
          searchQuery = e.target.value.trim().toLowerCase();
          refreshViews();
      });
  });
  
  // ==========================================================
  // --- DATA LAYER (REPLACED RUST BACKEND WITH LOCALSTORAGE) ---
  // ==========================================================
  
  const DB_KEY = "lifeman_data";
  
  // Helper: Generate UUID (Replaces Rust uuid::Uuid::new_v4)
  function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
  
  async function fetchEntries() {
    // OLD: const res = await fetch("/api/entries"); allEntries = await res.json();
    
    // NEW: Load from LocalStorage
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
        allEntries = JSON.parse(raw);
    } else {
        // Initialize with empty if nothing exists
        allEntries = []; 
    }
  
    // Sort logic (ported from Rust handlers.rs)
    // Sort: Pinned/Daily first (logic not in JSON but implied), then by created_at desc
    allEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  
    renderTagBar();
    refreshViews();
  }
  
  async function saveData() {
    // Prepare the payload
    const payload = {
      template_type: currentCatKey,
      title: wizardData.title || "Untitled",
      description: wizardData.description || "",
      frequency: wizardData.frequency || "One-Time",
      event_date: wizardData.event_date ? new Date(wizardData.event_date).toISOString() : null,
      tags: extractTags(wizardData.description || ""),
      details: wizardData,
      updated_at: new Date().toISOString()
    };
  
    if (editingId) {
      // --- UPDATE LOGIC ---
      const index = allEntries.findIndex(e => e.id === editingId);
      if (index !== -1) {
          // Merge existing data with new payload
          allEntries[index] = { ...allEntries[index], ...payload };
      }
    } else {
      // --- CREATE LOGIC ---
      const newEntry = {
          id: uuidv4(),
          status: "Active",
          created_at: new Date().toISOString(),
          ...payload
      };
      allEntries.push(newEntry);
    }
  
    // Persist to LocalStorage
    localStorage.setItem(DB_KEY, JSON.stringify(allEntries));
  
    closeModal();
    fetchEntries();
  }
  
  async function deleteEntry(id) {
    if (confirm("Are you sure you want to remove this?")) {
      // Filter out the deleted item
      allEntries = allEntries.filter(e => e.id !== id);
      // Save
      localStorage.setItem(DB_KEY, JSON.stringify(allEntries));
      fetchEntries();
    }
  }
  
  // ==========================================================
  // --- END DATA LAYER ---
  // ==========================================================
  
  function refreshViews() {
      if (currentView === "list") renderGrid();
      else renderCalendar();
  }
  
  // --- Tag System ---
  
  function renderTagBar() {
    const container = document.getElementById("tag-filter-bar");
    const tags = new Set();
  
    allEntries.forEach((entry) => {
      if (entry.tags) entry.tags.forEach((t) => tags.add(t));
      const matches = entry.description ? entry.description.match(/#\w+/g) : [];
      if (matches) matches.forEach((m) => tags.add(m.substring(1)));
    });
  
    container.innerHTML = "";
  
    const allBtn = document.createElement("button");
    allBtn.className = `chip ${activeTags.size === 0 ? "active" : ""}`;
    allBtn.textContent = "All";
    allBtn.onclick = () => {
        activeTags.clear();
        renderTagBar();
        refreshViews();
    };
    container.appendChild(allBtn);
  
    Array.from(tags).sort().forEach((tag) => {
        const btn = document.createElement("button");
        btn.className = `chip ${activeTags.has(tag) ? "active" : ""}`;
        btn.textContent = `#${tag}`;
        btn.onclick = () => toggleTag(tag);
        container.appendChild(btn);
    });
  }
  
  function toggleTag(tag) {
      if (activeTags.has(tag)) {
          activeTags.delete(tag);
      } else {
          activeTags.add(tag);
      }
      renderTagBar(); 
      refreshViews();
  }
  
  // --- Filter Logic ---
  
  function entryMatchesFilter(entry) {
    const textMatch = !searchQuery || 
      entry.title.toLowerCase().includes(searchQuery) || 
      (entry.description && entry.description.toLowerCase().includes(searchQuery));
  
    if (!textMatch) return false;
  
    if (activeTags.size === 0) return true;
  
    const entryTags = new Set(entry.tags || []);
    const descTags = entry.description ? entry.description.match(/#\w+/g) : [];
    if (descTags) descTags.forEach(t => entryTags.add(t.substring(1)));
  
    for (let tag of activeTags) {
        if (entryTags.has(tag)) return true;
    }
  
    return false;
  }
  
  function renderGrid() {
    grid.innerHTML = "";
    const visibleEntries = allEntries.filter(entry => entryMatchesFilter(entry));
  
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
  
  function parseTags(text) {
    if (!text) return "";
    return text.replace(
      /#(\w+)/g,
      '<span class="hashtag" onclick="filterByTag(\'$1\')">#$1</span>',
    );
  }
  
  function filterByTag(tag) {
      // Simple wrapper to support the inline onclick in parseTags
      if (!activeTags.has(tag)) {
          activeTags.clear();
          activeTags.add(tag);
          renderTagBar();
          refreshViews();
      }
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
  
    let formattedDate = "";
    if (entry.event_date) {
      const d = new Date(entry.event_date);
      const pad = (n) => (n < 10 ? "0" + n : n);
      formattedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  
    wizardData = {
      title: entry.title,
      description: entry.description,
      frequency: entry.frequency,
      event_date: formattedDate,
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
  
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
    nextBtn.innerText =
      currentStep === template.steps.length - 1
        ? editingId
          ? "Update"
          : "Save"
        : "Next";
  }
  
  window.moveWizard = async (dir) => {
    const inputs = modalBody.querySelectorAll("input, select, textarea");
    inputs.forEach((i) => {
      const key = i.id.replace("inp_", "");
      wizardData[key] = i.value;
    });
  
    const template = CATEGORIES[currentCatKey];
    const nextIdx = currentStep + dir;
  
    if (dir === -1 && currentStep === 0) {
      if (editingId) closeModal(); 
      else showCategorySelect(); 
      return;
    }
  
    if (nextIdx >= template.steps.length) {
      await saveData();
      return;
    }
  
    currentStep = nextIdx;
    renderStep();
  };
  
  function extractTags(text) {
    const match = text.match(/#\w+/g);
    return match ? match.map((t) => t.substring(1)) : []; 
  }
  
  function closeModal() {
    modal.classList.remove("open");
  }
  
  // --- Calendar Logic ---
  
  let currentDate = new Date();
  let currentView = "list";
  
  function switchView(view) {
    currentView = view;
    document.getElementById("view-list").classList.toggle("active", view === "list");
    document.getElementById("view-cal").classList.toggle("active", view === "calendar");
  
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
  
    const monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    document.getElementById("cal-month-name").innerText = `${monthNames[month]} ${year}`;
  
    const daysContainer = document.getElementById("cal-days");
    daysContainer.innerHTML = "";
  
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
  
    for (let i = 0; i < firstDayIndex; i++) {
      const div = document.createElement("div");
      div.className = "cal-day";
      div.style.background = "#111"; 
      daysContainer.appendChild(div);
    }
  
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDiv = document.createElement("div");
      dayDiv.className = "cal-day";
      
      if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayDiv.classList.add("today");
      }
  
      dayDiv.innerHTML = `<span class="day-number">${i}</span>`;
  
      const dayEvents = getEventsForDay(year, month, i);
      
      dayEvents.forEach((evt) => {
        const el = document.createElement("div");
        el.className = `cal-event type-${evt.type}`;
        el.innerText = evt.title; 
        el.onclick = (e) => {
          if(window.innerWidth > 768) {
              e.stopPropagation();
              openEdit(evt.id);
          }
        };
        dayDiv.appendChild(el);
      });
  
      dayDiv.onclick = () => {
          selectMobileDay(dayDiv, dayEvents, i, year, month);
      };
  
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
  
      const baseDateStr = entry.event_date || entry.created_at;
      const baseDate = new Date(baseDateStr);
  
      if (freq === "One-Time") {
        if (baseDate.getFullYear() === year && baseDate.getMonth() === month && baseDate.getDate() === day) {
          events.push({ id, title, type: "one-time", category: entry.template_type });
        }
      }
      if (freq === "Daily") {
        if (targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)) {
          events.push({ id, title, type: "daily", category: entry.template_type });
        }
      }
      if (freq === "Weekly") {
        if (baseDate.getDay() === dayOfWeek && targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)) {
          events.push({ id, title, type: "weekly", category: entry.template_type });
        }
      }
      if (freq === "Monthly") {
        if (baseDate.getDate() === dayOfMonth && targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)) {
          events.push({ id, title, type: "monthly", category: entry.template_type });
        }
      }
      if (freq === "Yearly") {
        if (baseDate.getMonth() === targetMonth && baseDate.getDate() === dayOfMonth && targetDate >= new Date(baseDate).setHours(0, 0, 0, 0)) {
          events.push({ id, title, type: "yearly", category: entry.template_type });
        }
      }
    });
  
    return events;
  }
  
  function selectMobileDay(el, events, day, year, month) {
      document.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
      el.classList.add('selected');
  
      const detailBox = document.getElementById('mobile-day-details');
      const titleEl = document.getElementById('mobile-selected-date-title');
      const listEl = document.getElementById('mobile-event-list');
      
      detailBox.classList.remove('hidden');
      
      const dateObj = new Date(year, month, day);
      titleEl.innerText = dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  
      if (events.length === 0) {
          listEl.innerHTML = `<div style="color:#666; font-style:italic;">No events planned.</div>`;
          return;
      }
  
      listEl.innerHTML = events.map(evt => `
          <div class="mobile-event-card" 
               style="border-left-color: ${getCategoryColor(evt.type)}"
               onclick="openEdit('${evt.id}')">
              <span>${evt.title}</span>
              <span style="font-size:0.8rem; color:#888;">${evt.category}</span>
          </div>
      `).join('');
      
      if(window.innerWidth < 600) {
          detailBox.scrollIntoView({ behavior: "smooth" });
      }
  }
  
  function getCategoryColor(type) {
      if(type === 'daily') return 'var(--success)';
      if(type === 'weekly') return 'var(--warning)';
      if(type === 'monthly') return '#2979ff';
      if(type === 'yearly') return '#ff4081';
      return 'var(--accent)';
  }
  
  
// ======================================================
// NEW: Data Import / Export Logic
// ======================================================

function downloadData() {
    if (allEntries.length === 0) {
        alert("Nothing to save!");
        return;
    }

    // 1. Convert data to JSON string
    const dataStr = JSON.stringify(allEntries, null, 2);
    
    // 2. Create a Blob (Binary Large Object)
    const blob = new Blob([dataStr], { type: "application/json" });
    
    // 3. Create a temporary download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // 4. Name the file with today's date
    const date = new Date().toISOString().split('T')[0];
    a.download = `lifeman_backup_${date}.json`;
    
    // 5. Trigger download and cleanup
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function triggerImport() {
    // Click the hidden file input programmatically
    document.getElementById('import-file').click();
}

function handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();

    // When the file is read...
    reader.onload = function(e) {
        try {
            const json = JSON.parse(e.target.result);
            
            // Basic validation
            if (!Array.isArray(json)) {
                throw new Error("File content is not a valid list.");
            }

            // Ask user for strategy
            const strategy = confirm(
                "Click OK to MERGE with existing data.\nClick Cancel to REPLACE all data."
            );

            if (strategy === false) {
                // REPLACE STRATEGY
                allEntries = json;
                localStorage.setItem(DB_KEY, JSON.stringify(allEntries));
                alert("Database replaced successfully!");
            } else {
                // MERGE STRATEGY
                // We map existing items by ID for easy lookup
                let count = 0;
                json.forEach(newItem => {
                    const index = allEntries.findIndex(old => old.id === newItem.id);
                    if (index !== -1) {
                        // Update existing
                        allEntries[index] = newItem;
                    } else {
                        // Add new
                        allEntries.push(newItem);
                    }
                    count++;
                });
                localStorage.setItem(DB_KEY, JSON.stringify(allEntries));
                alert(`Processed ${count} items.`);
            }

            // Refresh UI
            renderTagBar();
            refreshViews();

        } catch (err) {
            console.error(err);
            alert("Error reading file: " + err.message);
        }
        
        // Reset input so you can load the same file again if needed
        input.value = '';
    };

    reader.readAsText(file);
}
