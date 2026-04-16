import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";
import Loader from "./loader";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { authClient } from "@/lib/auth-client";

export default function SignUpForm({
  onSwitchToSignIn,
  embedded = false,
  allowRegistration = true,
  isInitialAdminSetup = false,
}: {
  onSwitchToSignIn?: () => void;
  embedded?: boolean;
  allowRegistration?: boolean;
  isInitialAdminSetup?: boolean;
}) {
  const navigate = useNavigate({
    from: "/",
  });
  const { isPending } = authClient.useSession();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      name: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          email: value.email,
          password: value.password,
          name: value.name,
        },
        {
          onSuccess: () => {
            navigate({
              to: "/",
            });
            toast.success("Cadastro realizado com sucesso");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z
        .object({
          name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
          email: z.email("Email invalido"),
          password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres"),
          confirmPassword: z.string().min(8, "Confirme a senha"),
        })
        .refine((value) => value.password === value.confirmPassword, {
          message: "As senhas nao coincidem",
          path: ["confirmPassword"],
        }),
    },
  });

  if (isPending) {
    return <Loader />;
  }

  return (
    <div className={embedded ? "w-full" : "mx-auto mt-10 w-full max-w-md"}>
      {!allowRegistration ? (
        <div className="space-y-3 text-center">
          <p className="text-sm font-medium">O cadastro inicial já foi concluído.</p>
          <p className="text-muted-foreground text-sm">
            A partir de agora, novos acessos devem entrar com uma conta já existente.
          </p>
          {onSwitchToSignIn ? (
            <Button variant="outline" onClick={onSwitchToSignIn}>
              Ir para login
            </Button>
          ) : null}
        </div>
      ) : null}
      {allowRegistration ? (
        <>
      {!embedded ? (
        <div className="mb-6 space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isInitialAdminSetup ? "Criar admin" : "Criar conta"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isInitialAdminSetup
              ? "Cadastre a conta administrativa inicial para liberar o acesso a plataforma."
              : "Cadastre um usuario para acessar o painel operacional."}
          </p>
        </div>
      ) : null}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-4"
      >
        <div>
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Nome</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={isInitialAdminSetup ? "Nome do administrador" : "Seu nome"}
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="voce@empresa.com"
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Senha</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Minimo de 8 caracteres"
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <div>
          <form.Field name="confirmPassword">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Confirmar senha</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="Repita a senha"
                />
                {field.state.meta.errors.map((error, index) => (
                  <p key={index} className="text-destructive text-xs">
                    {error?.message}
                  </p>
                ))}
              </div>
            )}
          </form.Field>
        </div>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {(state) => (
            <Button
              type="submit"
              className="w-full"
              disabled={!state.canSubmit || state.isSubmitting}
            >
              {state.isSubmitting
                ? isInitialAdminSetup
                  ? "Criando admin..."
                  : "Criando conta..."
                : isInitialAdminSetup
                  ? "Criar admin"
                  : "Criar conta"}
            </Button>
          )}
        </form.Subscribe>
      </form>

      {onSwitchToSignIn ? (
        <div className="mt-4 text-center">
          <Button variant="link" onClick={onSwitchToSignIn} className="px-0">
            Ja tem conta? Entrar
          </Button>
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
