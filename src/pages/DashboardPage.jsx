import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AppHeader from '../components/AppHeader';
import {
  createProject,
  deleteProject,
  friendlyApiError,
  listProjects,
  updateProject,
} from '../services/api';

const EMPTY_FORM = {
  name: '',
  goal: '',
  timeframe: '',
  teamSize: 1,
  strictness: 'Balanced',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    listProjects()
      .then((data) => active && setProjects(data))
      .catch((requestError) => active && setError(
        friendlyApiError(requestError, 'Projects could not be loaded.'),
      ))
      .finally(() => active && setIsLoading(false));
    return () => { active = false; };
  }, []);

  const updateForm = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setError('');
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.goal.trim()) {
      setError('Project name and goal are required.');
      return;
    }

    setIsSaving(true);
    const payload = {
      ...form,
      name: form.name.trim(),
      goal: form.goal.trim(),
      timeframe: form.timeframe.trim() || undefined,
      teamSize: Number(form.teamSize),
    };

    try {
      if (editingId) {
        const updated = await updateProject(editingId, payload);
        setProjects((previous) => previous.map(
          (project) => project.id === editingId ? { ...project, ...updated } : project,
        ));
      } else {
        const created = await createProject(payload);
        setProjects((previous) => [{
          ...created,
          taskCount: 0,
          completedTaskCount: 0,
        }, ...previous]);
      }
      resetForm();
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Project could not be saved.'));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      goal: project.goal,
      timeframe: project.timeframe || '',
      teamSize: project.teamSize || 1,
      strictness: project.strictness || 'Balanced',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`Delete “${project.name}” and all of its tasks?`)) return;
    try {
      await deleteProject(project.id);
      setProjects((previous) => previous.filter((item) => item.id !== project.id));
    } catch (requestError) {
      setError(friendlyApiError(requestError, 'Project could not be deleted.'));
    }
  };

  return (
    <div className="app-container">
      <AppHeader />
      <main className="page-container">
        <div className="page-heading">
          <div>
            <h1>Your projects</h1>
            <p>Create a project, then generate and manage its task board.</p>
          </div>
        </div>

        <form className="project-form glass-panel" onSubmit={handleSubmit}>
          <h2>{editingId ? 'Edit project' : 'Create project'}</h2>
          <div className="form-grid">
            <label>Project name<input value={form.name} maxLength={200} onChange={(event) => updateForm('name', event.target.value)} /></label>
            <label>Timeframe<input value={form.timeframe} maxLength={100} onChange={(event) => updateForm('timeframe', event.target.value)} placeholder="4 weeks" /></label>
            <label className="wide-field">Goal<textarea value={form.goal} maxLength={1000} rows={3} onChange={(event) => updateForm('goal', event.target.value)} /></label>
            <label>Team size<input type="number" min="1" max="100" value={form.teamSize} onChange={(event) => updateForm('teamSize', event.target.value)} /></label>
            <label>Planning detail<select value={form.strictness} onChange={(event) => updateForm('strictness', event.target.value)}><option>Flexible</option><option>Balanced</option><option>Granular</option></select></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            {editingId && <button type="button" className="secondary-btn" onClick={resetForm}>Cancel</button>}
            <button className="primary-btn" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save project' : 'Create project'}</button>
          </div>
        </form>

        {isLoading ? (
          <div className="page-status" role="status">Loading projects...</div>
        ) : projects.length === 0 ? (
          <section className="empty-dashboard glass-panel"><h2>No projects yet</h2><p>Create your first project above to start building a workflow.</p></section>
        ) : (
          <section className="project-grid">
            {projects.map((project) => (
              <article className="project-card glass-panel" key={project.id}>
                <h2>{project.name}</h2>
                <p>{project.goal}</p>
                <dl><div><dt>Tasks</dt><dd>{project.taskCount ?? 0}</dd></div><div><dt>Completed</dt><dd>{project.completedTaskCount ?? 0}</dd></div></dl>
                <p className="text-meta">Updated {new Date(project.updatedAt).toLocaleDateString()}</p>
                <div className="card-actions"><Link className="primary-link" to={`/projects/${project.id}`}>Open board</Link><button type="button" onClick={() => startEditing(project)}>Edit</button><button type="button" className="danger-action" onClick={() => handleDelete(project)}>Delete</button></div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
