let entries = JSON.parse(localStorage.getItem('bm_entries')) || [];
let currentFilter = null;
const GITHUB_EXAMPLES_URL = "https://raw.githubusercontent.com/mrhappynice/bookmarklets/refs/heads/main/entries.json";

document.addEventListener('DOMContentLoaded', () => {
    if (entries.length === 0) {
        fetch('entries.json')
            .then(res => res.json())
            .then(data => {
                entries = data;
                saveAndRefresh();
            }).catch(() => renderGrid());
    } else {
        renderGrid();
        renderTags();
    }

    document.getElementById('search-input').addEventListener('input', (e) => {
        renderGrid(e.target.value);
    });
});

function saveAndRefresh() {
    localStorage.setItem('bm_entries', JSON.stringify(entries));
    renderGrid();
    renderTags();
}

// --- FIX: Proper Attribute Escaping for 3D Page and others ---
function escapeHtmlAttribute(str) {
    if (!str) return "";
    return str.replace(/"/g, '&quot;');
}

function renderGrid(searchTerm = "") {
    const grid = document.getElementById('grid');
    grid.innerHTML = "";

    const filtered = entries.filter(item => {
        const matchesSearch = (item.title + item.description + (item.tags || []).join(' '))
            .toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTag = !currentFilter || (item.tags && item.tags.includes(currentFilter));
        return matchesSearch && matchesTag;
    });

    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        
        const descHtml = (item.description || "").replace(/#(\w+)/g, '<span class="hashtag" onclick="filterByTag(\'$1\')">#$1</span>');
        
        // Use the escape function to prevent the code from breaking the href attribute
        const safeCode = escapeHtmlAttribute(item.code);

        card.innerHTML = `
            <h3>${item.title}</h3>
            <p>${descHtml}</p>
            
            <div style="text-align: center; margin: 25px 0 15px 0;">
                <a href="${safeCode}" class="bookmarklet-pill" onclick="event.preventDefault(); alert('Drag this button to your Bookmarks Bar!');">Drag Me</a>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 10px;">
                    Drag to bookmarks bar
                </div>
            </div>

            <div class="card-actions">
                <button class="btn-icon" onclick="editEntry('${item.id}')">✏️ Edit</button>
                <button class="btn-icon" onclick="deleteEntry('${item.id}')">🗑️ Delete</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderTags() {
    const bar = document.getElementById('tag-filter-bar');
    const allTags = new Set();
    entries.forEach(e => (e.tags || []).forEach(t => allTags.add(t)));

    bar.innerHTML = `<div class="chip ${!currentFilter ? 'active' : ''}" onclick="filterByTag(null)">All</div>`;
    allTags.forEach(tag => {
        bar.innerHTML += `<div class="chip ${currentFilter === tag ? 'active' : ''}" onclick="filterByTag('${tag}')">#${tag}</div>`;
    });
}

function filterByTag(tag) {
    currentFilter = (currentFilter === tag) ? null : tag;
    renderTags();
    renderGrid();
}

// --- MODAL & EDITOR ---
function openNew() {
    showEditor({ id: crypto.randomUUID(), title: "", description: "", code: "javascript:", tags: [] });
}

function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) showEditor(entry);
}

function showEditor(entry) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('wizard-body');
    document.getElementById('save-btn').style.display = 'block';
    
    body.innerHTML = `
        <div class="form-group">
            <label>Title</label>
            <input type="text" id="edit-title" value="${entry.title || ''}">
        </div>
        <div class="form-group">
            <label>Description (Use #hashtags)</label>
            <textarea id="edit-desc" rows="3">${entry.description || ''}</textarea>
        </div>
        <div class="form-group">
            <label>Code</label>
            <textarea id="edit-code" rows="5" style="font-family:monospace; font-size:0.8rem;">${entry.code || ''}</textarea>
        </div>
        <input type="hidden" id="edit-id" value="${entry.id}">
    `;
    modal.classList.add('open');
}

function saveEntry() {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('edit-title').value;
    const description = document.getElementById('edit-desc').value;
    const code = document.getElementById('edit-code').value;
    const tags = (description.match(/#(\w+)/g) || []).map(t => t.substring(1).toLowerCase());

    const index = entries.findIndex(e => e.id === id);
    const newEntry = { id, title, description, code, tags, updated_at: new Date().toISOString() };

    if (index > -1) entries[index] = newEntry;
    else entries.push(newEntry);

    saveAndRefresh();
    closeModal();
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }
function deleteEntry(id) { if (confirm("Delete this?")) { entries = entries.filter(e => e.id !== id); saveAndRefresh(); } }

// --- DATA & URL IMPORT ---
function downloadData() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookmarklets_backup.json`;
    a.click();
}

function triggerImport() { document.getElementById('import-file').click(); }

function handleFileImport(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try { mergeEntries(JSON.parse(e.target.result)); } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
}

function openUrlModal() {
    const modal = document.getElementById('modal');
    const body = document.getElementById('wizard-body');
    document.getElementById('save-btn').style.display = 'none';
    
    body.innerHTML = `
        <h2 style="margin-top:0;">Load from URL</h2>
        <div class="form-group">
            <label>JSON URL</label>
            <input type="url" id="remote-url" placeholder="https://example.com/file.json">
        </div>
        <div style="display:flex; gap:10px; flex-direction:column;">
            <button class="btn-primary" onclick="fetchRemoteData()">Fetch Custom URL</button>
            <button class="btn-primary" onclick="fetchRemoteData('${GITHUB_EXAMPLES_URL}')" style="background:#444;">Reload GitHub Examples</button>
        </div>
    `;
    modal.classList.add('open');
}

async function fetchRemoteData(url) {
    const targetUrl = url || document.getElementById('remote-url').value;
    if (!targetUrl) return alert("Please enter a URL.");
    try {
        const response = await fetch(targetUrl);
        const data = await response.json();
        mergeEntries(data);
        closeModal();
    } catch (err) { alert("Failed: " + err.message); }
}

function mergeEntries(newEntries) {
    if (!Array.isArray(newEntries)) return;
    let count = 0;
    newEntries.forEach(item => {
        if (!entries.find(e => e.id === item.id)) { entries.push(item); count++; }
    });
    saveAndRefresh();
    alert(`Added ${count} items.`);
}