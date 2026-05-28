import { LoginForm } from "./LoginForm";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = resolvedSearchParams?.next || "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-bloom-canvas px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-bloom-border bg-bloom-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="font-display text-3xl text-bloom-ink">Bloom</p>
          <p className="mt-1 text-sm text-bloom-muted">Acceso para el equipo</p>
        </div>

        <LoginForm nextPath={nextPath} />
      </div>
    </main>
  );
}
