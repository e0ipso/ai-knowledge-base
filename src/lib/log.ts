import pc from 'picocolors';

type Level = 'info' | 'warn' | 'error' | 'success';

const paint: Record<Level, (s: string) => string> = {
  info: pc.cyan,
  warn: pc.yellow,
  error: pc.red,
  success: pc.green,
};

function emit(level: Level, prefix: string, message: string): void {
  const line = `${paint[level](prefix)} ${message}`;
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  info: (msg: string): void => emit('info', '•', msg),
  warn: (msg: string): void => emit('warn', '!', msg),
  error: (msg: string): void => emit('error', '✗', msg),
  success: (msg: string): void => emit('success', '✓', msg),
  plain: (msg: string): void => console.log(msg),
};
