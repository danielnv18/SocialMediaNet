export type FieldErrors = Record<string, string[]>;

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, title: string, detail?: string, fieldErrors: FieldErrors = {}) {
    super(detail ?? title);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.fieldErrors = fieldErrors;
  }
}

/** Status used when the request never reached the server. */
export const NETWORK_ERROR_STATUS = 0;

let onUnauthorized = () => {};

/** Lets the session react to any 401 without this module depending on it. */
export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

export async function parseApiError(response: Response): Promise<ApiError> {
  const fallbackTitle = `Request failed with status ${response.status}.`;
  const body: unknown = await response.json().catch(() => null);
  if (!isRecord(body)) return new ApiError(response.status, fallbackTitle);

  return new ApiError(
    response.status,
    typeof body.title === "string" ? body.title : fallbackTitle,
    typeof body.detail === "string" ? body.detail : undefined,
    parseFieldErrors(body.errors),
  );
}

function parseFieldErrors(errors: unknown): FieldErrors {
  if (!isRecord(errors)) return {};
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(errors)) {
    if (Array.isArray(messages)) {
      result[field] = messages.filter((message) => typeof message === "string");
    }
  }
  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function get(path: string): Promise<unknown> {
  return send(path, { method: "GET" });
}

export function post(path: string, body?: unknown): Promise<unknown> {
  return body === undefined
    ? send(path, { method: "POST" })
    : send(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
}

/** Resolves to the parsed JSON body, or `undefined` when there is none. */
async function send(path: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: "same-origin" });
  } catch {
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      "Can't reach the server. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw await parseApiError(response);
  }

  const text = await response.text();
  return text === "" ? undefined : JSON.parse(text);
}
