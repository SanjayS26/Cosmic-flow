import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import './index.css';

const initialData = {
  tasks: {
    'task-1': { id: 'task-1', content: 'Design aesthetic Kanban UI', tag: 'UI/UX', date: 'Apr 24' },
    'task-2': { id: 'task-2', content: 'Initialize Vite React App', tag: 'Setup', date: 'Apr 24' },
    'task-3': { id: 'task-3', content: 'Implement Drag and Drop functionality', tag: 'Feature', date: 'Apr 25' },
    'task-4': { id: 'task-4', content: 'Apply Glassmorphism styling', tag: 'CSS', date: 'Apr 25' },
    'task-5': { id: 'task-5', content: 'Test user experience flows', tag: 'QA', date: 'Apr 26' },
    'task-6': { id: 'task-6', content: 'Refactor components', tag: 'Tech Debt', date: 'Apr 26' },
  },
  columns: {
    'column-1': {
      id: 'column-1',
      title: 'To Do',
      taskIds: ['task-3', 'task-5', 'task-6'],
    },
    'column-2': {
      id: 'column-2',
      title: 'In Progress',
      taskIds: ['task-4'],
    },
    'column-3': {
      id: 'column-3',
      title: 'Completed',
      taskIds: ['task-1', 'task-2'],
    },
  },
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

function App() {
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [strictness, setStrictness] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem('kanban-board-data');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error("Failed to parse localStorage data", e);
      }
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem('kanban-board-data', JSON.stringify(data));
  }, [data]);

  const isFormInvalid = !goal || !timeframe || !teamSize || !strictness;

  const handleGenerate = async () => {
    if (isFormInvalid) {
      alert("Please fill all the fields!");
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('http://localhost:3000/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, timeframe, teamSize, strictness })
      });

      const result = await response.json();

      if (result.success && result.data) {
        const generatedTasks = result.data;

        setData(prevData => {
          const newData = { ...prevData };
          const newTasks = { ...newData.tasks };

          // Add newly generated tasks to the tasks dictionary
          generatedTasks.forEach(task => {
            newTasks[task.id] = task;
          });

          // Prepend the new task IDs to the "To Do" column ('column-1')
          const targetCol = { ...newData.columns['column-1'] };
          targetCol.taskIds = [...generatedTasks.map(t => t.id), ...targetCol.taskIds];

          return {
            ...newData,
            tasks: newTasks,
            columns: {
              ...newData.columns,
              'column-1': targetCol
            }
          };
        });

        // Clear all inputs
        setGoal('');
        setTimeframe('');
        setTeamSize('');
        setStrictness('');

      } else {
        alert("Failed to generate workflow. " + (result.error || ""));
      }

    } catch (error) {
      console.error("Server error:", error);
      alert("Cannot connect to server. Ensure it is running on port 3000.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="app-container">
      <h1 className="heading-main">Cosmic Flow</h1>
      <div className="goal-input-container">
        <input
          type="text"
          className="goal-input"
          placeholder="Enter your goal..."
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>

      <div className="context-controls">
        <select className="glass-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
          <option value="" disabled>Timeframe</option>
          <option value="1w">1 Week-1 Month</option>
          <option value="1m">1 Month-3 Months</option>
          <option value="3m">3 Months-6 Months</option>
          <option value="6m">6+ Months</option>
        </select>

        <select className="glass-select" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
          <option value="" disabled>Team Size</option>
          <option value="1">Solo</option>
          <option value="2-5">2-5 members</option>
          <option value="5+">5+ members</option>
        </select>

        <select className="glass-select" value={strictness} onChange={(e) => setStrictness(e.target.value)}>
          <option value="" disabled>AI-Strictness</option>
          <option value="flexible">High level</option>
          <option value="balanced">Granular</option>
        </select>
      </div>

      <div className="action-container">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={isGenerating || isFormInvalid}
          style={{ cursor: isGenerating ? 'wait' : (isFormInvalid ? 'not-allowed' : 'pointer'), opacity: (isGenerating || isFormInvalid) ? 0.5 : 1 }}
        >
          {isGenerating ? 'GENERATING...' : 'GENERATE WORKFLOW'}
        </button>
      </div>

      <Board data={data} setData={setData} />
    </div>
  );
}

export default App;
