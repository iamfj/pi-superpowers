/**
 * Subagent extension integration tests.
 *
 * Verifies that:
 *   1. subagent-utils.ts exists with expected exports
 *   2. subagent.ts exists as a Pi extension file
 *   3. package.json registers subagent.ts in pi.extensions
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRolePrompt, buildPiArgs, parseSubagentResult, buildSubagentTodoFile } from "../extensions/subagent-utils.js";
import registerSubagentExtension from "../extensions/subagent.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

describe("subagent-utils.ts file", () => {
  it("extensions/subagent-utils.ts exists", () => {
    expect(fs.existsSync(path.join(ROOT, "extensions", "subagent-utils.ts"))).toBe(true);
  });

  it("exports buildRolePrompt function", () => {
    expect(typeof buildRolePrompt).toBe("function");
  });

  it("exports buildPiArgs function", () => {
    expect(typeof buildPiArgs).toBe("function");
  });

  it("exports parseSubagentResult function", () => {
    expect(typeof parseSubagentResult).toBe("function");
  });

  it("exports buildSubagentTodoFile function", () => {
    expect(typeof buildSubagentTodoFile).toBe("function");
  });
});

describe("subagent.ts file", () => {
  it("extensions/subagent.ts exists", () => {
    expect(fs.existsSync(path.join(ROOT, "extensions", "subagent.ts"))).toBe(true);
  });

  it("subagent.ts exports a default function", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "extensions", "subagent.ts"),
      "utf8"
    );
    expect(content).toMatch(/export default function/);
  });

  it("subagent.ts registers dispatch_agent tool", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "extensions", "subagent.ts"),
      "utf8"
    );
    expect(content).toContain("dispatch_agent");
    expect(content).toContain("registerTool");
  });

  it("subagent.ts uses buildRolePrompt and buildPiArgs from subagent-utils", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "extensions", "subagent.ts"),
      "utf8"
    );
    expect(content).toContain("buildRolePrompt");
    expect(content).toContain("buildPiArgs");
  });

  it("subagent.ts handles ENOENT (pi not in PATH) gracefully", () => {
    const content = fs.readFileSync(
      path.join(ROOT, "extensions", "subagent.ts"),
      "utf8"
    );
    expect(content).toContain("ENOENT");
  });

  it("passes assigned todo file guidance to pi exec and returns it in details", async () => {
    let registeredTool: any;
    const execCalls: Array<{ command: string; args: string[] }> = [];
    const fakePi = {
      registerTool(tool: any) {
        registeredTool = tool;
      },
      async exec(command: string, args: string[]) {
        execCalls.push({ command, args });
        return { stdout: "done", stderr: "", code: 0 };
      },
    };

    registerSubagentExtension(fakePi as any);
    const result = await registeredTool.execute(
      "tool-call-1",
      { task: "do work", role: "implementer" },
      undefined,
      undefined,
      undefined
    );

    expect(execCalls[0].command).toBe("pi");
    expect(execCalls[0].args.join("\n")).toContain(".superpowers/todos/implementer-");
    expect(execCalls[0].args.join("\n")).toContain("Do not use TODO.md");
    expect(result.details.todoFile).toContain(".superpowers/todos/implementer-");
  });
});

describe("package.json pi.extensions registration", () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, "package.json"), "utf8")
  );

  it("package.json pi.extensions includes bootstrap.ts", () => {
    expect(pkg.pi.extensions).toContain("./extensions/bootstrap.ts");
  });

  it("package.json pi.extensions includes subagent.ts", () => {
    expect(pkg.pi.extensions).toContain("./extensions/subagent.ts");
  });

  it("package.json pi.extensions has exactly 2 entries", () => {
    expect(pkg.pi.extensions).toHaveLength(2);
  });
});
