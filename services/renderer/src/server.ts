import { buildRendererApp } from "./app";

const PORT = 4000;
const BASE_URL = `http://localhost:${PORT}`;

const app = buildRendererApp(BASE_URL);

app.listen(PORT);

console.log(`Mindris Renderer running at ${BASE_URL}`);
