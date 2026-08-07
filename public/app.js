document.addEventListener('DOMContentLoaded', () => {
    const aiPanel = document.getElementById('ai-panel');
    const toggleAiBtn = document.getElementById('toggle-ai-btn');
    const closeAiBtn = document.getElementById('close-ai-btn');
    const generateBtn = document.getElementById('generate-tasks-btn');
    const promptInput = document.getElementById('ai-prompt-input');
    const aiStatus = document.getElementById('ai-status');

    // Drawer Toggle
    toggleAiBtn.addEventListener('click', () => aiPanel.classList.add('open'));
    closeAiBtn.addEventListener('click', () => aiPanel.classList.remove('open'));

    // AI Task Generator Request
    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        aiStatus.textContent = "✨ Generating task breakdown...";
        generateBtn.disabled = true;

        try {
            const response = await fetch('/api/ai/generate-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            if (response.ok) {
                aiStatus.textContent = `✅ Successfully created ${data.tasks.length} tasks!`;
                promptInput.value = '';
                setTimeout(() => aiPanel.classList.remove('open'), 1500);
                location.reload(); // Refresh task list
            } else {
                aiStatus.textContent = `❌ ${data.error || 'Failed to generate'}`;
            }
        } catch (err) {
            aiStatus.textContent = "❌ Connection error";
        } finally {
            generateBtn.disabled = false;
        }
    });
});