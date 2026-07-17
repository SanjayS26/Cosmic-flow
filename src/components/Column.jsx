import Task from './Task';

const Column = ({ column, tasks, onDrop, deleteTask }) => {
  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    onDrop(e, column.id);
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
            <Task key={task.id} task={task} deleteTask={deleteTask} />
          ))
        ) : (
          <p className="column-empty">No tasks in this column.</p>
        )}
      </div>
    </div>
  );
};

export default Column;
