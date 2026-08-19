const Task = ({
  task,
  deleteTask,
  editTask,
  viewTask,
  regenerateTask,
  regeneration,
  onDrop,
}) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    const card = e.currentTarget;
    setTimeout(() => {
      card.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (deleteTask && window.confirm('Delete this task?')) {
      deleteTask(task.id);
    }
  };

  return (
    <div
      className="glass-card task-card"
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onContextMenu={handleContextMenu}
      id={task.id}
    >
      <div className="task-labels">
        <span className="task-tag">{task.category}</span>
        <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
          {task.priority}
        </span>
      </div>
      <h3 className="task-title">{task.title}</h3>
      <p className="text-body task-description">{task.description}</p>
      <p className="text-meta">Estimated: {task.estimatedDuration}</p>
      <div className="task-actions">
        <button type="button" onClick={() => viewTask(task.id)}>Details</button>
        <button type="button" onClick={() => editTask(task.id)}>Edit</button>
        <button
          type="button"
          onClick={() => regenerateTask(task.id)}
          disabled={regeneration?.loading}
        >
          {regeneration?.loading ? 'Regenerating...' : 'Regenerate'}
        </button>
        <button type="button" className="danger-action" onClick={() => deleteTask(task.id)}>Delete</button>
      </div>
      {regeneration?.error && (
        <p className="task-error" role="alert">{regeneration.error}</p>
      )}
    </div>
  );
};

export default Task;
