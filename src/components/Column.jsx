import React from 'react';
import Task from './Task';

const Column = ({ column, tasks, onDrop, onDragOver, onDragLeave }) => {
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
        <span style={{opacity: 0.5, fontSize: '0.8rem'}}>{tasks.length}</span>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <Task key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
};

export default Column;
