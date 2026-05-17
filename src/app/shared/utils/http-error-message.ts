export const httpErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error == 'string' && error.trim()) return error;
  if (!error || typeof error != 'object') return fallback;

  const record = error as Record<string, unknown>;
  for (const key of ['message', 'detail', 'title']) {
    const value = record[key];
    if (typeof value == 'string' && value.trim()) return value;
  }

  return fallback;
};
