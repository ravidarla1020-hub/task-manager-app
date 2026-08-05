const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenAI } = require('@google/genai');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database & Routes
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// Initialize Official Gemini SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// AI Task Generation Endpoint
app.post('/api/ai/generate-tasks', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Break down the following goal or topic into 3 to 5 concise, actionable task items for a task manager application: "${prompt}". Return ONLY a JSON array with objects containing "title" and "description" fields. Do not include markdown code block formatting or extra text.`,
        });

        let responseText = response.text.trim();
        // Clean JSON if returned with markdown formatting
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const tasks = JSON.parse(responseText);
        res.json({ tasks });
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate tasks using AI' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));