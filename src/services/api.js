const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 60000;

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function parseJsonResponse(response) {
  if (response.status === 204) return null;

  try {
    return await response.json();
  } catch {
    throw new ApiError(
      'The server returned an unreadable response.',
      'INVALID_RESPONSE',
      response.status,
    );
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new ApiError('The request timed out.', 'REQUEST_TIMEOUT');
    }
    throw new ApiError('Cannot connect to the server.', 'NETWORK_ERROR');
  } finally {
    window.clearTimeout(timeoutId);
  }

  const result = await parseJsonResponse(response);
  if (!response.ok || result?.success !== true) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new ApiError(
      result?.error?.message || 'The request could not be completed.',
      result?.error?.code,
      response.status,
    );
  }

  return result.data;
}

export const register = (payload) => apiRequest('/api/auth/register', {
  method: 'POST',
  body: payload,
});
export const login = (payload) => apiRequest('/api/auth/login', {
  method: 'POST',
  body: payload,
});
export const getCurrentUser = () => apiRequest('/api/auth/me');
export const logout = () => apiRequest('/api/auth/logout', { method: 'POST' });

export const listProjects = () => apiRequest('/api/projects');
export const createProject = (payload) => apiRequest('/api/projects', {
  method: 'POST',
  body: payload,
});
export const getProject = (projectId) => apiRequest(`/api/projects/${projectId}`);
export const updateProject = (projectId, payload) => apiRequest(
  `/api/projects/${projectId}`,
  { method: 'PATCH', body: payload },
);
export const deleteProject = (projectId) => apiRequest(
  `/api/projects/${projectId}`,
  { method: 'DELETE' },
);

export const listTasks = (projectId) => apiRequest(
  `/api/projects/${projectId}/tasks`,
);
export const createTask = (projectId, payload) => apiRequest(
  `/api/projects/${projectId}/tasks`,
  { method: 'POST', body: payload },
);
export const getTask = (projectId, taskId) => apiRequest(
  `/api/projects/${projectId}/tasks/${taskId}`,
);
export const updateTask = (projectId, taskId, payload) => apiRequest(
  `/api/projects/${projectId}/tasks/${taskId}`,
  { method: 'PATCH', body: payload },
);
export const deleteTask = (projectId, taskId) => apiRequest(
  `/api/projects/${projectId}/tasks/${taskId}`,
  { method: 'DELETE' },
);
export const generateProjectTasks = (projectId) => apiRequest(
  `/api/projects/${projectId}/generate-tasks`,
  { method: 'POST' },
);
export const regenerateProjectTask = (projectId, taskId) => apiRequest(
  `/api/projects/${projectId}/tasks/${taskId}/regenerate`,
  { method: 'POST' },
);
export const reorderProjectTasks = (projectId, tasks) => apiRequest(
  `/api/projects/${projectId}/tasks/reorder`,
  { method: 'PATCH', body: { tasks } },
);

export function friendlyApiError(error, fallback = 'The request failed.') {
  if (!(error instanceof ApiError)) return fallback;

  const messages = {
    NETWORK_ERROR: 'Cannot connect to the server. Check that the backend is running.',
    REQUEST_TIMEOUT: 'The request took too long. Please try again.',
    RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait before trying again.',
    AI_PROVIDER_RATE_LIMITED: 'The AI provider is busy. Please try again shortly.',
    AI_PROVIDER_ERROR: 'The AI provider could not complete the request.',
    AI_RESPONSE_INVALID: 'The AI returned an invalid result. Please try again.',
    AUTHENTICATION_REQUIRED: 'Your session has expired. Please sign in again.',
  };

  return messages[error.code] || error.message || fallback;
}
