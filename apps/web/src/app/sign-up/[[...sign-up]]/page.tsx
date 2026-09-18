import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="authentication-page">
      <SignUp path="/sign-up" routing="path" />
    </main>
  );
}
