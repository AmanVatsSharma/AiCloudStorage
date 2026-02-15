import { AppError, getUserErrorMessage, toError } from '@/lib/errors';

describe('lib/errors', () => {
  it('preserves AppError message and metadata', () => {
    const err = new AppError('Access denied', {
      code: 'FORBIDDEN',
      status: 403,
      isOperational: true,
    });

    expect(err.message).toBe('Access denied');
    expect(err.code).toBe('FORBIDDEN');
    expect(err.status).toBe(403);
    expect(err.isOperational).toBe(true);
  });

  it('returns fallback for unknown values', () => {
    expect(getUserErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getUserErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('returns error message when standard Error is provided', () => {
    expect(getUserErrorMessage(new Error('Network failure'))).toBe('Network failure');
  });

  it('normalizes unknown values to Error', () => {
    const fromString = toError('failure');
    const fromObject = toError({ unexpected: true });

    expect(fromString).toBeInstanceOf(Error);
    expect(fromString.message).toBe('failure');
    expect(fromObject).toBeInstanceOf(Error);
    expect(fromObject.message).toBe('Unknown error');
  });
});
