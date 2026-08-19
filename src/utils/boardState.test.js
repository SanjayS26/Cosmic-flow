import { describe, expect, it } from 'vitest';
import {
  createBoardFromTasks,
  createReorderPayload,
  moveTask,
} from './boardState';

const tasks = [
  { id: 'a', title: 'A', status: 'todo', position: 0 },
  { id: 'b', title: 'B', status: 'todo', position: 1 },
  { id: 'c', title: 'C', status: 'in-progress', position: 0 },
];

describe('database board state movement', () => {
  it('builds ordered columns from API tasks', () => {
    const board = createBoardFromTasks([tasks[1], tasks[0], tasks[2]]);
    expect(board.columns['column-1'].taskIds).toEqual(['a', 'b']);
    expect(board.columns['column-2'].taskIds).toEqual(['c']);
  });

  it('moves a task between columns and updates its status', () => {
    const board = createBoardFromTasks(tasks);
    const moved = moveTask(board, 'a', 'column-2', 0);
    expect(moved.columns['column-1'].taskIds).toEqual(['b']);
    expect(moved.columns['column-2'].taskIds).toEqual(['a', 'c']);
    expect(moved.tasks.a.status).toBe('in-progress');
  });

  it('reorders within a column without duplication or status changes', () => {
    const board = createBoardFromTasks(tasks);
    const moved = moveTask(board, 'b', 'column-1', 0);
    expect(moved.columns['column-1'].taskIds).toEqual(['b', 'a']);
    expect(moved.tasks.b.status).toBe('todo');
    expect(new Set(moved.columns['column-1'].taskIds).size).toBe(2);
  });

  it('creates canonical status and position persistence payloads', () => {
    const board = moveTask(createBoardFromTasks(tasks), 'a', 'column-2', 0);
    expect(createReorderPayload(board)).toEqual([
      { id: 'b', status: 'todo', position: 0 },
      { id: 'a', status: 'in-progress', position: 0 },
      { id: 'c', status: 'in-progress', position: 1 },
    ]);
  });
});
