import { APP_ERROR_MAP, type AppErrorCode } from "./error-map";

type AppErrorOptions = {
  message?: string;
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;

  constructor(code: AppErrorCode, options?: AppErrorOptions) {
    const entry = APP_ERROR_MAP[code];

    super(options?.message ?? entry.message);

    this.code = code;
    this.status = entry.status;
    this.name = "AppError";
  }
}
