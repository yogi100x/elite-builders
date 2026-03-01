/**
 * Email helpers for the Convex runtime.
 * Uses Resend REST API via fetch() — no SDK import needed.
 * Falls back to console logging when RESEND_API_KEY is not set (demo mode).
 */

async function sendEmail(to: string, subject: string, html: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.log(`[email stub] To: ${to} | Subject: ${subject}`);
        return;
    }

    const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            from: "EliteBuilders <noreply@elitebuilders.com>",
            to,
            subject,
            html,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        console.error(`[email] Resend API error: ${res.status} ${body}`);
    }
}

export async function sendAwardEmail(
    to: string,
    name: string,
    badgeName: string,
    feedback: string,
    score: number,
) {
    await sendEmail(
        to,
        `You earned the "${badgeName}" badge on EliteBuilders!`,
        `<h2>Congratulations, ${name}!</h2>
         <p>Your submission was reviewed and you earned the <strong>${badgeName}</strong> badge.</p>
         <p><strong>Score:</strong> ${score}/100</p>
         <p><strong>Judge feedback:</strong></p>
         <blockquote>${feedback}</blockquote>
         <p><a href="https://elitebuilders.com/dashboard">View your dashboard →</a></p>`,
    );
}

export async function sendRejectionEmail(to: string, name: string, feedback: string) {
    await sendEmail(
        to,
        "Your EliteBuilders submission has been reviewed",
        `<h2>Hi ${name},</h2>
         <p>Thank you for participating in EliteBuilders. Your submission has been reviewed.</p>
         <p><strong>Judge feedback:</strong></p>
         <blockquote>${feedback}</blockquote>
         <p>Keep building — the next challenge is waiting for you.</p>
         <p><a href="https://elitebuilders.com/challenges">Browse challenges →</a></p>`,
    );
}
