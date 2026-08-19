import Task from './Task';

const Column = ({
  column,
  tasks,
  onDrop,
  deleteTask,
  editTask,
  viewTask,
  regenerateTask,
  regenerationState,
}) => {
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    onDrop(e, column.id, tasks.length);
  };

  const handleTaskDrop = (e, targetIndex) => {
    e.preventDefault();
    e.stopPropagation();
    onDrop(e, column.id, targetIndex);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('drag-over');
  };

  return (
    <div
      className="glass-panel column"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="heading-col">
        <span>{column.title}</span>
        <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Task
              key={task.id}
              task={task}
              deleteTask={deleteTask}
              editTask={editTask}
              viewTask={viewTask}
              regenerateTask={regenerateTask}
              regeneration={regenerationState[task.id]}
              onDrop={(event) => handleTaskDrop(
                event,
                tasks.findIndex((item) => item.id === task.id),
              )}
            />
          ))
        ) : (
          <p className="column-empty">No tasks in this column.</p>
        )}
      </div>
    </div>
  );
};

export default Column;
