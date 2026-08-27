import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activeProvider, requestPasswordReset, signIn, signUp } from "@/lib/auth";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "recover";

export default function Auth() {
  const { user, userLoading, refreshUser } = useWorkspace();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Where to land once the session exists. New accounts go to Spaces so the first
  // thing they see is "create your first Space"; returning users go to My Day.
  const [destination, setDestination] = useState("/dashboard/my-day");

  if (!userLoading && user) return <Navigate to={destination} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "recover") {
        toast.success(await requestPasswordReset(email));
        setMode("signin");
      } else {
        if (mode === "signup") {
          await signUp(name, email, password);
          setDestination("/dashboard/spaces");
        } else {
          await signIn(email, password);
          setDestination("/dashboard/my-day");
        }
        await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        refreshUser();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-2" data-testid="auth-page">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-sidebar p-12 lg:flex">
        <div
          className="pointer-events-none absolute -left-24 top-10 size-[420px] rounded-full blur-[120px]"
          style={{ background: "color-mix(in oklab, var(--primary) 30%, transparent)" }}
        />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-5" />
          </span>
          <span className="font-heading text-lg font-semibold">Notevoro</span>
        </div>
        <div className="relative max-w-md">
          <h2 className="font-heading text-4xl font-semibold leading-[1.1]">
            One person. One Notevoro. Multiple Spaces.
          </h2>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            A unified knowledge, productivity and AI workspace. Organise university, freelance work,
            a startup or your personal life into Spaces — each with its own tasks, calendar,
            Knowledge and a Voro assistant that understands the context.
          </p>
        </div>
        <p className="relative text-xs text-muted-foreground">
          Local-first: your workspace data lives in your browser. Auth provider:{" "}
          <span className="text-foreground">{activeProvider()}</span>
        </p>
      </section>

      <section className="flex items-center justify-center p-8">
        <form
          onSubmit={submit}
          className="nv-panel w-full max-w-[380px] animate-fade-up rounded-2xl p-7"
          data-testid="auth-form"
        >
          <h1 className="font-heading text-2xl font-semibold">
            {mode === "signup" ? "Create your account" : mode === "signin" ? "Welcome back" : "Reset password"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Then create your first Space — it takes one step."
              : mode === "signin"
                ? "Sign in to your Spaces."
                : "We'll look up your account by email."}
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {mode === "signup" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  data-testid="auth-name-input"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                data-testid="auth-email-input"
              />
            </div>
            {mode !== "recover" && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  data-testid="auth-password-input"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={busy} data-testid="auth-submit-button">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send recovery link"}
          </Button>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              data-testid="auth-toggle-mode-button"
            >
              {mode === "signup" ? "I already have an account" : "Create an account"}
            </button>
            <button
              type="button"
              className={cn(
                "text-muted-foreground transition-colors hover:text-foreground",
                mode === "recover" && "hidden",
              )}
              onClick={() => setMode("recover")}
              data-testid="auth-forgot-password-button"
            >
              Forgot password?
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
