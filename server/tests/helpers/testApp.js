import bcrypt from 'bcryptjs';
import { once } from 'node:events';
import AuthController from '../../controllers/AuthController.js';
import AppError from '../../utils/AppError.js';
import { createApp } from '../../server.js';

const ids = {
  userA: '00000000-0000-4000-8000-000000000001',
  userB: '00000000-0000-4000-8000-000000000002',
  projectA: '00000000-0000-4000-8000-000000000011',
  projectB: '00000000-0000-4000-8000-000000000012',
  taskA: '00000000-0000-4000-8000-000000000021',
  taskB: '00000000-0000-4000-8000-000000000022',
};

let idCounter = 100;
function nextId() {
  idCounter += 1;
  return `00000000-0000-4000-8000-${String(idCounter).padStart(12, '0')}`;
}

function safeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}

export function createMemoryStore() {
  const now = new Date().toISOString();
  const store = {
    users: [],
    projects: [],
    tasks: [],
    lastPasswordHash: null,
  };

  store.userRepository = {
    async create({ name, email, passwordHash }) {
      if (store.users.some((user) => user.email === email)) {
        throw new AppError(
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists.',
          409,
        );
      }
      const user = {
        id: nextId(), name, email, passwordHash, createdAt: now, updatedAt: now,
      };
      store.users.push(user);
      store.lastPasswordHash = passwordHash;
      return safeUser(user);
    },
    async findByEmail(email) {
      return store.users.find((user) => user.email === email) || null;
    },
    async findById(id) {
      return safeUser(store.users.find((user) => user.id === id));
    },
  };

  store.projectRepository = {
    async listForUser(userId) {
      return store.projects
        .filter((project) => project.userId === userId)
        .map((project) => ({
          ...project,
          taskCount: store.tasks.filter((task) => task.projectId === project.id).length,
          completedTaskCount: store.tasks.filter(
            (task) => task.projectId === project.id && task.status === 'done',
          ).length,
        }));
    },
    async createForUser(userId, project) {
      const created = {
        id: nextId(), userId, ...project, createdAt: now, updatedAt: now,
      };
      store.projects.push(created);
      return created;
    },
    async findByIdForUser(projectId, userId) {
      return store.projects.find(
        (project) => project.id === projectId && project.userId === userId,
      ) || null;
    },
    async updateForUser(projectId, userId, changes) {
      const project = store.projects.find(
        (item) => item.id === projectId && item.userId === userId,
      );
      if (!project) return null;
      Object.assign(project, changes, { updatedAt: new Date().toISOString() });
      return { ...project };
    },
    async deleteForUser(projectId, userId) {
      const index = store.projects.findIndex(
        (project) => project.id === projectId && project.userId === userId,
      );
      if (index < 0) return null;
      const [project] = store.projects.splice(index, 1);
      store.tasks = store.tasks.filter((task) => task.projectId !== projectId);
      return project;
    },
  };

  function ownedProject(projectId, userId) {
    return store.projects.some(
      (project) => project.id === projectId && project.userId === userId,
    );
  }

  store.taskRepository = {
    async listForProject(projectId, userId) {
      if (!ownedProject(projectId, userId)) return [];
      return store.tasks.filter((task) => task.projectId === projectId);
    },
    async findByIdForUser(projectId, taskId, userId) {
      if (!ownedProject(projectId, userId)) return null;
      return store.tasks.find(
        (task) => task.id === taskId && task.projectId === projectId,
      ) || null;
    },
    async createForProject(projectId, userId, task) {
      if (!ownedProject(projectId, userId)) {
        throw new AppError('NOT_FOUND', 'Project not found.', 404);
      }
      const created = {
        id: nextId(), projectId, ...task, position: task.position ?? 0,
        createdAt: now, updatedAt: now,
      };
      store.tasks.push(created);
      return created;
    },
    async updateForUser(projectId, taskId, userId, changes) {
      const task = await this.findByIdForUser(projectId, taskId, userId);
      if (!task) return null;
      Object.assign(task, changes, { updatedAt: new Date().toISOString() });
      return { ...task };
    },
    async deleteForUser(projectId, taskId, userId) {
      if (!ownedProject(projectId, userId)) return null;
      const index = store.tasks.findIndex(
        (task) => task.id === taskId && task.projectId === projectId,
      );
      if (index < 0) return null;
      return store.tasks.splice(index, 1)[0];
    },
    async insertGeneratedForProject(projectId, userId, tasks) {
      if (!ownedProject(projectId, userId)) {
        throw new AppError('NOT_FOUND', 'Project not found.', 404);
      }
      return Promise.all(tasks.map((task, position) => this.createForProject(
        projectId,
        userId,
        { ...task, status: 'todo', position },
      )));
    },
    async updateRegeneratedTask(projectId, taskId, userId, replacement) {
      const task = await this.findByIdForUser(projectId, taskId, userId);
      if (!task) return null;
      Object.assign(task, replacement, {
        id: task.id,
        projectId: task.projectId,
        status: task.status,
        position: task.position,
        createdAt: task.createdAt,
        updatedAt: new Date().toISOString(),
      });
      return { ...task };
    },
    async reorderForProject(projectId, userId, updates) {
      if (!ownedProject(projectId, userId)) {
        throw new AppError('NOT_FOUND', 'Project not found.', 404);
      }
      if (updates.some((update) => !store.tasks.some(
        (task) => task.id === update.id && task.projectId === projectId,
      ))) {
        throw new AppError('NOT_FOUND', 'One or more tasks could not be found.', 404);
      }
      for (const update of updates) {
        const task = store.tasks.find((item) => item.id === update.id);
        Object.assign(task, update);
      }
      return store.tasks.filter((task) => task.projectId === projectId);
    },
  };

  store.seedUser = async ({ id, name, email, password = 'password123' }) => {
    const passwordHash = await bcrypt.hash(password, 4);
    store.users.push({ id, name, email, passwordHash, createdAt: now, updatedAt: now });
  };
  store.seedProject = (project) => store.projects.push({
    timeframe: '4 weeks', teamSize: 4, strictness: 'Balanced',
    createdAt: now, updatedAt: now, ...project,
  });
  store.seedTask = (task) => store.tasks.push({
    title: 'Task', description: 'Description', category: 'Engineering',
    priority: 'High', status: 'todo', estimatedDuration: '1 day', position: 0,
    createdAt: now, updatedAt: now, ...task,
  });

  return store;
}

export async function withTestServer({
  store = createMemoryStore(),
  aiService = {
    generateTasksForGoal: async () => [],
    regenerateTask: async (goal, context, task) => ({ ...task, title: 'Improved task' }),
  },
  authRateLimitConfig = { windowMs: 60_000, max: 100 },
  aiRateLimitConfig = { windowMs: 60_000, max: 100 },
  allowedOrigins = new Set(['http://allowed.test']),
  databaseHealthCheck = async () => true,
} = {}, callback) {
  const authController = new AuthController({
    userRepository: store.userRepository,
    hashPassword: (password) => bcrypt.hash(password, 4),
  });
  const app = createApp({
    environment: 'test',
    allowedOrigins,
    databaseHealthCheck,
    apiDependencies: {
      userRepository: store.userRepository,
      projectRepository: store.projectRepository,
      taskRepository: store.taskRepository,
      authController,
      aiService,
      authRateLimitConfig,
      aiRateLimitConfig,
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();

  try {
    await callback({ baseUrl: `http://127.0.0.1:${port}`, store });
  } finally {
    server.close();
    await once(server, 'close');
  }
}

export async function request(baseUrl, path, { method = 'GET', body, cookie, origin } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (origin) headers.Origin = origin;
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function registerUser(baseUrl, overrides = {}) {
  const response = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      ...overrides,
    },
  });
  return {
    response,
    body: await response.json(),
    cookie: response.headers.get('set-cookie')?.split(';')[0],
  };
}

export { ids };
