import { describe, expect, test } from "bun:test";

import { renderMarkdownToHtml } from "./markdown";

describe("markdown renderer sanitization", () => {
  test("removes active content and unsafe link schemes", () => {
    const html = renderMarkdownToHtml({
      markdown: [
        "# Title",
        '<script>alert("x")</script>',
        '<a href="javascript:alert(1)" onclick="alert(2)">bad</a>',
        '<img src="data:text/html;base64,WA==" onerror="alert(3)" />',
      ].join("\n\n"),
      title: "Unsafe markdown",
    });

    expect(html).not.toContain('alert("x")');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:text/html");
    expect(html).not.toContain("onclick=");
    expect(html).not.toContain("onerror=");
  });
});
