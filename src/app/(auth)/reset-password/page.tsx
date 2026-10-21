"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import FullLogo from "@/components/FullLogo";
import AuthBackdrop from "@/components/AuthBackdrop";
import BlurText from "@/components/reactbits/BlurText";
import StarBorder from "@/components/reactbits/StarBorder";
import FormField from "@/components/FormField";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setPasswordError(undefined);
    setFormError(null);

    const formData = new FormData(e.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmation) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(error.message);
        return;
      }

      setUpdated(true);
    } catch {
      setFormError(
        "We couldn't update your password right now. Please request a new reset link.",
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
          text="Choose a new password"
          className="text-xl font-semibold text-slate-900"
          animateBy="letters"
          delay={30}
        />

        {updated ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Your password has been updated successfully.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Continue to login
            </button>
          </>
        ) : !ready ? (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              This reset link is invalid or has expired. Request a new link to
              continue.
            </p>
            <Link
              href="/forgot-password"
              className="mt-6 block text-center text-sm font-medium text-blue-600 underline-offset-4 hover:text-blue-700 hover:underline"
            >
              Request a new reset link
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Your new password must be at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <FormField
                label="New password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                error={passwordError}
              />
              <FormField
                label="Confirm new password"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
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
                {loading ? "Updating…" : "Update password"}
              </StarBorder>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
