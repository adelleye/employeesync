import { render, screen } from "@testing-library/react";
import DashboardPage from "../page";

jest.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: {
      getUser: jest
        .fn()
        .mockResolvedValue({
          data: { user: { email: "test@example.com" } },
          error: null,
        }),
    },
  }),
}));

describe("DashboardPage", () => {
  it("renders welcome message for authenticated user", async () => {
    // @ts-ignore
    const { findByText } = render(<DashboardPage />);
    expect(await findByText(/welcome to your dashboard/i)).toBeInTheDocument();
    expect(await findByText(/test@example.com/i)).toBeInTheDocument();
  });
});
