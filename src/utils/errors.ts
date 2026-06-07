export class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
export const BadRequest = (m = 'Bad request', c?: string) => new AppError(400, m, c);
export const Unauthorized = (m = 'Unauthorized', c?: string) => new AppError(401, m, c);
export const Forbidden = (m = 'Forbidden', c?: string) => new AppError(403, m, c);
export const NotFound = (m = 'Not found', c?: string) => new AppError(404, m, c);
export const Conflict = (m = 'Conflict', c?: string) => new AppError(409, m, c);
