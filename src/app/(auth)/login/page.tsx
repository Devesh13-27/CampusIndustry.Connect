"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FullLogo from "@/components/FullLogo";
import AuthBackdrop from "@/components/AuthBackdrop";
import BlurText from "@/components/reactbits/BlurText";
import StarBorder from "@/components/reactbits/StarBorder";
import FormField from "@/components/FormField";

interface FieldErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setErrors({});
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const nextErrors: FieldErrors = {};

    if (!email) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFormError("Incorrect email or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setFormError(
        "We couldn't sign you in right now. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page relative flex flex-col">
      <AuthBackdrop />

      <FullLogo className="auth-logo mb-1" size="" />

      <div className="card w-full max-w-md p-6 sm:p-8">
        <BlurText
          text="Log in"
          className="text-xl font-semibold text-slate-900"
          animateBy="letters"
          delay={30}
        />

        <p className="mt-1 text-sm text-slate-500">
          Welcome back to CampusIndustry.Connect.
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
            error={errors.email}
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            error={errors.password}
          />

          <div className="-mt-2 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Forgot password?
            </Link>
          </div>

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
            {loading ? "Logging in…" : "Log in"}
          </StarBorder>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}