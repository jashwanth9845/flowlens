import { redirect } from "next/navigation";
import { auth, authOptions } from "@/lib/server/auth";
import { SignInPanel } from "@/components/app/sign-in-panel";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/app");
  }

  const providers = authOptions.providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
  }));

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <SignInPanel providers={providers} />
    </main>
  );
}
