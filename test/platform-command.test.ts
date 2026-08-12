import { describe, expect, it } from "vitest";

import { platformCommand, platformInvocation } from "../scripts/platform-command.mjs";

describe("platform command resolution", () => {
  it("uses command shims for package managers on Windows", () => {
    expect(platformCommand("pnpm", "win32")).toBe("pnpm.cmd");
    expect(platformCommand("npm", "win32")).toBe("npm.cmd");
  });

  it("preserves package manager and non-package commands elsewhere", () => {
    expect(platformCommand("pnpm", "linux")).toBe("pnpm");
    expect(platformCommand("git", "win32")).toBe("git");
  });

  it("invokes Windows command shims through cmd.exe without a shell string", () => {
    expect(platformInvocation("pnpm", ["--version"], "win32", "C:\\Windows\\System32\\cmd.exe")).toEqual({
      command: "C:\\Windows\\System32\\cmd.exe",
      args: ["/d", "/s", "/c", "pnpm.cmd", "--version"]
    });
    expect(platformInvocation("pnpm", ["--version"], "linux")).toEqual({
      command: "pnpm",
      args: ["--version"]
    });
  });
});
