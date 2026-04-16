import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPageLayout } from "@/components/auth-page-layout";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(auth)/signup")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      redirect({
        to: "/",
        throw: true,
      });
    }
  },
  component: SignUp,
});

function SignUp() {
  return <AuthPageLayout defaultTab="sign-up" />;
}
