type LogLevel = "info" | "warn" | "error" | "debug";

type LogPayload = Record<string, unknown>;

function log(level: LogLevel, message: string, payload?: LogPayload): void {
  if (process.env.NODE_ENV === "test") return;

  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (message: string, payload?: LogPayload) => log("info", message, payload),
  warn: (message: string, payload?: LogPayload) => log("warn", message, payload),
  error: (message: string, payload?: LogPayload) => log("error", message, payload),
  debug: (message: string, payload?: LogPayload) => {
    if (process.env.NODE_ENV !== "production") {
      log("debug", message, payload);
    }
  },
};
