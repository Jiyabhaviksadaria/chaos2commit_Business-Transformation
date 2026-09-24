import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ sendMail: vi.fn() }))
vi.mock("@/lib/mail/mailer", () => ({ sendMail: mocks.sendMail }))

import { sendDeploymentFailureEmail } from "@/lib/mail/templates/deployment-failure"
import { sendDeploymentSuccessEmail } from "@/lib/mail/templates/deployment-success"
import { sendPasswordChangedEmail } from "@/lib/mail/templates/password-changed"
import { sendPasswordResetEmail } from "@/lib/mail/templates/password-reset"
import { sendVerificationEmail } from "@/lib/mail/templates/verification"

describe("authentication email branding", () => {
  beforeEach(() => {
    mocks.sendMail.mockReset()
    mocks.sendMail.mockResolvedValue(true)
  })

  it("uses Intelly AI in every authentication/deployment email", async () => {
    await sendVerificationEmail("Jiya", "jiya@example.com", "a".repeat(32))
    await sendPasswordResetEmail("Jiya", "jiya@example.com", "b".repeat(32))
    await sendPasswordChangedEmail("Jiya", "jiya@example.com")
    await sendDeploymentSuccessEmail("Jiya", "jiya@example.com", "Demo", "https://demo.example.com")
    await sendDeploymentFailureEmail("Jiya", "jiya@example.com", "Demo", "project-1")

    expect(mocks.sendMail).toHaveBeenCalledTimes(5)
    for (const [options] of mocks.sendMail.mock.calls) {
      const content = `${options.subject}\n${options.html}\n${options.text}`
      expect(content).toContain("Intelly AI")
      expect(content).not.toContain("Business Transformation AI")
    }
  })
})
