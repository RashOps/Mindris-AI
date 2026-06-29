import { buildRendererApp } from "./app";
import { createRendererLogger } from "./logger";

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

const app = buildRendererApp(BASE_URL);
const logger = createRendererLogger();

app.listen(PORT);

await logger.log({
    level: "info",
    event: "server.started",
    message: "Renderer started",
    route: BASE_URL,
});
