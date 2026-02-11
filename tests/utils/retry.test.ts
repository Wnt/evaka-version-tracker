import axios from 'axios';
import { withRetry, checkRateLimit, RateLimitError } from '../../src/utils/retry';

describe('withRetry', () => {
  it('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on transient failure and succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Persistent error'));

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('Persistent error');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx errors', async () => {
    const error = {
      response: { status: 404 },
      isAxiosError: true,
    };
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const fn = jest.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 3, 10)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 rate limit errors', async () => {
    const error = {
      response: { status: 429 },
      isAxiosError: true,
    };
    jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const result = await withRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should not retry RateLimitError', async () => {
    const fn = jest
      .fn()
      .mockRejectedValue(new RateLimitError('Rate limited', 0, new Date()));

    await expect(withRetry(fn, 3, 10)).rejects.toBeInstanceOf(RateLimitError);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('checkRateLimit', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should not warn when rate limit is high', () => {
    const headers = {
      'x-ratelimit-remaining': '100',
      'x-ratelimit-reset': '1234567890',
    };

    checkRateLimit(headers);

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should warn when rate limit is low', () => {
    const headers = {
      'x-ratelimit-remaining': '5',
      'x-ratelimit-reset': '1234567890',
    };

    checkRateLimit(headers);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('5 requests remaining')
    );
  });

  it('should throw RateLimitError when limit is exhausted', () => {
    const headers = {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': '1234567890',
    };

    expect(() => checkRateLimit(headers)).toThrow(RateLimitError);
  });

  it('should handle missing headers gracefully', () => {
    const headers = {};

    expect(() => checkRateLimit(headers)).not.toThrow();
  });
});
