const shouldLog = Boolean(import.meta.env.DEV);

const noop = () => {};

export const logger = {
  info: shouldLog ? (...args) => console.info(...args) : noop,
  warn: shouldLog ? (...args) => console.warn(...args) : noop,
  error: shouldLog ? (...args) => console.error(...args) : noop,
};
