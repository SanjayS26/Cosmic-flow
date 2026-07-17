import Column from './Column';

const Board = ({ data, setData, deleteTask }) => {
  const onDrop = (e, targetColumnId) => {
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    setData((previousData) => {
      const targetColumn = previousData.columns[targetColumnId];
      const sourceColumnEntry = Object.entries(previousData.columns).find(
        ([, column]) => column.taskIds.includes(taskId),
      );

      if (!targetColumn || !sourceColumnEntry || !previousData.tasks[taskId]) {
        return previousData;
      }

      const [sourceColumnId, sourceColumn] = sourceColumnEntry;

      if (sourceColumnId === targetColumnId) {
        return previousData;
      }

      const sourceTaskIds = sourceColumn.taskIds.filter((id) => id !== taskId);
      const targetTaskIds = [
        ...targetColumn.taskIds.filter((id) => id !== taskId),
        taskId,
      ];

      return {
        ...previousData,
        tasks: {
          ...previousData.tasks,
          [taskId]: {
            ...previousData.tasks[taskId],
            status: targetColumn.status,
          },
        },
        columns: {
          ...previousData.columns,
          [sourceColumnId]: {
            ...sourceColumn,
            taskIds: sourceTaskIds,
          },
          [targetColumnId]: {
            ...targetColumn,
            taskIds: targetTaskIds,
          },
        },
      };
    });
  };

  return (
    <div className="board-container">
      <div className="columns-wrapper">
        {data.columnOrder.map((columnId) => {
          const column = data.columns[columnId];
          const tasks = column.taskIds
            .map((taskId) => data.tasks[taskId])
            .filter(Boolean);

          return (
            <Column
              key={column.id}
              column={column}
              tasks={tasks}
              onDrop={onDrop}
              deleteTask={deleteTask}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Board;
