import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./auth";

const mocks = vi.hoisted(() => {
  class MockAPIError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
    ) {
      super(message);
    }
  }
  return {
    APIError: MockAPIError,
    api: {
      me: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    },
    clearTokens: vi.fn(),
  };
});

vi.mock("./api", () => ({
  APIError: mocks.APIError,
  api: mocks.api,
  clearTokens: mocks.clearTokens,
}));

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="status">{auth.status}</div>
      <div data-testid="name">{auth.user?.name ?? "none"}</div>
      <button onClick={() => void auth.login("root", "pw")}>login</button>
      <button onClick={() => void auth.logout()}>logout</button>
      <button onClick={() => void auth.refreshMe()}>refresh</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mocks.api.me.mockReset();
    mocks.api.login.mockReset();
    mocks.api.logout.mockReset();
    mocks.clearTokens.mockReset();
  });

  it("restores an authenticated user on mount", async () => {
    mocks.api.me.mockResolvedValue({ id: "u_1", tenantId: "global", name: "Root", role: "sysadmin", status: "active" });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("name")).toHaveTextContent("Root");
  });

  it("becomes anonymous and clears tokens on 401 restore failure", async () => {
    mocks.api.me.mockRejectedValue(new mocks.APIError("AUTH_INVALID_CREDENTIALS", "invalid", 401));

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(mocks.clearTokens).toHaveBeenCalled();
  });

  it("login and logout update context state", async () => {
    const user = userEvent.setup();
    mocks.api.me.mockRejectedValue(new mocks.APIError("AUTH_INVALID_CREDENTIALS", "invalid", 401));
    mocks.api.login.mockResolvedValue({ id: "u_2", tenantId: "t_1", name: "Alice", role: "family", status: "active" });
    mocks.api.logout.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    await user.click(screen.getByRole("button", { name: "login" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("authenticated"));
    expect(screen.getByTestId("name")).toHaveTextContent("Alice");

    await user.click(screen.getByRole("button", { name: "logout" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("anonymous"));
    expect(screen.getByTestId("name")).toHaveTextContent("none");
  });
});
