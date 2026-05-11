type Level = 'info' | 'warn' | 'error' | 'success';

const useColor =
  process.stdout.isTTY && process.env['NO_COLOR'] !== '1' && process.env['FORCE_COLOR'] !== '0';

const colors: Record<Level, string> = {
  info: '[36m', // cyan
  warn: '[33m', // yellow
  error: '[31m', // red
  success: '[32m', // green
};
const reset = '[0m';

function paint(level: Level, label: string): string {
  if (!useColor) return label;
  return `${colors[level]}${label}${reset}`;
}

function emit(level: Level, prefix: string, message: string): void {
  const line = `${paint(level, prefix)} ${message}`;
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
