import { randomUUID } from "crypto";
import { AppError } from "../errors/app-error";
import { APP_ERROR_MAP } from "../errors/error-map";

type ErrorResponse = {
  status: number;
  body: {
    code: string;
    message: string;
    requestId: string;
  };
};

export function handleError(error: unknown): ErrorResponse {
  const requestId = randomUUID();

  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        code: error.code,
        message: error.message,
        requestId,
      },
    };
  }

  // log interno (nunca enviado ao cliente)
  console.error({
    requestId,
    error,
  });

  const fallback = APP_ERROR_MAP.INTERNAL_SERVER_ERROR;

  return {
    status: fallback.status,
    body: {
      code: "INTERNAL_SERVER_ERROR",
      message: fallback.message,
      requestId,
    },
  };
}
