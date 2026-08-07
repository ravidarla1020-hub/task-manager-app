import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import CommonJS routes cleanly
const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);

// Initialize Gemini Client
let ai = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} else {
    console.warn('WARNING: GEMINI_API_KEY is missing from environment variables.');
}

// Helper function with fallback model strategy
async function generateWithFallback(prompt) {
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            console.log(`Attempting generation with model: ${modelName}`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: `Break down the following goal or topic into 3 to 5 concise, actionable task items for a task manager application: "${prompt}".`,
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
            return response.text;
        } catch (err) {
            console.warn(`Model ${modelName} failed:`, err.message);
            lastError = err;
        }
    }
    throw lastError;
}

// AI Task Generation Endpoint
app.post('/api/ai/generate-tasks', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!ai) {
            return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
        }

        const rawJsonText = await generateWithFallback(prompt);
        const tasks = JSON.parse(rawJsonText);
        res.json({ tasks });
    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ 
            error: error.message || 'Failed to generate tasks using AI.' 
        });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));