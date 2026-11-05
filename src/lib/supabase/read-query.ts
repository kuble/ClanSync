type ReadResult = { status: number; error: { code?: string; message: string } | null };

export class DatabaseReadError extends Error {
  readonly operation: string;
  readonly status: number;
  readonly code: string | undefined;

  constructor(operation: string, result: ReadResult) {
    super("데이터를 불러오지 못했습니다.");
    this.name = "DatabaseReadError";
    this.operation = operation;
    this.status = result.status;
    this.code = result.error?.code;
  }
}

function retryable(result: ReadResult) {
  const code = result.error?.code ?? "";
  if ([401, 403].includes(result.status) || ["42501", "28P01", "20", "ABORT_ERR"].includes(code)
    || result.error?.message.startsWith("AbortError:")) return false;
  return result.status === 0 || [408, 429, 500, 502, 503, 504, 520].includes(result.status)
    || ["40001", "40P01", "57014", "57P01", "57P02", "57P03"].includes(code) || code.startsWith("08");
}

export function databaseAccessDenied(result: ReadResult): boolean {
  return [401, 403].includes(result.status) || result.error?.code === "42501";
}

/** Read-only queries only. Factories disable SDK retries so the total is bounded to two attempts. */
export async function retryDatabaseRead<T extends ReadResult>(operation: string, request: () => PromiseLike<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const result = await request();
    if (!result.error) return result;
    const retry = attempt === 1 && retryable(result);
    // Never log query parameters, row data, tokens, or raw upstream error bodies.
    console.warn(retry ? "DB_READ_RETRY" : "DB_READ_FAILED", JSON.stringify({ operation, attempt, status: result.status,
      code: /^[A-Z0-9_]{1,16}$/.test(result.error.code ?? "") ? result.error.code : null }));
    if (!retry) return result;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
}

export function assertDatabaseRead(operation: string, result: ReadResult): void {
  if (result.error) throw new DatabaseReadError(operation, result);
}
