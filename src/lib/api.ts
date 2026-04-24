export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & {
  token?: string;
};

export async function apiRequest<TData>(
  path: string,
  options?: RequestOptions,
): Promise<TData> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
      ...(options?.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
  });

  let payload: unknown = null;

  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError(
        response.status,
        `Ошибка ${response.status}: ${response.statusText}`,
      );
    }

    throw new ApiError(response.status, "API вернул некорректный JSON");
  }

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Ошибка ${response.status}: ${response.statusText}`;

    throw new ApiError(response.status, message, payload);
  }

  return payload as TData;
}
