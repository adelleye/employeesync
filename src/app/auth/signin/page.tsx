import { SignInForm } from "@/components/auth/SignInForm";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <SignInForm />
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Don\'t have an account?
          <Link
            href="/auth/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 ml-1"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
