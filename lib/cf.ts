import { getCloudflareContext } from "@opennextjs/cloudflare";

export type D1Result<T> = {
  results: T[];
  success: boolean;
};

export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}

export interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
  exec(query: string): Promise<unknown>;
}

export interface R2ObjectBody {
  body: ReadableStream;
  size: number;
  httpMetadata?: { contentType?: string };
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | Uint8Array | string,
    options?: {
      httpMetadata?: {
        contentType?: string;
        cacheControl?: string;
        contentDisposition?: string;
      };
    },
  ): Promise<unknown>;
  get(
    key: string,
    options?: { range?: { offset: number; length?: number } },
  ): Promise<R2ObjectBody | null>;
  delete(key: string | string[]): Promise<void>;
}

export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
};

export async function getEnv(): Promise<Env> {
  const { env } = await getCloudflareContext({ async: true });
  return env as unknown as Env;
}
