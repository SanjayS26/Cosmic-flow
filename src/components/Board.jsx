import Column from './Column';
const Board = ({
  data,
  onMove,
  deleteTask,
  editTask,
  viewTask,
  regenerateTask,
  regenerationState,
  isGenerating,
}) => {
  const onDrop = (e, targetColumnId, targetIndex) => {
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    onMove(taskId, targetColumnId, targetIndex);
  };

  const taskCount = Object.keys(data.tasks).length;

  return (
    <div className="board-container">
      {isGenerating && (
        <div className="board-loading" role="status">
          <span className="spinner" aria-hidden="true" />
          Building your task board...
        </div>
      )}
      {taskCount === 0 && (
        <div className="empty-board">
          <h2>Your board is empty</h2>
          <p>Generate tasks or add one manually to start this workflow.</p>
        </div>
      )}
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
              editTask={editTask}
              viewTask={viewTask}
              regenerateTask={regenerateTask}
              regenerationState={regenerationState}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Board;
