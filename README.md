# 🚀 AI Task Deconstructor

An AI-powered project management dashboard that takes overwhelming, high-level goals and automatically breaks them down into an actionable, categorized Kanban workflow. 

Unlike standard chat interfaces, this application utilizes a **multi-model AI Pipeline** to not only generate sub-tasks but autonomously categorize and prioritize them using zero-shot classification before rendering them in an interactive drag-and-drop UI.


## ✨ Features
* **Intelligent Task Generation:** Input a single broad goal, and the integrated LLM acts as a virtual project manager, breaking the project down into 10-15 highly granular steps.
* **Automated Categorization:** Leverages Hugging Face zero-shot classification to automatically analyze the context of each generated task, assigning departmental tags (e.g., Engineering, Marketing, Design) and priority levels.
* **Interactive Kanban Board:** Fully functional drag-and-drop interface to manage tasks across "To Do", "In Progress", and "Done" states.
* **Seamless API Pipeline:** A custom REST API backend orchestrates the strict data flow between the client, the LLM generation engine, and the Hugging Face analysis model.

## 🛠️ Tech Stack
* **Frontend:** React, Vite, [Insert State Management e.g., Zustand/Redux], [Insert Drag-and-Drop library e.g., dnd-kit]
* **Backend:** REST API built with [Insert Python/FastAPI or Node/Express]
* **Generative AI:** [Insert Gemini/OpenAI/Claude] API for structured JSON task generation
* **Machine Learning:** Hugging Face Inference API (`facebook/bart-large-mnli`) for zero-shot text classification

## 🧠 Architecture Flow
This application utilizes a deterministic AI Pipeline (rather than autonomous agents) to ensure high reliability, speed, and strict JSON formatting:
1. **User Input:** Client submits a complex goal via the React frontend.
2. **Generation Phase:** The backend routes the prompt to the LLM with strict formatting instructions to output an array of task objects.
3. **Enrichment Phase:** The backend iterates through the generated array, piping each task description through a Hugging Face classification model to append categorical labels and priority scores.
4. **Render:** The enriched JSON payload is returned to the client and dynamically mapped to the interactive Kanban board.

