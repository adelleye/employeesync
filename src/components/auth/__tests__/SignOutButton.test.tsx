import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignOutButton } from "../SignOutButton";

jest.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("SignOutButton", () => {
  const originalLocation = window.location;
  beforeAll(() => {
    // @ts-ignore
    delete window.location;
    // @ts-ignore
    window.location = { assign: jest.fn() };
  });
  afterAll(() => {
    window.location = originalLocation;
  });

  it("redirects to /auth/signin after successful sign-out", async () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith("/auth/signin");
    });
  });
});
