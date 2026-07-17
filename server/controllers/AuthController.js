import bcrypt from 'bcryptjs';
import UserRepository from '../repositories/userRepository.js';
import AppError from '../utils/AppError.js';
import {
  assertAuthConfigured,
  clearAuthCookie,
  setAuthCookie,
  signAuthToken,
} from '../utils/auth.js';
import {
  validateLoginRequest,
  validateRegistrationRequest,
} from '../utils/authValidation.js';

const PASSWORD_HASH_ROUNDS = 12;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  'not-a-real-user-password',
  PASSWORD_HASH_ROUNDS,
);

class AuthController {
  constructor({
    userRepository = new UserRepository(),
    hashPassword = (password) => bcrypt.hash(password, PASSWORD_HASH_ROUNDS),
    comparePassword = bcrypt.compare,
    ensureAuthConfigured = assertAuthConfigured,
    signToken = signAuthToken,
    setCookie = setAuthCookie,
    clearCookie = clearAuthCookie,
  } = {}) {
    this.userRepository = userRepository;
    this.hashPassword = hashPassword;
    this.comparePassword = comparePassword;
    this.ensureAuthConfigured = ensureAuthConfigured;
    this.signToken = signToken;
    this.setCookie = setCookie;
    this.clearCookie = clearCookie;
  }

  async register(req, res) {
    this.ensureAuthConfigured();
    const { name, email, password } = validateRegistrationRequest(req.body);
    const passwordHash = await this.hashPassword(password);
    const user = await this.userRepository.create({ name, email, passwordHash });
    const token = this.signToken(user.id);
    this.setCookie(res, token);

    return res.status(201).json({ success: true, data: { user } });
  }

  async login(req, res) {
    this.ensureAuthConfigured();
    const { email, password } = validateLoginRequest(req.body);
    const user = await this.userRepository.findByEmail(email);
    const passwordMatches = await this.comparePassword(
      password,
      user?.passwordHash || DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        'Email or password is incorrect.',
        401,
      );
    }

    const { passwordHash, ...safeUser } = user;
    void passwordHash;
    const token = this.signToken(safeUser.id);
    this.setCookie(res, token);

    return res.json({ success: true, data: { user: safeUser } });
  }

  async me(req, res) {
    return res.json({ success: true, data: { user: req.user } });
  }

  async logout(req, res) {
    this.clearCookie(res);
    return res.json({ success: true, data: null });
  }
}

export default AuthController;
