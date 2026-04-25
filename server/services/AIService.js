import { GoogleGenAI } from '@google/genai';

class AIService {
  constructor() {
    // We will initialize it lazily in generateTasksForGoal
  }

  /**
   * Helper orchestration method that uses Hugging Face Zero-Shot Classification 
   * to strictly categorize a given task description into a predefined bucket.
   */
  async categorizeTaskWithHF(text) {
    if (!process.env.HF_API_KEY) {
      console.warn("[AIService] Missing HF_API_KEY. Defaulting task tag.");
      return "AI Generated";
    }

    try {
      const response = await fetch("https://api-inference.huggingface.co/models/facebook/bart-large-mnli", {
        headers: {
          Authorization: `Bearer ${process.env.HF_API_KEY}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: text,
          parameters: {
            candidate_labels: ["Frontend", "Backend", "Logistics", "Design", "QA"],
          },
        }),
      });

      const result = await response.json();

      // If error occurs (like model loading), it returns { error: "Model ... is currently loading" }
      if (result.error) {
        console.warn("[AIService] HuggingFace API returned an issue:", result.error);
        return "Categorizing..."; // Provide a graceful fallback
      }

      // Extract highest confidence label
      if (Array.isArray(result) && result.length > 0) {
        return result[0].labels[0];
      } else if (result.labels && result.labels.length > 0) {
        return result.labels[0];
      }

      return "Uncategorized";

    } catch (err) {
      console.error("[AIService] HF Categorization Request Failed:", err);
      return "AI Generated";
    }
  }

  /**
   * Generates tasks securely from a user goal and context using Gemini LLM.
   */
  async generateTasksForGoal(goal, context) {
    console.log(`[AIService] Contacting Gemini for goal: "${goal}"`);
    console.log(`[AIService] Context:`, context);

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing in server/.env");
    }

    const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const { timeframe, teamSize, strictness } = context;

    // Construct the prompt payload
    const systemPrompt = `You are an expert project manager. The user will give you a broad goal. Break this goal down into 10-15 actionable sub-tasks. You must return the output STRICTLY as a JSON array of objects, where each object has a 'title' and a 'description' property. Do not include markdown formatting or any other text.`;

    const userPrompt = `Goal: ${goal}\nTimeframe: ${timeframe || 'unspecified'}\nTeam Size: ${teamSize || 'unspecified'}\nStrictness: ${strictness || 'unspecified'}`;

    try {
      // Call Gemini 2.5 Flash for fast structured generation
      const response = await aiClient.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'user', parts: [{ text: systemPrompt + '\n\n' + userPrompt }] }
        ],
        config: {
          // Force JSON schema configuration
          responseMimeType: "application/json",
          temperature: 0.2 // keep it highly deterministic
        }
      });

      const rawOutput = response.text;

      // Attempt to parse the strictly requested JSON array
      let parsedArray;
      try {
        parsedArray = JSON.parse(rawOutput);
        console.log("\n--- RAW JSON FROM GEMINI ---");
        console.log(JSON.stringify(parsedArray, null, 2));
        console.log("----------------------------\n");
      } catch (parseError) {
        // Fallback cleanup if the model included nasty markdown codeblocks
        const cleanedStr = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedArray = JSON.parse(cleanedStr);
        console.log("\n--- CLEANED RAW JSON FROM GEMINI ---");
        console.log(JSON.stringify(parsedArray, null, 2));
        console.log("------------------------------------\n");
      }

      if (!Array.isArray(parsedArray)) {
        throw new Error("Target response was not a JSON array.");
      }

      // Map the generic {title, description} to the frontend Kanaban schema { id, content, tag, date }
      const initialMappedTasks = parsedArray.map((item, index) => ({
        id: `ai-${Date.now()}-${index}`,
        content: `${item.title}: ${item.description}`,
        tag: 'Pending',
        date: 'Scheduled'
      }));

      console.log(`[AIService] Step 1 Complete. Initiating Hugging Face Orchestration for ${initialMappedTasks.length} tasks...`);

      // STEP 2: Agentic Orchestration Loop
      const categorizedTasks = await Promise.all(
        initialMappedTasks.map(async (task) => {
          const categorizedTag = await this.categorizeTaskWithHF(task.content);
          return {
            ...task,
            tag: categorizedTag
          };
        })
      );

      console.log(`[AIService] Step 2 Complete. Orchestration mapping finished.`);

      return categorizedTasks;

    } catch (error) {
      console.error("[AIService] Gemini API Error:", error);
      throw error; // Re-throw to be caught by TaskController
    }
  }
}

export default AIService;
