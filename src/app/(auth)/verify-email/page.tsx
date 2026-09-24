import { VerifyEmailForm } from "./verify-email-form"

export default function VerifyEmailPage({ searchParams }: { searchParams: { token?: string } }) {
  return <VerifyEmailForm initialToken={searchParams.token || ""} />
}
