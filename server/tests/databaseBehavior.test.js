import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import TaskRepository from '../repositories/taskRepository.js';

function createTransactionDatabase({ failOnInsert = false } = {}) {
  const statements = [];
  let insertCount = 0;
  const client = {
    async query(sql, values) {
      const normalized = sql.trim();
      statements.push(normalized.split(/\s+/).slice(0, 3).join(' '));
      if (normalized === 'BEGIN' || normalized === 'COMMIT' || normalized === 'ROLLBACK') {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith('SELECT id FROM projects')) {
        return { rowCount: 1, rows: [{ id: values[0] }] };
      }
      if (normalized.startsWith('SELECT COALESCE(MAX(position)')) {
        return { rowCount: 1, rows: [{ next_position: 0 }] };
      }
      if (normalized.startsWith('INSERT INTO tasks')) {
        insertCount += 1;
        if (failOnInsert && insertCount === 2) throw new Error('insert failed');
        return {
          rowCount: 1,
          rows: [{
            id: `00000000-0000-4000-8000-${String(insertCount).padStart(12, '0')}`,
            project_id: values[0], title: values[1], description: values[2],
            category: values[3], priority: values[4], status: values[5],
            estimated_duration: values[6], position: values[7],
            created_at: new Date(), updated_at: new Date(),
          }],
        };
      }
      if (normalized.startsWith('UPDATE projects')) return { rowCount: 1, rows: [] };
      throw new Error(`Unexpected SQL in test: ${normalized}`);
    },
    release() {},
  };
  return {
    statements,
    connect: async () => client,
  };
}

const generatedTasks = [1, 2].map((number) => ({
  title: `Task ${number}`,
  description: 'Description',
  category: 'Engineering',
  priority: 'High',
  status: 'todo',
  estimatedDuration: '1 day',
}));

test('generated task inserts commit as one transaction', async () => {
  const database = createTransactionDatabase();
  const repository = new TaskRepository(database);
  const tasks = await repository.insertGeneratedForProject(
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    generatedTasks,
  );
  assert.equal(tasks.length, 2);
  assert.equal(database.statements[0], 'BEGIN');
  assert.equal(database.statements.at(-1), 'COMMIT');
});

test('a failed generated task insert rolls back the complete transaction', async () => {
  const database = createTransactionDatabase({ failOnInsert: true });
  const repository = new TaskRepository(database);
  await assert.rejects(() => repository.insertGeneratedForProject(
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    generatedTasks,
  ));
  assert.equal(database.statements.at(-1), 'ROLLBACK');
  assert.equal(database.statements.includes('COMMIT'), false);
});

test('a failed reorder update rolls back every task movement', async () => {
  const statements = [];
  let updateCount = 0;
  const client = {
    async query(sql, values) {
      const normalized = sql.trim();
      statements.push(normalized.split(/\s+/).slice(0, 3).join(' '));
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(normalized)) {
        return { rowCount: 0, rows: [] };
      }
      if (normalized.startsWith('SELECT id FROM projects')) {
        return { rowCount: 1, rows: [{ id: values[0] }] };
      }
      if (normalized.startsWith('SELECT id') && normalized.includes('FROM tasks')) {
        return { rowCount: 2, rows: values[1].map((id) => ({ id })) };
      }
      if (normalized.startsWith('UPDATE tasks')) {
        updateCount += 1;
        if (updateCount === 2) throw new Error('reorder failed');
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected SQL in test: ${normalized}`);
    },
    release() {},
  };
  const database = { connect: async () => client };
  const repository = new TaskRepository(database);
  const updates = [
    { id: '00000000-0000-4000-8000-000000000021', status: 'todo', position: 0 },
    { id: '00000000-0000-4000-8000-000000000022', status: 'done', position: 0 },
  ];

  await assert.rejects(() => repository.reorderForProject(
    '00000000-0000-4000-8000-000000000011',
    '00000000-0000-4000-8000-000000000001',
    updates,
  ));
  assert.equal(statements.at(-1), 'ROLLBACK');
  assert.equal(statements.includes('COMMIT'), false);
});

test('migrations define cascades and canonical database constraints', async () => {
  const projectsSql = await readFile(new URL('../migrations/003_create_projects.sql', import.meta.url), 'utf8');
  const tasksSql = await readFile(new URL('../migrations/004_create_tasks.sql', import.meta.url), 'utf8');
  assert.match(projectsSql, /REFERENCES users\(id\) ON DELETE CASCADE/i);
  assert.match(tasksSql, /REFERENCES projects\(id\) ON DELETE CASCADE/i);
  assert.match(tasksSql, /Engineering.*Design.*Marketing.*Research.*Logistics/s);
  assert.match(tasksSql, /High.*Medium.*Low/s);
  assert.match(tasksSql, /todo.*in-progress.*done/s);
  assert.match(tasksSql, /position >= 0/);
});
