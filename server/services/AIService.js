import { GoogleGenAI } from '@google/genai';

class AIService {
  constructor() {
    // Initialize the Gemini client. It automatically picks up GEMINI_API_KEY from process.env
    this.ai = new GoogleGenAI();
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

    const { timeframe, teamSize, strictness } = context;

    // Construct the prompt payload
    const systemPrompt = `You are an expert project manager. The user will give you a broad goal. Break this goal down into 10-15 actionable sub-tasks. You must return the output STRICTLY as a JSON array of objects, where each object has a 'title' and a 'description' property. Do not include markdown formatting or any other text.`;

    const userPrompt = `Goal: ${goal}\nTimeframe: ${timeframe || 'unspecified'}\nTeam Size: ${teamSize || 'unspecified'}\nStrictness: ${strictness || 'unspecified'}`;

    try {
      // Call Gemini 2.5 Flash for fast structured generation
      const response = await this.ai.models.generateContent({
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
      const mappedTasks = parsedArray.map((item, index) => ({
        id: `ai-${Date.now()}-${index}`,
        content: `${item.title}: ${item.description}`,
        tag: 'Phase ' + (Math.floor(index / 3) + 1), // Pseudo tagging based on sequence
        date: 'Scheduled'
      }));

      return mappedTasks;

    } catch (error) {
      console.error("[AIService] Gemini API Error:", error);
      throw error; // Re-throw to be caught by TaskController
    }
  }
}

export default AIService;
