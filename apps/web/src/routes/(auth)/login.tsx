import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPageLayout } from "@/components/auth-page-layout";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/(auth)/login")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (session.data) {
      redirect({
        to: "/",
        throw: true,
      });
    }
  },
  component: Login,
});

function Login() {
  return <AuthPageLayout defaultTab="sign-in" />;
}
