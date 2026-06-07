import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { BadRequest } from '../utils/errors';

export const validate =
  (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return next(BadRequest(issues, 'VALIDATION_ERROR'));
    }
    // Replace with parsed (coerced) data
    (req as any)[source] = result.data;
    next();
  };
