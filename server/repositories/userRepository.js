import { getPool } from '../config/database.js';
import AppError from '../utils/AppError.js';
import { mapUser } from './mappers.js';

class UserRepository {
  constructor(database) {
    this.database = database;
  }

  get db() {
    return this.database || getPool();
  }

  async create({ name, email, passwordHash }) {
    try {
      const result = await this.db.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name, email, passwordHash],
      );

      return mapUser(result.rows[0]);
    } catch (error) {
      if (error?.code === '23505') {
        throw new AppError(
          'EMAIL_ALREADY_REGISTERED',
          'An account with this email already exists.',
          409,
        );
      }

      throw error;
    }
  }

  async findByEmail(email) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      ...mapUser(row),
      passwordHash: row.password_hash,
    };
  }

  async findById(id) {
    const result = await this.db.query(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );

    return mapUser(result.rows[0]);
  }
}

export default UserRepository;
