import { randomUUID } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import AppError from '../utils/AppError.js';
import {
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  validateCanonicalTask,
  validateGeneratedTasksPayload,
} from '../utils/taskValidation.js';

const HF_MODEL_URL =
  'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli';
const FALLBACK_CATEGORY = 'Research';
const DEFAULT_HF_CONCURRENCY = 3;
const DEFAULT_HF_TIMEOUT_MS = 8000;

const GEMINI_RESPONSE_SCHEMA = {
  type: 'array',
  minItems: 10,
  maxItems: 15,
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'priority', 'estimatedDuration'],
    properties: {
      title: {
        type: 'string',
        description: 'A concise, action-oriented task title.',
      },
      description: {
        type: 'string',
        description: 'A specific and actionable explanation of the task.',
      },
      priority: {
        type: 'string',
        enum: TASK_PRIORITIES,
      },
      estimatedDuration: {
        type: 'string',
        description: 'A realistic duration such as 4 hours or 2 days.',
      },
    },
  },
};

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(
    Array.from({ length: workerCount }, () => worker()),
  );

  return results;
}

class AIService {
  constructor({
    aiClientFactory = (apiKey) => new GoogleGenAI({ apiKey }),
    fetchImpl = globalThis.fetch,
    uuidFactory = randomUUID,
    hfConcurrency = DEFAULT_HF_CONCURRENCY,
    hfTimeoutMs = DEFAULT_HF_TIMEOUT_MS,
  } = {}) {
    this.aiClientFactory = aiClientFactory;
    this.fetchImpl = fetchImpl;
    this.uuidFactory = uuidFactory;
    this.hfConcurrency = hfConcurrency;
    this.hfTimeoutMs = hfTimeoutMs;
  }

  async categorizeTaskWithHF(text) {
    if (!process.env.HF_API_KEY) {
      return FALLBACK_CATEGORY;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.hfTimeoutMs);

    try {
      const response = await this.fetchImpl(HF_MODEL_URL, {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: controller.signal,
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: TASK_CATEGORIES,
          },
        }),
      });

      if (!response.ok) {
        return FALLBACK_CATEGORY;
      }

      const result = await response.json();
      const category = Array.isArray(result) ? result[0]?.label : undefined;

      if (
        typeof category === 'string'
        && TASK_CATEGORIES.includes(category)
      ) {
        return category;
      }

      return FALLBACK_CATEGORY;
    } catch {
      return FALLBACK_CATEGORY;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generateTasksForGoal(goal, context) {
    if (!process.env.GEMINI_API_KEY) {
      throw new AppError(
        'CONFIGURATION_ERROR',
        'The task-generation service is not configured.',
        500,
      );
    }

    const aiClient = this.aiClientFactory(process.env.GEMINI_API_KEY);
    const { timeframe, teamSize, strictness } = context;
    const systemPrompt = [
      'You are an expert project manager.',
      'Break the user goal into 10-15 concrete, actionable tasks.',
      'Each task must include title, description, priority, and estimatedDuration.',
      'Priority must be High, Medium, or Low.',
      'Make durations realistic for the supplied context.',
      'Return only the structured data requested by the response schema.',
    ].join(' ');
    const userPrompt = [
      `Goal: ${goal}`,
      `Timeframe: ${timeframe || 'unspecified'}`,
      `Team size: ${teamSize || 'unspecified'}`,
      `Planning detail: ${strictness || 'unspecified'}`,
    ].join('\n');

    try {
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseJsonSchema: GEMINI_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
      });

      const rawOutput = response.text;

      if (typeof rawOutput !== 'string' || !rawOutput.trim()) {
        throw new AppError(
          'AI_RESPONSE_INVALID',
          'The AI provider returned an empty response.',
          502,
        );
      }

      let parsedTasks;
      try {
        parsedTasks = JSON.parse(rawOutput);
      } catch {
        throw new AppError(
          'AI_RESPONSE_INVALID',
          'The AI provider returned malformed JSON.',
          502,
        );
      }

      const generatedTasks = validateGeneratedTasksPayload(parsedTasks);
      const categories = await mapWithConcurrency(
        generatedTasks,
        this.hfConcurrency,
        (task) => this.categorizeTaskWithHF(
          `${task.title}. ${task.description}`,
        ),
      );

      return generatedTasks.map((task, index) => validateCanonicalTask({
        id: this.uuidFactory(),
        ...task,
        category: categories[index],
        status: 'todo',
      }));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        'AI_PROVIDER_ERROR',
        'The task-generation provider could not complete the request.',
        502,
      );
    }
  }
}

export default AIService;
