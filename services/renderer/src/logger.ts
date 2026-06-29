import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export type RendererLogEntry = {
    level: "info" | "error";
    event: string;
    message: string;
    method?: string;
    route?: string;
    status?: number;
    duration_ms?: number;
    error?: string;
    timestamp?: string;
    service?: "renderer";
};

export interface RendererLogger {
    log(entry: RendererLogEntry): Promise<void>;
}

const DEFAULT_LOG_PATH = fileURLToPath(
    new URL("../../../.logs/renderer.log", import.meta.url),
);

export function resolveRendererLogPath(): string {
    return DEFAULT_LOG_PATH;
}

export function createRendererLogger({
    logPath = DEFAULT_LOG_PATH,
}: {
    logPath?: string;
} = {}): RendererLogger {
    return {
        async log(entry: RendererLogEntry) {
            const record = {
                timestamp: entry.timestamp ?? new Date().toISOString(),
                service: "renderer" as const,
                ...entry,
            };

            await mkdir(dirname(logPath), { recursive: true });
            await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
        },
    };
}
