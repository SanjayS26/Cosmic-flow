import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import TaskEditor from '../components/TaskEditor';
import {
  deleteTask,
  friendlyApiError,
  getTask,
  regenerateProjectTask,
  updateTask,
} from '../services/api';

export default function TaskDetailsPage() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getTask(projectId, taskId)
      .then((data) => active && setTask(data))
      .catch((requestError) => active && setError(
        friendlyApiError(requestError, 'Task could not be loaded.'),
      ))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [projectId, taskId]);

  const save = async (changes) => {
    try {
      setTask(await updateTask(projectId, taskId, changes));
      setIsEditing(false);
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Task could not be saved.'));
    }
  };

  const regenerate = async () => {
    setIsRegenerating(true);
    setError('');
    try {
      setTask(await regenerateProjectTask(projectId, taskId));
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Task regeneration failed.'));
    } finally {
      setIsRegenerating(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(projectId, taskId);
      navigate(`/projects/${projectId}`, { replace: true });
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Task could not be deleted.'));
    }
  };

  if (isLoading) return <div className="page-status" role="status">Loading task...</div>;
  if (!task) return <div className="page-status"><p>{error || 'Task not found.'}</p><Link to={`/projects/${projectId}`}>Return to board</Link></div>;

  return (
    <div className="app-container">
      <AppHeader />
      <main className="page-container task-details-page">
        <Link to={`/projects/${projectId}`}>← Return to board</Link>
        <article className="task-details glass-panel">
          <div className="task-labels"><span className="task-tag">{task.category}</span><span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span></div>
          <h1>{task.title}</h1>
          <p>{task.description}</p>
          <dl><div><dt>Status</dt><dd>{task.status}</dd></div><div><dt>Estimated duration</dt><dd>{task.estimatedDuration}</dd></div><div><dt>Created</dt><dd>{new Date(task.createdAt).toLocaleString()}</dd></div><div><dt>Updated</dt><dd>{new Date(task.updatedAt).toLocaleString()}</dd></div></dl>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="card-actions"><button type="button" onClick={() => setIsEditing(true)}>Edit</button><button type="button" onClick={regenerate} disabled={isRegenerating}>{isRegenerating ? 'Regenerating...' : 'Regenerate'}</button><button type="button" className="danger-action" onClick={remove}>Delete</button></div>
        </article>
      </main>
      {isEditing && <TaskEditor task={task} onSave={save} onCancel={() => setIsEditing(false)} />}
    </div>
  );
}
