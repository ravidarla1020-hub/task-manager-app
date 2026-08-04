const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/authMiddleware');

// Get all tasks for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create task
router.post('/', auth, async (req, res) => {
    const { title, description } = req.body;
    try {
        const [result] = await db.query('INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)', [req.user.id, title, description]);
        res.status(201).json({ id: result.insertId, title, description, status: 'pending' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task status
router.put('/:id', auth, async (req, res) => {
    const { title, description, status } = req.body;
    try {
        await db.query(
            'UPDATE tasks SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ? AND user_id = ?',
            [title, description, status, req.params.id, req.user.id]
        );
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;