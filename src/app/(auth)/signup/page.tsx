"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signup } from "./actions";
import FullLogo from "@/components/FullLogo";
import AuthBackdrop from "@/components/AuthBackdrop";
import BlurText from "@/components/reactbits/BlurText";
import StarBorder from "@/components/reactbits/StarBorder";
import FormField from "@/components/FormField";

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  orgName?: string;
  orgCity?: string;
}

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<"hr" | "tp">("tp");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(
    fullName: string,
    email: string,
    password: string,
    orgName: string,
  ): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Full name is required.";
    } else if (fullName.trim().length < 2) {
      nextErrors.fullName = "Enter your full name.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (!orgName.trim()) {
      nextErrors.orgName =
        role === "hr"
          ? "Company name is required."
          : "College name is required.";
    }


    return nextErrors;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setErrors({});
    setFormError(null);

    const formData = new FormData(e.currentTarget);

    const fullName = String(formData.get("fullName") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const orgName = String(formData.get("orgName") ?? "");

    const validationErrors = validate(
      fullName,
      email,
      password,
      orgName,
    );

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const result = await signup(formData);

      if (!result.success) {
        setFormError(
          result.error ?? "We couldn't create your account. Please try again.",
        );
        return;
      }

      const supabase = createClient();

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        router.push("/login");
        return;
      }

      router.push("/pending");
      router.refresh();
    } catch {
      setFormError(
        "We couldn't create your account right now. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleRoleChange(nextRole: "hr" | "tp") {
    if (loading) return;

    setRole(nextRole);
    setErrors({});
    setFormError(null);
  }

  return (
    <div className="auth-page relative flex flex-col">
      <AuthBackdrop />

      <FullLogo className="auth-logo mb-1" size="" />

      <div className="card w-full max-w-md p-6 sm:p-8">
        <BlurText
          text="Create your account"
          className="text-xl font-semibold text-slate-900"
          animateBy="words"
          delay={80}
        />

        <p className="mt-1 text-sm leading-5 text-slate-500">
          Invite-only portal for verified company HR and college T&amp;P
          teams.
        </p>

        {/* Account type */}
        <div
          role="group"
          aria-label="Account type"
          className="mt-6 grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1"
        >
          <button
            type="button"
            aria-pressed={role === "tp"}
            disabled={loading}
            onClick={() => handleRoleChange("tp")}
            className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${
              role === "tp"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            T&amp;P Officer
          </button>

          <button
            type="button"
            aria-pressed={role === "hr"}
            disabled={loading}
            onClick={() => handleRoleChange("hr")}
            className={`min-h-11 rounded-md px-3 text-sm font-semibold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 ${
              role === "hr"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Company HR
          </button>
        </div>

        <p className="mt-2 text-xs leading-4 text-slate-500">
          {role === "hr"
            ? "Register as a company representative to post opportunities and connect with colleges."
            : "Register as a college T&P representative to discover opportunities and coordinate placements."}
        </p>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 space-y-4"
        >
          <input type="hidden" name="role" value={role} />

          <FormField
            label="Full name"
            name="fullName"
            placeholder="Enter your full name"
            autoComplete="name"
            required
            error={errors.fullName}
          />

          <FormField
            label={
              role === "hr"
                ? "Official company email"
                : "Official college email"
            }
            name="email"
            type="email"
            placeholder={
              role === "hr" ? "you@company.com" : "you@college.edu"
            }
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            error={errors.email}
            helperText={
              role === "hr"
                ? "Use your company email when possible."
                : "Use your official college email when possible."
            }
          />

          <FormField
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            required
            minLength={8}
            error={errors.password}
            helperText="Use at least 8 characters."
          />

          <FormField
            label={role === "hr" ? "Company name" : "College name"}
            name="orgName"
            placeholder={
              role === "hr"
                ? "Enter your company name"
                : "Enter your college name"
            }
            autoComplete="organization"
            required
            error={errors.orgName}
          />

          {role === "tp" && (
            <FormField
              label="City"
              name="orgCity"
              placeholder="e.g. Mumbai"
              autoComplete="address-level2"
              error={errors.orgCity}
            />
          )}

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
            {loading ? "Creating account…" : "Create account"}
          </StarBorder>
        </form>
      </div>

      <p className="mt-5 px-4 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}