import React from 'react';
import Column from './Column';

const Board = ({ data, setData }) => {

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
