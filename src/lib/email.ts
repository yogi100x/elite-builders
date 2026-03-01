import { Resend } from "resend"

// WHY: Resend client initialized inside function — not at module scope
// Module-scope initialization fails in edge runtime / Convex actions
export function createResendClient() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
        console.warn("[email] RESEND_API_KEY not set — emails will be logged only")
        return null
    }
    return new Resend(apiKey)
}

export async function sendAwardEmail(to: string, name: string, badgeName: string, feedback: string, score: number) {
    const resend = createResendClient()
    if (!resend) {
        console.log(`[email stub] Award email to ${to}: ${badgeName} badge, score ${score}/100`)
        return
    }

    await resend.emails.send({
        from: "EliteBuilders <noreply@elitebuilders.com>",
        to,
        subject: `🏆 You earned the "${badgeName}" badge on EliteBuilders!`,
        html: `
      <h2>Congratulations, ${name}!</h2>
      <p>Your submission was reviewed and you earned the <strong>${badgeName}</strong> badge.</p>
      <p><strong>Score:</strong> ${score}/100</p>
      <p><strong>Judge feedback:</strong></p>
      <blockquote>${feedback}</blockquote>
      <p><a href="https://elitebuilders.com/dashboard">View your dashboard →</a></p>
    `,
    })
}

export async function sendRejectionEmail(to: string, name: string, feedback: string) {
    const resend = createResendClient()
    if (!resend) {
        console.log(`[email stub] Rejection email to ${to}`)
        return
    }

    await resend.emails.send({
        from: "EliteBuilders <noreply@elitebuilders.com>",
        to,
        subject: "Your EliteBuilders submission has been reviewed",
        html: `
      <h2>Hi ${name},</h2>
      <p>Thank you for participating in EliteBuilders. Your submission has been reviewed.</p>
      <p><strong>Judge feedback:</strong></p>
      <blockquote>${feedback}</blockquote>
      <p>Keep building — the next challenge is waiting for you.</p>
      <p><a href="https://elitebuilders.com/challenges">Browse challenges →</a></p>
    `,
    })
}
