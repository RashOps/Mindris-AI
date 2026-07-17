import { describe, expect, test } from "bun:test";
import {
  resumeTemplatePreviewUrl,
  templateHandle,
  templatePackageFileName,
} from "./templates";

describe("template helpers", () => {
  test("builds a stable DOM handle from namespaced template ids", () => {
    expect(templateHandle("mindris/community-open-source")).toBe(
      "mindris-community-open-source",
    );
  });

  test("builds a portable package filename from a template id", () => {
    expect(templatePackageFileName("mindris/community-open-source")).toBe(
      "community-open-source.mindris-template",
    );
  });

  test("builds a preview URL without leaking auth in the query string", () => {
    expect(resumeTemplatePreviewUrl("mindris/community-open-source")).toBe(
      "http://localhost:8000/api/v1/templates/mindris/community-open-source/preview",
    );
  });
});
