const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_123', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// GET all tasks for logged-in user
router.get('/', authenticateToken, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST create task
router.post('/', authenticateToken, async (req, res) => {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    try {
        const [result] = await db.query(
            'INSERT INTO tasks (user_id, title, description, status) VALUES (?, ?, ?, "pending")',
            [req.user.id, title, description || '']
        );
        res.status(201).json({ id: result.insertId, title, description, status: 'pending' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT update task status
router.put('/:id', authenticateToken, async (req, res) => {
    const { status } = req.body;
    try {
        await db.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.user.id]);
        res.json({ message: 'Task updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE task
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;