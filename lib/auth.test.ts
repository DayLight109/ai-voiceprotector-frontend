import { describe, expect, it } from "vitest";
import { roleHomePath } from "./auth";

describe("roleHomePath", () => {
  it.each([
    ["family", "/app"],
    ["biz", "/biz"],
    ["family_admin", "/family-admin"],
    ["admin", "/admin"],
    ["sysadmin", "/sysadmin"],
  ] as const)("maps %s to %s", (role, path) => {
    expect(roleHomePath(role)).toBe(path);
  });
});
