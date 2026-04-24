import React, { useState } from 'react';
import Column from './Column';

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

const Board = () => {
  const [data, setData] = useState(initialData);

  const onDrop = (e, targetColumnId) => {
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    // Find the source column
    let sourceColumnId = null;
    for (const [colId, col] of Object.entries(data.columns)) {
      if (col.taskIds.includes(taskId)) {
        sourceColumnId = colId;
        break;
      }
    }

    if (!sourceColumnId || sourceColumnId === targetColumnId) return;

    const sourceColumn = data.columns[sourceColumnId];
    const targetColumn = data.columns[targetColumnId];

    // Remove from source
    const newSourceTaskIds = Array.from(sourceColumn.taskIds);
    newSourceTaskIds.splice(newSourceTaskIds.indexOf(taskId), 1);

    // Add to target
    const newTargetTaskIds = Array.from(targetColumn.taskIds);
    newTargetTaskIds.push(taskId);

    setData(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        [sourceColumnId]: {
          ...sourceColumn,
          taskIds: newSourceTaskIds,
        },
        [targetColumnId]: {
          ...targetColumn,
          taskIds: newTargetTaskIds,
        }
      }
    }));
  };

  return (
    <div className="board-container">
      <div className="columns-wrapper">
        {data.columnOrder.map((columnId) => {
          const column = data.columns[columnId];
          const tasks = column.taskIds.map((taskId) => data.tasks[taskId]);

          return (
            <Column
              key={column.id}
              column={column}
              tasks={tasks}
              onDrop={onDrop}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Board;
