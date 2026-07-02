import { render, screen, waitFor } from "@testing-library/react";
import { Home } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppShell from "./AppShell";

const mocks = vi.hoisted(() => ({
  pathname: "/sysadmin",
  replace: vi.fn(),
  auth: {
    status: "authenticated",
    user: {
      id: "u_1",
      tenantId: "global",
      name: "Root",
      role: "sysadmin",
      status: "active",
    },
    login: vi.fn(),
    logout: vi.fn(),
    refreshMe: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => mocks.auth,
  roleHomePath: (role: string) => `/home/${role}`,
}));

describe("AppShell", () => {
  beforeEach(() => {
    mocks.pathname = "/sysadmin";
    mocks.replace.mockClear();
    mocks.auth.status = "authenticated";
    mocks.auth.user = {
      id: "u_1",
      tenantId: "global",
      name: "Root",
      role: "sysadmin",
      status: "active",
    };
  });

  it("renders children for the matching role", () => {
    render(
      <AppShell
        role="sysadmin"
        nav={[{ href: "/sysadmin", label: "总览", icon: Home }]}
        breadcrumb={["SENTINEL", "系统管理员"]}
      >
        <div>sysadmin content</div>
      </AppShell>,
    );

    expect(screen.getByText("sysadmin content")).toBeInTheDocument();
    expect(screen.getAllByText("系统管理员").length).toBeGreaterThan(0);
  });

  it("redirects anonymous users to login", async () => {
    mocks.auth.status = "anonymous";
    mocks.auth.user = null as never;

    render(
      <AppShell role="sysadmin" nav={[]} breadcrumb={["SENTINEL"]}>
        <div>hidden</div>
      </AppShell>,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login"));
  });

  it("redirects authenticated users away from the wrong role", async () => {
    mocks.auth.user = {
      id: "u_2",
      tenantId: "tenant",
      name: "Family",
      role: "family",
      status: "active",
    };

    render(
      <AppShell role="sysadmin" nav={[]} breadcrumb={["SENTINEL"]}>
        <div>hidden</div>
      </AppShell>,
    );

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/home/family"));
    expect(screen.getByText("VERIFYING SESSION")).toBeInTheDocument();
  });
});
