import { LoginForm } from "@/components/clavis/login-form";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "Lien invalide ou expiré. Redemande un nouveau lien magique.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialError = params.error ? ERROR_MESSAGES[params.error] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginForm initialError={initialError} />
    </main>
  );
}
