import fs from "fs";
import os from "os";
import path from "path";

const { findMetroWorkspaceRoot } = require("../../metro.workspace-root");

describe("findMetroWorkspaceRoot", () => {
  test("returns the nearest workspace root when a parent package declares workspaces", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oriontv-metro-workspace-"));
    const workspaceRoot = path.join(tempRoot, "workspace");
    const appRoot = path.join(workspaceRoot, "apps", "tv");

    fs.mkdirSync(appRoot, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceRoot, "package.json"),
      JSON.stringify({ private: true, workspaces: ["apps/*"] }),
      "utf8"
    );

    expect(findMetroWorkspaceRoot(appRoot)).toBe(workspaceRoot);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("falls back to the project root when no parent package declares workspaces", () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "oriontv-metro-project-"));
    const projectRoot = path.join(tempRoot, "OrionTV");

    fs.mkdirSync(projectRoot, { recursive: true });
    fs.writeFileSync(
      path.join(projectRoot, "package.json"),
      JSON.stringify({ name: "oriontv-test", private: true }),
      "utf8"
    );

    expect(findMetroWorkspaceRoot(projectRoot)).toBe(projectRoot);

    fs.rmSync(tempRoot, { recursive: true, force: true });
  });
});
