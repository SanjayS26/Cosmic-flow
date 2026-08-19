import { TASK_STATUSES } from '../constants/tasks';

const COLUMN_ORDER = ['column-1', 'column-2', 'column-3'];
const COLUMN_DEFINITIONS = {
  'column-1': { id: 'column-1', title: 'To Do', status: 'todo' },
  'column-2': { id: 'column-2', title: 'In Progress', status: 'in-progress' },
  'column-3': { id: 'column-3', title: 'Done', status: 'done' },
};

export function createEmptyBoard() {
  return {
    tasks: {},
    columns: Object.fromEntries(
      COLUMN_ORDER.map((id) => [id, { ...COLUMN_DEFINITIONS[id], taskIds: [] }]),
    ),
    columnOrder: [...COLUMN_ORDER],
  };
}

export function createBoardFromTasks(tasks = []) {
  const board = createEmptyBoard();
  const ordered = [...tasks].sort((a, b) => a.position - b.position);

  for (const task of ordered) {
    if (!task?.id || !TASK_STATUSES.includes(task.status) || board.tasks[task.id]) {
      continue;
    }
    const columnId = COLUMN_ORDER.find(
      (id) => board.columns[id].status === task.status,
    );
    board.tasks[task.id] = { ...task };
    board.columns[columnId].taskIds.push(task.id);
  }

  return board;
}

export function upsertTask(board, task) {
  const withoutTask = removeTask(board, task.id);
  const columnId = withoutTask.columnOrder.find(
    (id) => withoutTask.columns[id].status === task.status,
  );
  if (!columnId) return board;

  return {
    ...withoutTask,
    tasks: { ...withoutTask.tasks, [task.id]: { ...task } },
    columns: {
      ...withoutTask.columns,
      [columnId]: {
        ...withoutTask.columns[columnId],
        taskIds: [...withoutTask.columns[columnId].taskIds, task.id],
      },
    },
  };
}

export function updateBoardTask(board, taskId, changes) {
  if (!board.tasks[taskId]) return board;
  return {
    ...board,
    tasks: {
      ...board.tasks,
      [taskId]: { ...board.tasks[taskId], ...changes, id: taskId },
    },
  };
}

export function removeTask(board, taskId) {
  if (!board.tasks[taskId]) return board;
  const tasks = { ...board.tasks };
  delete tasks[taskId];

  return {
    ...board,
    tasks,
    columns: Object.fromEntries(
      Object.entries(board.columns).map(([id, column]) => [id, {
        ...column,
        taskIds: column.taskIds.filter((value) => value !== taskId),
      }]),
    ),
  };
}

export function moveTask(board, taskId, targetColumnId, targetIndex) {
  const targetColumn = board.columns[targetColumnId];
  const sourceEntry = Object.entries(board.columns).find(
    ([, column]) => column.taskIds.includes(taskId),
  );
  if (!targetColumn || !sourceEntry || !board.tasks[taskId]) return board;

  const [sourceColumnId, sourceColumn] = sourceEntry;
  const sourceIndex = sourceColumn.taskIds.indexOf(taskId);
  const sourceTaskIds = sourceColumn.taskIds.filter((id) => id !== taskId);
  const targetWithoutTask = targetColumn.taskIds.filter((id) => id !== taskId);
  let insertionIndex = Number.isInteger(targetIndex)
    ? targetIndex
    : targetColumn.taskIds.length;

  if (sourceColumnId === targetColumnId && sourceIndex < insertionIndex) {
    insertionIndex -= 1;
  }
  insertionIndex = Math.max(0, Math.min(insertionIndex, targetWithoutTask.length));
  const targetTaskIds = [...targetWithoutTask];
  targetTaskIds.splice(insertionIndex, 0, taskId);

  if (
    sourceColumnId === targetColumnId
    && targetTaskIds.every((id, index) => id === sourceColumn.taskIds[index])
  ) return board;

  return {
    ...board,
    tasks: {
      ...board.tasks,
      [taskId]: { ...board.tasks[taskId], status: targetColumn.status },
    },
    columns: {
      ...board.columns,
      [sourceColumnId]: { ...sourceColumn, taskIds: sourceTaskIds },
      [targetColumnId]: { ...targetColumn, taskIds: targetTaskIds },
    },
  };
}

export function createReorderPayload(board) {
  return board.columnOrder.flatMap((columnId) => {
    const column = board.columns[columnId];
    return column.taskIds.map((id, position) => ({
      id,
      status: column.status,
      position,
    }));
  });
}
