import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { APIError } from "./api";
import { useResource, useSingle } from "./use-resource";

function ListProbe({ fetcher }: { fetcher: () => Promise<{ data: { id: string }[]; meta?: { total: number } }> }) {
  const res = useResource(fetcher, [fetcher]);
  return (
    <div>
      <div data-testid="loading">{String(res.loading)}</div>
      <div data-testid="total">{res.total}</div>
      <div data-testid="items">{res.items.map((i) => i.id).join(",")}</div>
      <div data-testid="error">{res.error ?? "none"}</div>
      <button onClick={res.refresh}>refresh</button>
      <button onClick={() => res.setLocal((prev) => [...prev, { id: "local" }])}>local</button>
    </div>
  );
}

function SingleProbe({ fetcher }: { fetcher: () => Promise<{ name: string }> }) {
  const res = useSingle(fetcher, [fetcher]);
  return (
    <div>
      <div data-testid="loading">{String(res.loading)}</div>
      <div data-testid="name">{res.data?.name ?? "none"}</div>
      <div data-testid="error">{res.error ?? "none"}</div>
      <button onClick={res.refresh}>refresh</button>
    </div>
  );
}

describe("useResource", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads list data and exposes total", async () => {
    const fetcher = vi.fn().mockResolvedValue({ data: [{ id: "a" }, { id: "b" }], meta: { total: 12 } });

    render(<ListProbe fetcher={fetcher} />);

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    await waitFor(() => expect(screen.getByTestId("loading")).toHaveTextContent("false"));
    expect(screen.getByTestId("items")).toHaveTextContent("a,b");
    expect(screen.getByTestId("total")).toHaveTextContent("12");
    expect(screen.getByTestId("error")).toHaveTextContent("none");
  });

  it("refreshes and supports local updates", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "a" }] })
      .mockResolvedValueOnce({ data: [{ id: "b" }] });

    render(<ListProbe fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId("items")).toHaveTextContent("a"));
    await user.click(screen.getByRole("button", { name: "local" }));
    expect(screen.getByTestId("items")).toHaveTextContent("a,local");
    await user.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("items")).toHaveTextContent("b"));
  });

  it("shows APIError messages and generic fallback errors", async () => {
    const fetcher = vi.fn().mockRejectedValue(new APIError("BAD", "后端错误", 400));

    render(<ListProbe fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("后端错误"));
  });
});

describe("useSingle", () => {
  it("loads a single entity and refreshes it", async () => {
    const user = userEvent.setup();
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ name: "first" })
      .mockResolvedValueOnce({ name: "second" });

    render(<SingleProbe fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("first"));
    await user.click(screen.getByRole("button", { name: "refresh" }));
    await waitFor(() => expect(screen.getByTestId("name")).toHaveTextContent("second"));
  });

  it("shows generic errors for unknown failures", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network"));

    render(<SingleProbe fetcher={fetcher} />);

    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("加载失败"));
  });
});
