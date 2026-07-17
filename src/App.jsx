import { useEffect, useState } from 'react';
import Board from './components/Board';
import { generateTasks } from './services/api';
import './index.css';

const TASK_CATEGORIES = ['Engineering', 'Design', 'Marketing', 'Research', 'Logistics'];
const TASK_PRIORITIES = ['High', 'Medium', 'Low'];
const TASK_STATUSES = ['todo', 'in-progress', 'done'];

const columns = {
  'column-1': {
    id: 'column-1',
    title: 'To Do',
    status: 'todo',
    taskIds: ['task-3', 'task-5', 'task-6'],
  },
  'column-2': {
    id: 'column-2',
    title: 'In Progress',
    status: 'in-progress',
    taskIds: ['task-4'],
  },
  'column-3': {
    id: 'column-3',
    title: 'Done',
    status: 'done',
    taskIds: ['task-1', 'task-2'],
  },
};

const initialData = {
  tasks: {
    'task-1': {
      id: 'task-1',
      title: 'Design the Kanban interface',
      description: 'Create a clear visual layout for the three workflow columns.',
      category: 'Design',
      priority: 'High',
      status: 'done',
      estimatedDuration: '1 day',
    },
    'task-2': {
      id: 'task-2',
      title: 'Initialize the React application',
      description: 'Set up the Vite project and core React entry points.',
      category: 'Engineering',
      priority: 'High',
      status: 'done',
      estimatedDuration: '2 hours',
    },
    'task-3': {
      id: 'task-3',
      title: 'Implement drag and drop',
      description: 'Allow tasks to move safely between workflow columns.',
      category: 'Engineering',
      priority: 'High',
      status: 'todo',
      estimatedDuration: '1 day',
    },
    'task-4': {
      id: 'task-4',
      title: 'Apply glassmorphism styling',
      description: 'Polish the board and task cards while keeping content readable.',
      category: 'Design',
      priority: 'Medium',
      status: 'in-progress',
      estimatedDuration: '4 hours',
    },
    'task-5': {
      id: 'task-5',
      title: 'Test user workflows',
      description: 'Verify generation, dragging, persistence, and error states.',
      category: 'Research',
      priority: 'Medium',
      status: 'todo',
      estimatedDuration: '1 day',
    },
    'task-6': {
      id: 'task-6',
      title: 'Refactor shared logic',
      description: 'Move API and validation concerns into focused modules.',
      category: 'Engineering',
      priority: 'Low',
      status: 'todo',
      estimatedDuration: '4 hours',
    },
  },
  columns,
  columnOrder: ['column-1', 'column-2', 'column-3'],
};

function isCanonicalTask(task) {
  return (
    task
    && typeof task.id === 'string'
    && typeof task.title === 'string'
    && typeof task.description === 'string'
    && TASK_CATEGORIES.includes(task.category)
    && TASK_PRIORITIES.includes(task.priority)
    && TASK_STATUSES.includes(task.status)
    && typeof task.estimatedDuration === 'string'
  );
}

function migrateTask(task, status) {
  if (isCanonicalTask(task)) {
    return { ...task, status };
  }

  if (!task || typeof task.id !== 'string') {
    return null;
  }

  const legacyContent =
    typeof task.content === 'string' && task.content.trim()
      ? task.content.trim()
      : 'Untitled task';

  return {
    id: task.id,
    title: legacyContent,
    description: 'This task was migrated from an earlier board format.',
    category: TASK_CATEGORIES.includes(task.tag) ? task.tag : 'Research',
    priority: 'Medium',
    status,
    estimatedDuration:
      typeof task.date === 'string' && task.date.trim()
        ? task.date.trim()
        : 'Not estimated',
  };
}

function restoreBoard(savedValue) {
  if (
    !savedValue
    || typeof savedValue !== 'object'
    || !savedValue.tasks
    || !savedValue.columns
  ) {
    return initialData;
  }

  const restoredTasks = {};
  const restoredColumns = {};
  const assignedTaskIds = new Set();

  for (const columnId of initialData.columnOrder) {
    const standardColumn = initialData.columns[columnId];
    const savedTaskIds = Array.isArray(savedValue.columns[columnId]?.taskIds)
      ? savedValue.columns[columnId].taskIds
      : [];
    const validTaskIds = [];

    for (const taskId of savedTaskIds) {
      if (assignedTaskIds.has(taskId)) {
        continue;
      }

      const migratedTask = migrateTask(
        savedValue.tasks[taskId],
        standardColumn.status,
      );

      if (migratedTask) {
        restoredTasks[taskId] = migratedTask;
        validTaskIds.push(taskId);
        assignedTaskIds.add(taskId);
      }
    }

    restoredColumns[columnId] = {
      ...standardColumn,
      taskIds: validTaskIds,
    };
  }

  return {
    tasks: restoredTasks,
    columns: restoredColumns,
    columnOrder: initialData.columnOrder,
  };
}

function App() {
  const [goal, setGoal] = useState('');
  const [timeframe, setTimeframe] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [strictness, setStrictness] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem('kanban-board-data');
    if (savedData) {
      try {
        return restoreBoard(JSON.parse(savedData));
      } catch {
        return initialData;
      }
    }

    return initialData;
  });

  useEffect(() => {
    try {
      localStorage.setItem('kanban-board-data', JSON.stringify(data));
    } catch {
      const timeoutId = window.setTimeout(() => {
        setErrorMessage('The board could not be saved in this browser.');
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }

    return undefined;
  }, [data]);

  const isFormInvalid = !goal.trim();

  const handleGenerate = async () => {
    if (isGenerating) {
      return;
    }

    if (isFormInvalid) {
      setErrorMessage('Enter a goal before generating a workflow.');
      return;
    }

    setErrorMessage('');
    setInfoMessage('');
    setIsGenerating(true);

    try {
      const generatedTasks = await generateTasks({
        goal: goal.trim(),
        timeframe,
        teamSize,
        strictness,
      });

      if (generatedTasks.length === 0) {
        setInfoMessage('No tasks were generated. Your existing board was preserved.');
        return;
      }

      setData((previousData) => {
        const nextTasks = { ...previousData.tasks };
        const nextColumns = Object.fromEntries(
          Object.entries(previousData.columns).map(([columnId, column]) => [
            columnId,
            { ...column, taskIds: [...column.taskIds] },
          ]),
        );

        for (const task of [...generatedTasks].reverse()) {
          if (!isCanonicalTask(task) || nextTasks[task.id]) {
            continue;
          }

          const targetColumn = Object.values(nextColumns).find(
            (column) => column.status === task.status,
          );

          if (!targetColumn) {
            continue;
          }

          nextTasks[task.id] = task;
          targetColumn.taskIds.unshift(task.id);
        }

        return {
          ...previousData,
          tasks: nextTasks,
          columns: nextColumns,
        };
      });

      setGoal('');
      setTimeframe('');
      setTeamSize('');
      setStrictness('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'The workflow could not be generated.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteTask = (taskId) => {
    setData((prevData) => {
      const newData = { ...prevData };
      const newTasks = { ...newData.tasks };
      delete newTasks[taskId];

      const newColumns = { ...newData.columns };
      for (const colId of Object.keys(newColumns)) {
        newColumns[colId] = {
          ...newColumns[colId],
          taskIds: newColumns[colId].taskIds.filter((id) => id !== taskId),
        };
      }

      return {
        ...newData,
        tasks: newTasks,
        columns: newColumns,
      };
    });
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
          maxLength={1000}
          onChange={(e) => {
            setGoal(e.target.value);
            setErrorMessage('');
          }}
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

      {errorMessage && (
        <p className="inline-message error-message" role="alert">
          {errorMessage}
        </p>
      )}
      {infoMessage && (
        <p className="inline-message info-message" aria-live="polite">
          {infoMessage}
        </p>
      )}

      <Board data={data} setData={setData} deleteTask={deleteTask} />
    </div>
  );
}

export default App;
