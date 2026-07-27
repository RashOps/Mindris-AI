import { describe, expect, test } from "bun:test";

import { buildRendererApp } from "./app";
import { buildDocsHtml, buildOpenApiDocument } from "./openapi";

describe("renderer OpenAPI", () => {
  test("builds an OpenAPI document with docs and render routes", () => {
    const document = buildOpenApiDocument("http://localhost:4000");

    expect(document.openapi).toBe("3.1.0");
    expect(document.paths["/render/pdf"]?.post).toBeDefined();
    expect(document.paths["/render/markdown"]?.post).toBeDefined();
    expect(document.paths["/health"]?.get).toBeDefined();
    expect(document.paths["/ready"]?.get).toBeDefined();
  });

  test("renders a local docs shell pointing at openapi.json", () => {
    const html = buildDocsHtml("/openapi.json");

    expect(html).toContain("Renderer API Docs");
    expect(html).toContain("/openapi.json");
    expect(html).toContain("const spec = await res.json()");
  });

  test("serves docs and OpenAPI routes from the renderer app", async () => {
    const app = buildRendererApp("http://localhost:4000");

    const openApiResponse = await app.handle(
      new Request("http://localhost:4000/openapi.json"),
    );
    const docsResponse = await app.handle(
      new Request("http://localhost:4000/docs"),
    );
    const openApiDocument = await openApiResponse.json() as {
      paths: Record<string, unknown>;
    };

    expect(openApiResponse.status).toBe(200);
    expect(openApiDocument.paths["/render/pdf"]).toBeDefined();
    expect(docsResponse.status).toBe(200);
    expect(await docsResponse.text()).toContain("Renderer API Docs");
  });

  test("documents the observable renderer contract routes", () => {
    const document = buildOpenApiDocument("http://localhost:4000");

    expect(document.paths["/contracts"]).toBeDefined();
    expect(document.paths["/render/manifest"]).toBeDefined();
  });
});
