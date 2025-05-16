import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          We've sent you a confirmation link. Please check your email to
          complete your registration before signing in.
        </p>
        <Link href="/auth/signin">
          <Button variant="outline" className="mt-6">
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  );
}
