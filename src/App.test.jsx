import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import AuthProvider from './context/AuthContext';
import * as api from './services/api';

vi.mock('./services/api', async () => {
  const actual = await vi.importActual('./services/api');
  return {
    ...actual,
    getCurrentUser: vi.fn(), register: vi.fn(), login: vi.fn(), logout: vi.fn(),
    listProjects: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(),
    deleteProject: vi.fn(), getProject: vi.fn(), listTasks: vi.fn(),
    createTask: vi.fn(), getTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    generateProjectTasks: vi.fn(), regenerateProjectTask: vi.fn(),
    reorderProjectTasks: vi.fn(),
  };
});

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Sanjay',
  email: 'sanjay@example.com',
};
const project = {
  id: '00000000-0000-4000-8000-000000000011',
  userId: user.id,
  name: 'College Event',
  goal: 'Launch an event registration website',
  timeframe: '4 weeks',
  teamSize: 4,
  strictness: 'Balanced',
  taskCount: 1,
  completedTaskCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};
const task = {
  id: '00000000-0000-4000-8000-000000000021',
  projectId: project.id,
  title: 'Create registration form',
  description: 'Build and validate the registration flow.',
  category: 'Engineering',
  priority: 'High',
  status: 'todo',
  estimatedDuration: '2 days',
  position: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderApp(path = '/dashboard') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider><App /></AuthProvider>
    </MemoryRouter>,
  );
}

function setupAuthenticatedDefaults() {
  api.getCurrentUser.mockResolvedValue({ user });
  api.listProjects.mockResolvedValue([project]);
  api.getProject.mockResolvedValue(project);
  api.listTasks.mockResolvedValue([task]);
  api.logout.mockResolvedValue(null);
}

function createDataTransfer() {
  const values = {};
  return {
    setData: (type, value) => { values[type] = value; },
    getData: (type) => values[type] || '',
    effectAllowed: 'move',
    dropEffect: 'move',
  };
}

describe('Phase 3 application', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.confirm = vi.fn(() => true);
    setupAuthenticatedDefaults();
  });

  it('restores the current-user session before rendering a protected route', async () => {
    renderApp('/dashboard');
    expect(await screen.findByText('Your projects')).toBeInTheDocument();
    expect(api.getCurrentUser).toHaveBeenCalledOnce();
  });

  it('redirects an unauthenticated protected route to login', async () => {
    api.getCurrentUser.mockRejectedValue(new api.ApiError(
      'Authentication required',
      'AUTHENTICATION_REQUIRED',
      401,
    ));
    renderApp('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('validates and submits the registration form', async () => {
    api.getCurrentUser.mockRejectedValue(new api.ApiError('No session', 'AUTHENTICATION_REQUIRED', 401));
    api.register.mockResolvedValue({ user });
    api.listProjects.mockResolvedValue([]);
    const browserUser = userEvent.setup();
    renderApp('/register');

    await browserUser.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least 8/i);
    await browserUser.type(screen.getByLabelText('Name'), 'Sanjay');
    await browserUser.type(screen.getByLabelText('Email'), 'sanjay@example.com');
    await browserUser.type(screen.getByLabelText('Password'), 'password123');
    await browserUser.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Your projects')).toBeInTheDocument();
    expect(api.register).toHaveBeenCalledWith(expect.objectContaining({
      email: 'sanjay@example.com',
    }));
  });

  it('submits login and redirects to the dashboard', async () => {
    api.getCurrentUser.mockRejectedValue(new api.ApiError('No session', 'AUTHENTICATION_REQUIRED', 401));
    api.login.mockResolvedValue({ user });
    const browserUser = userEvent.setup();
    renderApp('/login');
    await browserUser.type(await screen.findByLabelText('Email'), 'sanjay@example.com');
    await browserUser.type(screen.getByLabelText('Password'), 'password123');
    await browserUser.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Your projects')).toBeInTheDocument();
    expect(api.login).toHaveBeenCalledOnce();
  });

  it('logs out and returns to the login page', async () => {
    const browserUser = userEvent.setup();
    renderApp('/dashboard');
    await browserUser.click(await screen.findByRole('button', { name: 'Logout' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalledOnce();
  });

  it('renders only projects returned for the current user', async () => {
    api.listProjects.mockResolvedValue([project]);
    renderApp('/dashboard');
    expect(await screen.findByText('College Event')).toBeInTheDocument();
    expect(screen.queryByText('Another user project')).not.toBeInTheDocument();
  });

  it('shows empty dashboard guidance', async () => {
    api.listProjects.mockResolvedValue([]);
    renderApp('/dashboard');
    expect(await screen.findByText('No projects yet')).toBeInTheDocument();
  });

  it('creates and deletes a project through the API', async () => {
    api.listProjects.mockResolvedValue([]);
    api.createProject.mockResolvedValue({ ...project, taskCount: 0, completedTaskCount: 0 });
    api.deleteProject.mockResolvedValue({ id: project.id });
    const browserUser = userEvent.setup();
    renderApp('/dashboard');
    await screen.findByText('No projects yet');
    await browserUser.type(screen.getByLabelText('Project name'), project.name);
    await browserUser.type(screen.getByLabelText('Goal'), project.goal);
    await browserUser.click(screen.getByRole('button', { name: 'Create project' }));
    expect(await screen.findByText(project.name)).toBeInTheDocument();
    await browserUser.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(screen.queryByText(project.name)).not.toBeInTheDocument());
    expect(api.deleteProject).toHaveBeenCalledWith(project.id);
  });

  it('loads database tasks into the project board', async () => {
    renderApp(`/projects/${project.id}`);
    expect(await screen.findByText(task.title)).toBeInTheDocument();
    expect(api.listTasks).toHaveBeenCalledWith(project.id);
  });

  it('persists task editing through the API', async () => {
    const updated = { ...task, title: 'Updated task title' };
    api.updateTask.mockResolvedValue(updated);
    const browserUser = userEvent.setup();
    renderApp(`/projects/${project.id}`);
    const card = (await screen.findByText(task.title)).closest('.task-card');
    await browserUser.click(within(card).getByRole('button', { name: 'Edit' }));
    const title = screen.getByLabelText('Title');
    await browserUser.clear(title);
    await browserUser.type(title, updated.title);
    await browserUser.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText(updated.title)).toBeInTheDocument();
    expect(api.updateTask).toHaveBeenCalledWith(
      project.id,
      task.id,
      expect.objectContaining({ title: updated.title }),
    );
  });

  it('persists task regeneration through the API', async () => {
    api.regenerateProjectTask.mockResolvedValue({ ...task, title: 'Improved task' });
    const browserUser = userEvent.setup();
    renderApp(`/projects/${project.id}`);
    const card = (await screen.findByText(task.title)).closest('.task-card');
    await browserUser.click(within(card).getByRole('button', { name: 'Regenerate' }));
    expect(await screen.findByText('Improved task')).toBeInTheDocument();
    expect(api.regenerateProjectTask).toHaveBeenCalledWith(project.id, task.id);
  });

  it('persists drag-and-drop status changes through the reorder API', async () => {
    const moved = { ...task, status: 'in-progress', position: 0 };
    api.reorderProjectTasks.mockResolvedValue([moved]);
    renderApp(`/projects/${project.id}`);
    const card = (await screen.findByText(task.title)).closest('.task-card');
    const target = screen.getByText('In Progress').closest('.column');
    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    await waitFor(() => expect(api.reorderProjectTasks).toHaveBeenCalled());
    expect(screen.getByText(task.title).closest('.column')).toHaveTextContent('In Progress');
  });

  it('rolls back a failed drag-and-drop persistence request', async () => {
    api.reorderProjectTasks.mockRejectedValue(new api.ApiError('Failed', 'REQUEST_FAILED', 500));
    renderApp(`/projects/${project.id}`);
    const card = (await screen.findByText(task.title)).closest('.task-card');
    const target = screen.getByText('In Progress').closest('.column');
    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(card, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });
    expect(await screen.findByRole('alert')).toHaveTextContent(/failed/i);
    expect(screen.getByText(task.title).closest('.column')).toHaveTextContent('To Do');
  });

  it('renders the database-backed individual task page', async () => {
    api.getTask.mockResolvedValue(task);
    renderApp(`/projects/${project.id}/tasks/${task.id}`);
    expect(await screen.findByRole('heading', { name: task.title })).toBeInTheDocument();
    expect(screen.getByText(task.description)).toBeInTheDocument();
    expect(api.getTask).toHaveBeenCalledWith(project.id, task.id);
  });

  it('shows but does not upload or silently delete legacy local data', async () => {
    localStorage.setItem('kanban-board-data', JSON.stringify({ old: 'board' }));
    renderApp('/dashboard');
    expect(await screen.findByText(/older local-only board/i)).toBeInTheDocument();
    expect(localStorage.getItem('kanban-board-data')).not.toBeNull();
  });
});
