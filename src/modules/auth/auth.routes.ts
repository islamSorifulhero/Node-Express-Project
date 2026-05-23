import { Router } from 'express';
import { signup, login } from './auth.controller';

const router = Router();

// POST /api/auth/signup — public
router.post('/signup', signup);

// POST /api/auth/login — public
router.post('/login', login);

export default router;
