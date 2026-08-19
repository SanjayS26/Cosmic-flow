import { useState } from 'react';
import { TASK_CATEGORIES, TASK_PRIORITIES } from '../constants/tasks';

const REQUIRED_FIELDS = [
  'title',
  'description',
  'category',
  'priority',
  'estimatedDuration',
];

const TaskEditor = ({ task, onSave, onCancel }) => {
  const [draft, setDraft] = useState(task);
  const [error, setError] = useState('');

  const updateField = (field, value) => {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setError('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const normalized = Object.fromEntries(
      REQUIRED_FIELDS.map((field) => [field, draft[field]?.trim() || '']),
    );

    if (Object.values(normalized).some((value) => !value)) {
      setError('Complete every required task field.');
      return;
    }

    if (
      !TASK_CATEGORIES.includes(normalized.category)
      || !TASK_PRIORITIES.includes(normalized.priority)
    ) {
      setError('Choose a supported category and priority.');
      return;
    }

    onSave(normalized);
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="task-editor glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-editor-title"
      >
        <h2 id="task-editor-title">Edit task</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input
              value={draft.title}
              maxLength={200}
              onChange={(event) => updateField('title', event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              value={draft.description}
              maxLength={3000}
              rows={5}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </label>
          <div className="editor-grid">
            <label>
              Category
              <select
                value={draft.category}
                onChange={(event) => updateField('category', event.target.value)}
              >
                {TASK_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={draft.priority}
                onChange={(event) => updateField('priority', event.target.value)}
              >
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Estimated duration
            <input
              value={draft.estimatedDuration}
              maxLength={100}
              onChange={(event) => updateField(
                'estimatedDuration',
                event.target.value,
              )}
            />
          </label>
          {error && <p className="editor-error" role="alert">{error}</p>}
          <div className="editor-actions">
            <button type="button" className="secondary-btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="primary-btn">Save changes</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default TaskEditor;
