import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../utils/asyncHandler';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { loginSchema, refreshSchema } from './auth.validators';
import { loginHandler, refreshHandler, logoutHandler, meHandler } from './auth.controller';

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true });

const router = Router();
router.post('/login',   loginLimiter, validate(loginSchema),   asyncHandler(loginHandler));
router.post('/refresh',               validate(refreshSchema), asyncHandler(refreshHandler));
router.post('/logout',                                          asyncHandler(logoutHandler));
router.get('/me',       authenticate,                           meHandler);

export default router;
