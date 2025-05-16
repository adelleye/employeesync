import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SignUpForm } from "../SignUpForm";

jest.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      signUp: jest.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe("SignUpForm", () => {
  it("redirects to /auth/check-email after successful sign-up", async () => {
    render(<SignUpForm />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign up/i }));
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/check-email");
    });
  });
});
