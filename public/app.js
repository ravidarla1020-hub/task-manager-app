// ============================================
// Configuration & Constants
// ============================================
const CONFIG = {
    API_URL: import.meta?.env?.VITE_API_URL || '/api',
    TOKEN_KEY: 'taskspace_token',
    USER_KEY: 'taskspace_user',
    THEME_KEY: 'taskspace_theme',
};

const STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'completed',
};

// ============================================
// State Management
// ============================================
const state = {
    tasks: [],
    isLogin: true,
    currentFilter: {
        search: '',
        status: 'all',
        priority: 'all',
    },
    editingTaskId: null,
};

// ============================================
// DOM Cache
// ============================================
const DOM = {
    // Auth
    authBox: document.getElementById('auth-box'),
    dashboard: document.getElementById('dashboard'),
    authTitle: document.getElementById('auth-title'),
    authBtn: document.getElementById('auth-btn'),
    authBtnText: document.getElementById('auth-btn-text'),
    usernameInput: document.getElementById('username'),
    usernameWrapper: document.getElementById('username-wrapper'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    toggleLink: document.getElementById('toggle-link'),
    authForm: document.getElementById('auth-form'),
    
    // Dashboard
    userDisplay: document.getElementById('user-display'),
    taskList: document.getElementById('task-list'),
    statTotal: document.getElementById('stat-total'),
    statPending: document.getElementById('stat-pending'),
    statCompleted: document.getElementById('stat-completed'),
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),
    searchInput: document.getElementById('search-input'),
    filterStatus: document.getElementById('filter-status'),
    filterPriority: document.getElementById('filter-priority'),
    
    // Modal
    taskModal: document.getElementById('task-modal'),
    taskForm: document.getElementById('task-form'),
    taskTitle: document.getElementById('task-title'),
    taskDesc: document.getElementById('task-desc'),
    taskPriority: document.getElementById('task-priority'),
    taskDate: document.getElementById('task-date'),
    taskSubmitBtn: document.getElementById('task-submit-btn'),
    modalTitle: document.getElementById('modal-title'),
    
    // Theme
    themeToggle: document.getElementById('theme-toggle'),
    
    // Loading
    loadingScreen: document.getElementById('loading-screen'),
};

// ============================================
// Toast System
// ============================================
function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const icons = {
        success: 'fa-regular fa-circle-check',
        error: 'fa-regular fa-circle-xmark',
        warning: 'fa-regular fa-triangle-exclamation',
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="${icons[type] || icons.success}" aria-hidden="true"></i>
        <span class="toast-content">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ============================================
// HTTP Client
// ============================================
const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem(CONFIG.TOKEN_KEY);
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
            ...options.headers,
        };
        
        try {
            const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
                ...options,
                headers,
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || data.error || 'Request failed');
            }
            
            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                showToast('Network error. Please check your connection.', 'error');
            } else {
                showToast(error.message, 'error');
            }
            throw error;
        }
    },
    
    auth: {
        login(email, password) {
            return api.request('/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            });
        },
        register(username, email, password) {
            return api.request('/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password }),
            });
        },
    },
    
    tasks: {
        getAll() {
            return api.request('/tasks');
        },
        create(task) {
            return api.request('/tasks', {
                method: 'POST',
                body: JSON.stringify(task),
            });
        },
        update(id, updates) {
            return api.request(`/tasks/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates),
            });
        },
        delete(id) {
            return api.request(`/tasks/${id}`, {
                method: 'DELETE',
            });
        },
    },
};

// ============================================
// Auth Functions
// ============================================
function toggleAuthMode() {
    state.isLogin = !state.isLogin;
    DOM.authTitle.textContent = state.isLogin ? 'Welcome Back' : 'Create Account';
    DOM.usernameWrapper.style.display = state.isLogin ? 'none' : 'block';
    DOM.authBtnText.textContent = state.isLogin ? 'Sign In' : 'Register';
    DOM.toggleLink.innerHTML = state.isLogin 
        ? "Don't have an account? <span class='highlight'>Register</span>"
        : "Already registered? <span class='highlight'>Login</span>";
    
    // Clear form
    DOM.authForm.reset();
}

async function handleAuth(e) {
    e.preventDefault();
    
    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value.trim();
    const username = DOM.usernameInput.value.trim();
    
    // Validate
    if (!email || !password) {
        showToast('Please fill in all required fields', 'warning');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }
    
    if (!state.isLogin && !username) {
        showToast('Please enter your name', 'warning');
        return;
    }
    
    try {
        const authBtn = DOM.authBtn;
        authBtn.disabled = true;
        authBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
        
        let result;
        if (state.isLogin) {
            result = await api.auth.login(email, password);
        } else {
            result = await api.auth.register(username, email, password);
        }
        
        if (state.isLogin) {
            localStorage.setItem(CONFIG.TOKEN_KEY, result.token);
            localStorage.setItem(CONFIG.USER_KEY, result.username || result.email);
            showToast(`Welcome back, ${result.username || result.email}!`, 'success');
            initDashboard();
        } else {
            showToast('Registered successfully! Please sign in.', 'success');
            toggleAuthMode();
        }
    } catch (error) {
        // Error already handled by api
    } finally {
        DOM.authBtn.disabled = false;
        DOM.authBtn.innerHTML = `<span id="auth-btn-text">${state.isLogin ? 'Sign In' : 'Register'}</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
}

// ============================================
// Dashboard Functions
// ============================================
function initDashboard() {
    DOM.authBox.style.display = 'none';
    DOM.dashboard.style.display = 'block';
    DOM.userDisplay.textContent = localStorage.getItem(CONFIG.USER_KEY) || 'User';
    
    // Hide loading screen
    DOM.loadingScreen.classList.add('hidden');
    
    loadTasks();
}

// ============================================
// Task Functions
// ============================================
async function loadTasks() {
    try {
        const tasks = await api.tasks.getAll();
        state.tasks = tasks;
        updateMetrics(tasks);
        renderTasks(tasks);
    } catch (error) {
        // Error already handled
        state.tasks = [];
        renderTasks([]);
    }
}

function updateMetrics(tasks) {
    const total = tasks.length;
    const pending = tasks.filter(t => t.status !== STATUS.COMPLETED).length;
    const completed = tasks.filter(t => t.status === STATUS.COMPLETED).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    DOM.statTotal.textContent = total;
    DOM.statPending.textContent = pending;
    DOM.statCompleted.textContent = completed;
    DOM.progressBar.style.width = `${progress}%`;
    DOM.progressText.textContent = `${progress}%`;
}

function renderTasks(tasks) {
    const list = DOM.taskList;
    
    if (!tasks || tasks.length === 0) {
        const template = document.getElementById('empty-state');
        list.innerHTML = template.innerHTML;
        return;
    }
    
    list.innerHTML = tasks.map(task => `
        <div class="task-item ${task.status === STATUS.COMPLETED ? 'completed' : ''}" data-task-id="${task.id}">
            <div>
                <div class="task-header">
                    <h4 class="task-title">${escapeHtml(task.title)}</h4>
                    <span class="badge priority-${task.priority || 'medium'}">
                        ${task.priority || 'Medium'}
                    </span>
                </div>
                ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                <div class="task-meta">
                    <span class="status-badge status-${task.status}">${task.status}</span>
                    ${task.due_date ? `<span class="task-date"><i class="fa-regular fa-calendar"></i> ${formatDate(task.due_date)}</span>` : ''}
                </div>
            </div>
            <div class="task-footer">
                <span class="task-date">${task.created_at ? formatDate(task.created_at) : ''}</span>
                <div class="action-btns">
                    <button class="btn-icon" onclick="toggleTaskStatus(${task.id})" title="Toggle Status">
                        <i class="fa-solid ${task.status === STATUS.COMPLETED ? 'fa-rotate-left' : 'fa-check'}"></i>
                    </button>
                    <button class="btn-icon" onclick="editTask(${task.id})" title="Edit Task">
                        <i class="fa-regular fa-pen-to-square"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteTask(${task.id})" title="Delete Task">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterTasks() {
    const search = DOM.searchInput.value.toLowerCase().trim();
    const status = DOM.filterStatus.value;
    const priority = DOM.filterPriority.value;
    
    const filtered = state.tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(search) || 
                             (task.description && task.description.toLowerCase().includes(search));
        const matchesStatus = status === 'all' || task.status === status;
        const matchesPriority = priority === 'all' || (task.priority || 'medium') === priority;
        return matchesSearch && matchesStatus && matchesPriority;
    });
    
    renderTasks(filtered);
}

// Debounced search
let searchTimeout;
function debouncedFilter() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(filterTasks, 300);
}

// ============================================
// Task CRUD Operations
// ============================================
async function createTask(e) {
    if (e) e.preventDefault();
    
    const title = DOM.taskTitle.value.trim();
    const description = DOM.taskDesc.value.trim();
    const priority = DOM.taskPriority.value;
    const due_date = DOM.taskDate.value;
    
    if (!title) {
        showToast('Task title is required', 'warning');
        return;
    }
    
    try {
        const submitBtn = DOM.taskSubmitBtn;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';
        
        const taskData = { title, description, priority, due_date: due_date || undefined };
        
        if (state.editingTaskId) {
            await api.tasks.update(state.editingTaskId, taskData);
            showToast('Task updated successfully!', 'success');
        } else {
            await api.tasks.create(taskData);
            showToast('Task created successfully!', 'success');
        }
        
        closeModal();
        await loadTasks();
    } catch (error) {
        // Error already handled
    } finally {
        DOM.taskSubmitBtn.disabled = false;
        DOM.taskSubmitBtn.innerHTML = `<i class="fa-solid fa-plus"></i> ${state.editingTaskId ? 'Update' : 'Create'} Task`;
    }
}

async function toggleTaskStatus(id) {
    try {
        const task = state.tasks.find(t => t.id === id);
        if (!task) return;
        
        const newStatus = task.status === STATUS.COMPLETED ? STATUS.PENDING : STATUS.COMPLETED;
        await api.tasks.update(id, { status: newStatus });
        await loadTasks();
        showToast(`Task marked as ${newStatus}`, 'success');
    } catch (error) {
        // Error already handled
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
        await api.tasks.delete(id);
        await loadTasks();
        showToast('Task deleted successfully', 'success');
    } catch (error) {
        // Error already handled
    }
}

function editTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    
    state.editingTaskId = id;
    DOM.modalTitle.textContent = 'Edit Task';
    DOM.taskSubmitBtn.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Update Task`;
    DOM.taskTitle.value = task.title;
    DOM.taskDesc.value = task.description || '';
    DOM.taskPriority.value = task.priority || 'medium';
    DOM.taskDate.value = task.due_date || '';
    
    openModal();
}

// ============================================
// Modal Functions
// ============================================
function openModal() {
    DOM.taskModal.classList.add('active');
    DOM.taskModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    DOM.taskModal.classList.remove('active');
    DOM.taskModal.style.display = 'none';
    document.body.style.overflow = '';
    state.editingTaskId = null;
    DOM.modalTitle.textContent = 'Create New Task';
    DOM.taskSubmitBtn.innerHTML = `<i class="fa-solid fa-plus"></i> Create Task`;
    DOM.taskForm.reset();
}

// ============================================
// Theme Functions
// ============================================
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(CONFIG.THEME_KEY, newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = DOM.themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fa-regular fa-sun' : 'fa-regular fa-moon';
}

function loadTheme() {
    const savedTheme = localStorage.getItem(CONFIG.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return dateString;
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    });
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.clear();
        location.reload();
    }
}

// ============================================
// Password Toggle
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.querySelector('.toggle-password');
    const passwordInput = DOM.passwordInput;
    
    if (toggleBtn && passwordInput) {
        toggleBtn.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.querySelector('i').className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
        });
    }
});

// ============================================
// Event Listeners
// ============================================
// Auth
DOM.authForm.addEventListener('submit', handleAuth);
DOM.toggleLink.addEventListener('click', toggleAuthMode);
DOM.toggleLink.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') toggleAuthMode();
});

// Theme
DOM.themeToggle.addEventListener('click', toggleTheme);

// Modal
DOM.taskForm.addEventListener('submit', createTask);

// Close modal on backdrop click
DOM.taskModal.addEventListener('click', (e) => {
    if (e.target === DOM.taskModal) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

// ============================================
// Keyboard Shortcuts
// ============================================
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K: Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        DOM.searchInput.focus();
    }
    // Ctrl/Cmd + N: New task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (DOM.dashboard.style.display !== 'none') {
            openModal();
        }
    }
});

// ============================================
// Initialization
// ============================================
loadTheme();

// Auto-login check
if (localStorage.getItem(CONFIG.TOKEN_KEY)) {
    initDashboard();
} else {
    DOM.loadingScreen.classList.add('hidden');
}

// Export for inline onclick handlers
window.toggleAuthMode = toggleAuthMode;
window.handleAuth = handleAuth;
window.logout = logout;
window.openModal = openModal;
window.closeModal = closeModal;
window.createTask = createTask;
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.filterTasks = filterTasks;
window.debouncedFilter = debouncedFilter;
window.showToast = showToast;
window.loadTasks = loadTasks;

console.log('🚀 TaskSpace Pro initialized');
console.log('📝 Keyboard shortcuts: Ctrl+K (search), Ctrl+N (new task)');