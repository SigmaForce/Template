import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="authentication-page">
      <SignIn path="/sign-in" routing="path" />
    </main>
  );
}
