"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import FullLogo from "@/components/FullLogo";
import AuthBackdrop from "@/components/AuthBackdrop";
import BlurText from "@/components/reactbits/BlurText";
import StarBorder from "@/components/reactbits/StarBorder";
import FormField from "@/components/FormField";

export default function ForgotPasswordPage() {
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setEmailError(undefined);
    setFormError(null);

    const email = String(new FormData(e.currentTarget).get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      setEmailError("Email address is required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setFormError(error.message);
        return;
      }

      setSent(true);
    } catch {
      setFormError(
        "We couldn't send the reset email right now. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
      <AuthBackdrop />
      <FullLogo className="mb-2" size="w-56 sm:w-80" />

      <div className="card w-full max-w-md p-6 sm:p-8">
        <BlurText
          text="Reset your password"
          className="text-xl font-semibold text-slate-900"
          animateBy="letters"
          delay={30}
        />

        {sent ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If an account exists for that email, we sent a password reset
              link. Check your inbox and spam folder.
            </p>
            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              Return to login
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Enter your account email and we&apos;ll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <FormField
                label="Email"
                name="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                error={emailError}
              />

              {formError && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700"
                >
                  {formError}
                </div>
              )}

              <StarBorder
                type="submit"
                disabled={loading}
                aria-busy={loading}
                className="w-full"
              >
                {loading ? "Sending…" : "Send reset link"}
              </StarBorder>
            </form>

            <Link
              href="/login"
              className="mt-6 block text-center text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              Return to login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
