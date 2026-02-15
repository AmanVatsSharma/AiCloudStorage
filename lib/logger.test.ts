import { createTraceId, logger } from '@/lib/logger';

describe('lib/logger', () => {
  it('creates trace IDs with prefix', () => {
    const traceId = createTraceId('unit');
    expect(traceId.startsWith('unit_')).toBe(true);
  });

  it('writes structured payloads to console', () => {
    const spy = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    logger.info({
      traceId: 'trace_1',
      scope: 'logger-test',
      message: 'hello',
      data: { a: 1 },
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const [prefix, payload] = spy.mock.calls[0];
    expect(prefix).toBe('app-log:');
    expect(payload).toMatchObject({
      level: 'info',
      traceId: 'trace_1',
      scope: 'logger-test',
      message: 'hello',
      data: { a: 1 },
    });

    spy.mockRestore();
  });
});
