import { appendFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
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

const DEFAULT_LOG_ROOT = fileURLToPath(
    new URL("../../../.logs", import.meta.url),
);
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_BACKUP_COUNT = 5;

export function resolveRendererLogPath({
    logsDir = process.env.LOGS_DIR,
    logPath = process.env.RENDERER_LOG_PATH,
}: {
    logsDir?: string;
    logPath?: string;
} = {}): string {
    if (logPath) {
        return isAbsolute(logPath) ? logPath : resolve(logPath);
    }
    const root = logsDir
        ? isAbsolute(logsDir)
            ? logsDir
            : resolve(logsDir)
        : DEFAULT_LOG_ROOT;
    return join(root, "services", "renderer.log");
}

export function createRendererLogger({
    logPath = resolveRendererLogPath(),
    maxBytes = DEFAULT_MAX_BYTES,
    backupCount = DEFAULT_BACKUP_COUNT,
}: {
    logPath?: string;
    maxBytes?: number;
    backupCount?: number;
} = {}): RendererLogger {
    let pending = Promise.resolve();

    const rotateIfNeeded = async (incomingBytes: number) => {
        let currentBytes = 0;
        try {
            currentBytes = (await stat(logPath)).size;
        } catch {
            currentBytes = 0;
        }
        if (currentBytes + incomingBytes <= maxBytes) {
            return;
        }

        if (backupCount <= 0) {
            await rm(logPath, { force: true });
            return;
        }

        await rm(`${logPath}.${backupCount}`, { force: true });
        for (let index = backupCount - 1; index >= 1; index -= 1) {
            try {
                await rename(`${logPath}.${index}`, `${logPath}.${index + 1}`);
            } catch {
                // Missing backup files are expected during early rotations.
            }
        }
        try {
            await rename(logPath, `${logPath}.1`);
        } catch {
            // The first write has no active file to rotate.
        }
    };

    return {
        async log(entry: RendererLogEntry) {
            const record = {
                timestamp: entry.timestamp ?? new Date().toISOString(),
                service: "renderer" as const,
                ...entry,
            };
            const line = `${JSON.stringify(record)}\n`;

            pending = pending
                .catch(() => undefined)
                .then(async () => {
                    await mkdir(dirname(logPath), { recursive: true });
                    await rotateIfNeeded(Buffer.byteLength(line, "utf8"));
                    await appendFile(logPath, line, "utf8");
                });
            await pending;
        },
    };
}
