document.addEventListener('DOMContentLoaded', () => {
    let token = localStorage.getItem('token');
    let isLoginMode = true;

    // DOM Elements
    const authContainer = document.getElementById('auth-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const authTitle = document.getElementById('auth-title');
    const authForm = document.getElementById('auth-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleAuthBtn = document.getElementById('toggle-auth-btn');
    const authToggleText = document.getElementById('auth-toggle-text');
    const logoutBtn = document.getElementById('logout-btn');

    const taskForm = document.getElementById('task-form');
    const taskTitleInput = document.getElementById('task-title');
    const taskDescInput = document.getElementById('task-desc');
    const taskList = document.getElementById('task-list');

    // Initial View Logic
    if (token) {
        showDashboard();
    } else {
        showAuth();
    }

    // Toggle Login / Register
    toggleAuthBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        if (isLoginMode) {
            authTitle.textContent = 'Login';
            authSubmitBtn.textContent = 'Login';
            authToggleText.textContent = "Don't have an account?";
            toggleAuthBtn.textContent = 'Register';
        } else {
            authTitle.textContent = 'Register';
            authSubmitBtn.textContent = 'Register';
            authToggleText.textContent = 'Already have an account?';
            toggleAuthBtn.textContent = 'Login';
        }
    });

    // Handle Authentication Submit
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok) {
                if (isLoginMode) {
                    token = data.token;
                    localStorage.setItem('token', token);
                    showDashboard();
                } else {
                    alert('Registration successful! Please log in.');
                    toggleAuthBtn.click();
                }
            } else {
                alert(data.error || 'Authentication failed');
            }
        } catch (err) {
            alert('Server connection error');
        }
    });

    // Handle Logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        token = null;
        showAuth();
    });

    // Fetch and Display Tasks
    async function loadTasks() {
        try {
            const res = await fetch('/api/tasks', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                logoutBtn.click();
                return;
            }

            const tasks = await res.json();
            renderTasks(tasks);
        } catch (err) {
            console.error('Failed to load tasks:', err);
        }
    }

    // Render Tasks to DOM
    function renderTasks(tasks) {
        taskList.innerHTML = '';
        if (!Array.isArray(tasks) || tasks.length === 0) {
            taskList.innerHTML = '<li style="text-align:center; color:#888;">No tasks found.</li>';
            return;
        }

        tasks.forEach(task => {
            const li = document.createElement('li');
            li.className = `task-item ${task.completed ? 'completed' : ''}`;
            li.innerHTML = `
                <div class="task-info">
                    <h4 class="task-title">${escapeHtml(task.title)}</h4>
                    ${task.description ? `<p>${escapeHtml(task.description)}</p>` : ''}
                </div>
                <div class="task-actions">
                    <button class="complete-btn">${task.completed ? '↩️' : '✅'}</button>
                    <button class="delete-btn">🗑️</button>
                </div>
            `;

            // Complete Toggle
            li.querySelector('.complete-btn').addEventListener('click', async () => {
                await fetch(`/api/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ completed: !task.completed })
                });
                loadTasks();
            });

            // Delete Task
            li.querySelector('.delete-btn').addEventListener('click', async () => {
                await fetch(`/api/tasks/${task.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                loadTasks();
            });

            taskList.appendChild(li);
        });
    }

    // Handle Task Creation
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = taskTitleInput.value.trim();
        const description = taskDescInput.value.trim();

        if (!title) return;

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ title, description })
            });

            if (res.ok) {
                taskTitleInput.value = '';
                taskDescInput.value = '';
                loadTasks();
            } else {
                alert('Failed to add task');
            }
        } catch (err) {
            alert('Error creating task');
        }
    });

    // Helper Functions
    function showAuth() {
        authContainer.classList.remove('hidden');
        dashboardContainer.classList.add('hidden');
    }

    function showDashboard() {
        authContainer.classList.add('hidden');
        dashboardContainer.classList.remove('hidden');
        loadTasks();
    }

    function escapeHtml(str) {
        return str ? str.replace(/[&<>"']/g, match => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[match])) : '';
    }
});