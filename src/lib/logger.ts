import { createLogger } from "@upstart13-com/aiden-logging";

export const log = createLogger({
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "aiden-app",
  level: process.env.LOG_LEVEL as never,
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});
