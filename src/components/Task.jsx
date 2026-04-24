import React from 'react';

const Task = ({ task, onDragStart }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    // Add a slight delay before adding dragging class for aesthetic visual feedback
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  return (
    <div
      className="glass-card task-card"
      draggable="true"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      id={task.id}
    >
      {task.tag && <span className="task-tag">{task.tag}</span>}
      <p className="text-body">{task.content}</p>
      {task.date && <p className="text-meta">{task.date}</p>}
    </div>
  );
};

export default Task;
