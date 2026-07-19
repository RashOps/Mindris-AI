import { describe, expect, test } from "bun:test";

import { deduplicateToolbarSelectOptions } from "./ToolbarSelect";

describe("ToolbarSelect options", () => {
  test("keeps only the first option for each backend value", () => {
    const options = deduplicateToolbarSelectOptions([
      { value: "mistral-large", label: "Mistral Large" },
      { value: "mistral-large", label: "Duplicate" },
      { value: "mistral-small", label: "Mistral Small" },
    ]);

    expect(options).toEqual([
      { value: "mistral-large", label: "Mistral Large" },
      { value: "mistral-small", label: "Mistral Small" },
    ]);
  });
});
