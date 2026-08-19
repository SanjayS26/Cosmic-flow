import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import Board from '../components/Board';
import TaskEditor from '../components/TaskEditor';
import {
  createTask,
  deleteTask,
  friendlyApiError,
  generateProjectTasks,
  getProject,
  listTasks,
  regenerateProjectTask,
  reorderProjectTasks,
  updateTask,
} from '../services/api';
import {
  createBoardFromTasks,
  createEmptyBoard,
  createReorderPayload,
  moveTask,
  removeTask,
  updateBoardTask,
  upsertTask,
} from '../utils/boardState';

const NEW_TASK = {
  title: '',
  description: '',
  category: 'Engineering',
  priority: 'Medium',
  status: 'todo',
  estimatedDuration: '1 day',
};

export default function ProjectBoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [board, setBoard] = useState(createEmptyBoard);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [regenerationState, setRegenerationState] = useState({});

  useEffect(() => {
    let active = true;
    Promise.all([getProject(projectId), listTasks(projectId)])
      .then(([projectData, tasks]) => {
        if (!active) return;
        setProject(projectData);
        setBoard(createBoardFromTasks(tasks));
      })
      .catch((requestError) => active && setError(
        friendlyApiError(requestError, 'Project board could not be loaded.'),
      ))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, [projectId]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError('');
    try {
      const tasks = await generateProjectTasks(projectId);
      setBoard((previous) => createBoardFromTasks([
        ...Object.values(previous.tasks),
        ...tasks,
      ]));
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Tasks could not be generated.'));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveTask = async (changes) => {
    try {
      if (isCreating) {
        const created = await createTask(projectId, { ...NEW_TASK, ...changes });
        setBoard((previous) => upsertTask(previous, created));
      } else {
        const updated = await updateTask(projectId, editingTask.id, changes);
        setBoard((previous) => upsertTask(previous, updated));
      }
      setEditingTask(null);
      setIsCreating(false);
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Task could not be saved.'));
    }
  };

  const handleDeleteTask = async (taskId) => {
    const task = board.tasks[taskId];
    if (!task || !window.confirm(`Delete “${task.title}”?`)) return;
    try {
      await deleteTask(projectId, taskId);
      setBoard((previous) => removeTask(previous, taskId));
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Task could not be deleted.'));
    }
  };

  const handleRegenerate = async (taskId) => {
    if (regenerationState[taskId]?.loading) return;
    setRegenerationState((previous) => ({
      ...previous,
      [taskId]: { loading: true, error: '' },
    }));
    try {
      const task = await regenerateProjectTask(projectId, taskId);
      setBoard((previous) => updateBoardTask(previous, taskId, task));
      setRegenerationState((previous) => ({
        ...previous,
        [taskId]: { loading: false, error: '' },
      }));
    } catch (requestError) {
      setRegenerationState((previous) => ({
        ...previous,
        [taskId]: {
          loading: false,
          error: friendlyApiError(requestError, 'Task regeneration failed.'),
        },
      }));
    }
  };

  const handleMove = async (taskId, targetColumnId, targetIndex) => {
    if (isReordering) return;
    const previousBoard = board;
    const nextBoard = moveTask(previousBoard, taskId, targetColumnId, targetIndex);
    if (nextBoard === previousBoard) return;

    setBoard(nextBoard);
    setIsReordering(true);
    setError('');
    try {
      const tasks = await reorderProjectTasks(
        projectId,
        createReorderPayload(nextBoard),
      );
      setBoard(createBoardFromTasks(tasks));
    } catch (requestError) {
      setBoard(previousBoard);
      setError(friendlyApiError(
        requestError,
        'The task move could not be saved and was rolled back.',
      ));
    } finally {
      setIsReordering(false);
    }
  };

  if (isLoading) {
    return <div className="page-status" role="status">Loading project board...</div>;
  }

  if (!project) {
    return <div className="page-status"><p>{error || 'Project not found.'}</p><Link to="/dashboard">Return to dashboard</Link></div>;
  }

  return (
    <div className="app-container">
      <AppHeader />
      <main>
        <section className="board-header page-container">
          <div><Link to="/dashboard">← Dashboard</Link><h1>{project.name}</h1><p>{project.goal}</p></div>
          <div className="board-actions"><button type="button" className="secondary-btn" onClick={() => { setIsCreating(true); setEditingTask(NEW_TASK); }}>Add task</button><button type="button" className="primary-btn" onClick={handleGenerate} disabled={isGenerating}>{isGenerating ? 'Generating...' : 'Generate tasks'}</button></div>
        </section>
        {error && <div className="inline-message error-message" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
        {isReordering && <p className="save-indicator" role="status">Saving board order...</p>}
        <Board
          data={board}
          onMove={handleMove}
          deleteTask={handleDeleteTask}
          editTask={(taskId) => { setIsCreating(false); setEditingTask(board.tasks[taskId]); }}
          viewTask={(taskId) => navigate(`/projects/${projectId}/tasks/${taskId}`)}
          regenerateTask={handleRegenerate}
          regenerationState={regenerationState}
          isGenerating={isGenerating}
        />
      </main>
      {editingTask && <TaskEditor key={editingTask.id || 'new'} task={editingTask} onSave={handleSaveTask} onCancel={() => { setEditingTask(null); setIsCreating(false); }} />}
    </div>
  );
}
