const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, code = 'REQUEST_FAILED', status = 0) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

async function parseJsonResponse(response) {
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

export async function generateTasks(payload) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/generate-tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError(
      'Cannot connect to the task-generation server.',
      'NETWORK_ERROR',
    );
  }

  const result = await parseJsonResponse(response);

  if (!response.ok || result.success !== true) {
    throw new ApiError(
      result.error?.message || 'Task generation failed.',
      result.error?.code,
      response.status,
    );
  }

  if (!Array.isArray(result.data)) {
    throw new ApiError(
      'The server returned an invalid task list.',
      'INVALID_RESPONSE',
      response.status,
    );
  }

  return result.data;
}
