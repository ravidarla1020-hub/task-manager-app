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

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not set.' });
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash', // Updated to supported model string
            contents: `Break down the following goal or topic into 3 to 5 concise, actionable task items: "${prompt}".`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'ARRAY',
                    items: {
                        type: 'OBJECT',
                        properties: {
                            title: { type: 'STRING' },
                            description: { type: 'STRING' }
                        },
                        required: ['title', 'description']
                    }
                }
            }
        });

        const tasks = JSON.parse(response.text);
        res.json({ tasks });
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: error.message || 'Failed to generate tasks using AI' });
    }
});