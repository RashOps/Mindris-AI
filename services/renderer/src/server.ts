import { buildRendererApp } from "./app";
import { createRendererLogger } from "./logger";

export function resolveRendererPort(value: string | undefined): number {
    const parsed = Number.parseInt(value ?? "", 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return 4000;
    }
    return parsed;
}

export async function startRendererServer(): Promise<void> {
    const port = resolveRendererPort(process.env.PORT);
    const baseUrl = `http://localhost:${port}`;
    const app = buildRendererApp(baseUrl);
    const logger = createRendererLogger();

    app.listen(port);

    await logger.log({
        level: "info",
        event: "server.started",
        message: "Renderer started",
        route: baseUrl,
    });
}

if (import.meta.main) {
    await startRendererServer();
}
