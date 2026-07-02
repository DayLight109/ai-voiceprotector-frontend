import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ApiTestPanelPage from "./page";

vi.mock("@/components/AppShell", () => ({
  default: ({ children, breadcrumb }: { children: React.ReactNode; breadcrumb: string[] }) => (
    <main>
      <div data-testid="breadcrumb">{breadcrumb.join("/")}</div>
      {children}
    </main>
  ),
}));

vi.mock("@/components/shared/PageHeader", () => ({
  default: ({
    eyebrow,
    title,
    desc,
    actions,
  }: {
    eyebrow: string;
    title: string;
    desc?: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <p>{eyebrow}</p>
      <h1>{title}</h1>
      {desc && <p>{desc}</p>}
      {actions}
    </header>
  ),
}));

vi.mock("@/lib/api", () => ({
  getAccessToken: () => "access-token",
}));

describe("ApiTestPanelPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { status: "ok" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  });

  it("renders the hidden sysadmin API test panel", () => {
    render(<ApiTestPanelPage />);

    expect(screen.getByRole("heading", { name: "后端接口测试面板" })).toBeInTheDocument();
    expect(screen.getAllByText("Gateway health").length).toBeGreaterThan(0);
    expect(screen.getByText("运行只读 smoke")).toBeInTheDocument();
  });

  it("filters cases by path or title", () => {
    render(<ApiTestPanelPage />);

    fireEvent.change(screen.getByPlaceholderText("搜索接口、路径、模块..."), {
      target: { value: "ops/ping" },
    });

    expect(screen.getByText("Ops ping")).toBeInTheDocument();
    // The detail panel keeps the previously selected case visible; the list copy is filtered out.
    expect(screen.getAllByText("Gateway health")).toHaveLength(1);
  });

  it("runs the selected case and displays a passing result", async () => {
    const user = userEvent.setup();
    render(<ApiTestPanelPage />);

    await user.click(screen.getByRole("button", { name: /运行当前用例/ }));

    await waitFor(() => expect(screen.getByText("状态码符合预期")).toBeInTheDocument());
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8080/api/v1/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("reports invalid JSON before sending the request", async () => {
    const user = userEvent.setup();
    render(<ApiTestPanelPage />);

    fireEvent.change(screen.getByPlaceholderText("GET / DELETE 通常留空"), {
      target: { value: "{bad-json" },
    });
    await user.click(screen.getByRole("button", { name: /运行当前用例/ }));

    expect(await screen.findByText("请求体不是合法 JSON")).toBeInTheDocument();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
