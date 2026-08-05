const API_URL = '/api';
let isLogin = true;
let globalTasks = [];

function toggleAuthMode() {
    isLogin = !isLogin;
    document.getElementById('auth-title').innerText = isLogin ? 'Welcome Back' : 'Create Account';
    document.getElementById('username').style.display = isLogin ? 'none' : 'block';
    document.getElementById('auth-btn').innerText = isLogin ? 'Sign In' : 'Register';
    document.getElementById('toggle-link').innerText = isLogin ? "Don't have an account? Register" : 'Already registered? Login';
}

async function handleAuth() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    try {
        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            if (isLogin) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                initDashboard();
            } else {
                alert('Account registered successfully! Please sign in.');
                toggleAuthMode();
            }
        } else {
            alert(data.message || data.error || 'Authentication failed');
        }
    } catch (err) {
        alert('Server unreachable');
    }
}

function initDashboard() {
    document.getElementById('auth-box').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('user-display').innerText = localStorage.getItem('username');
    loadTasks();
}

async function loadTasks() {
    try {
        const res = await fetch(`${API_URL}/tasks`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        globalTasks = await res.json();
        updateMetrics(globalTasks);
        renderTasks(globalTasks);
    } catch (err) {
        console.error('Error loading tasks:', err);
    }
}

function updateMetrics(tasks) {
    document.getElementById('stat-total').innerText = tasks.length;
    document.getElementById('stat-pending').innerText = tasks.filter(t => t.status !== 'completed').length;
    document.getElementById('stat-completed').innerText = tasks.filter(t => t.status === 'completed').length;
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-folder-open"></i>
                <h3>No tasks found</h3>
                <p>Click <strong>"+ New Task"</strong> or use <strong>AI Assistant</strong> to generate work items.</p>
            </div>
        `;
        return;
    }

    tasks.forEach(t => {
        const item = document.createElement('div');
        item.className = `task-item ${t.status === 'completed' ? 'completed' : ''}`;
        item.innerHTML = `
            <div>
                <h4>${t.title}</h4>
                <p>${t.description || 'No description provided.'}</p>
            </div>
            <div class="task-footer">
                <small style="color: var(--text-muted);">Status: <strong>${t.status}</strong></small>
                <div style="display:flex; gap: 10px;">
                    <button class="btn-icon" title="Toggle Complete" onclick="toggleStatus(${t.id}, '${t.status}')">
                        <i class="fa-solid ${t.status === 'completed' ? 'fa-rotate-left' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Delete Task" onclick="deleteTask(${t.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        list.appendChild(item);
    });
}

function filterTasks() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('filter-status').value;

    const filtered = globalTasks.filter(t => {
        const matchesQuery = t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query));
        const matchesStatus = status === 'all' || t.status === status;
        return matchesQuery && matchesStatus;
    });

    renderTasks(filtered);
}

async function createTask(presetTitle = null, presetDesc = null) {
    const title = presetTitle || document.getElementById('task-title').value;
    const description = presetDesc || document.getElementById('task-desc').value;

    if (!title) return alert('Task title is required');

    await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ title, description })
    });

    if (!presetTitle) {
        closeModal();
        document.getElementById('task-title').value = '';
        document.getElementById('task-desc').value = '';
    }
    loadTasks();
}

async function toggleStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: nextStatus })
    });
    loadTasks();
}

async function deleteTask(id) {
    await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    loadTasks();
}

/* AI Assistant Functions */
function toggleAIPanel() {
    document.getElementById('ai-drawer').classList.toggle('open');
}

function generateAITasks() {
    const prompt = document.getElementById('ai-prompt').value.toLowerCase();
    const container = document.getElementById('ai-suggestions');
    container.innerHTML = '';

    if (!prompt) return alert('Please enter a topic or goal for the AI.');

    // Simulated Smart Breakdown Logic
    let suggestedTasks = [
        { title: `Initial Outline for: ${prompt}`, desc: "Draft high-level scope and key requirements." },
        { title: `Review & Execute core components`, desc: "Focus on primary deliverables and verification." },
        { title: `Final Quality Check`, desc: "Review end results and finalize documentation." }
    ];

    suggestedTasks.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = 'ai-suggestion-card';
        card.innerHTML = `
            <div>
                <h5>${t.title}</h5>
                <p>${t.desc}</p>
            </div>
            <button class="btn btn-primary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="addAITask('${t.title}', '${t.desc}', this)">
                <i class="fa-solid fa-plus"></i> Add
            </button>
        `;
        container.appendChild(card);
    });
}

async function addAITask(title, desc, btn) {
    await createTask(title, desc);
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
    btn.disabled = true;
    btn.style.background = '#10b981';
}

function openModal() { document.getElementById('task-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('task-modal').style.display = 'none'; }
function logout() { localStorage.clear(); location.reload(); }

if (localStorage.getItem('token')) initDashboard();
async function generateAITasks() {
    const prompt = document.getElementById('ai-prompt').value.trim();
    const container = document.getElementById('ai-suggestions');
    
    if (!prompt) return alert('Please enter a topic or goal for the AI.');

    container.innerHTML = '<p style="color: var(--text-muted); text-align: center;"><i class="fa-solid fa-spinner fa-spin"></i> Generating tasks using Gemini AI...</p>';

    try {
        const res = await fetch('/api/ai/generate-tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt })
        });

        const data = await res.json();
        container.innerHTML = '';

        if (res.ok && data.tasks) {
            data.tasks.forEach((t) => {
                const card = document.createElement('div');
                card.className = 'ai-suggestion-card';
                card.innerHTML = `
                    <div>
                        <h5>${t.title}</h5>
                        <p>${t.description || ''}</p>
                    </div>
                    <button class="btn btn-primary" style="padding: 6px 10px; font-size: 0.8rem;" onclick="addAITask('${t.title.replace(/'/g, "\\'")}', '${(t.description || '').replace(/'/g, "\\'")}', this)">
                        <i class="fa-solid fa-plus"></i> Add
                    </button>
                `;
                container.appendChild(card);
            });
        } else {
            container.innerHTML = `<p style="color: #ef4444;">${data.error || 'Failed to generate tasks.'}</p>`;
        }
    } catch (err) {
        container.innerHTML = '<p style="color: #ef4444;">Error connecting to AI service.</p>';
    }
}