import type { ZodError } from "zod";

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "INVALID_CREDENTIALS"
  | "VALIDATION_ERROR"
  | "EMAIL_TAKEN"
  | "NOT_FOUND"
  | "SLOT_OCCUPIED"
  | "SERVER_ERROR";

type FieldErrors = Record<string, string[]>;

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
) {
  return Response.json(
    { error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } },
    { status },
  );
}

export function zodError(error: ZodError) {
  return apiError(
    422,
    "VALIDATION_ERROR",
    "Please check the highlighted fields.",
    error.flatten().fieldErrors as FieldErrors,
  );
}

export async function readJson(request: Request): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
