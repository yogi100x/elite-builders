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

function emailTemplate(title: string, body: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
    <div style="background: white; border-radius: 8px; padding: 32px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #2563EB; font-size: 24px; margin: 0;">EliteBuilders</h1>
        </div>
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px;">${title}</h2>
        ${body}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            EliteBuilders — Build. Ship. Get Recognized.
        </p>
    </div>
</body>
</html>`;
}

export async function sendAwardEmail(
    to: string,
    name: string,
    badgeName: string,
    feedback: string,
    score: number,
): Promise<void> {
    const body = `
        <p style="color: #374151;">Hi ${name},</p>
        <p style="color: #374151;">Congratulations! Your submission has been reviewed and awarded.</p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #166534;">
                <strong>Badge:</strong> ${badgeName}<br>
                <strong>Score:</strong> ${score}/100
            </p>
        </div>
        <p style="color: #374151;"><strong>Judge Feedback:</strong></p>
        <p style="color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 4px;">${feedback}</p>
        <p style="color: #374151;">Keep building!</p>
    `;
    await sendEmail(to, `Badge Awarded: ${badgeName}`, emailTemplate("You earned a badge!", body));
}

export async function sendRejectionEmail(to: string, name: string, feedback: string): Promise<void> {
    const body = `
        <p style="color: #374151;">Hi ${name},</p>
        <p style="color: #374151;">Thank you for participating in EliteBuilders. Your submission has been reviewed.</p>
        <p style="color: #374151;"><strong>Judge Feedback:</strong></p>
        <p style="color: #6b7280; background: #f9fafb; padding: 12px; border-radius: 4px;">${feedback}</p>
        <p style="color: #374151;">Keep building — the next challenge is waiting for you!</p>
    `;
    await sendEmail(to, "Your EliteBuilders submission has been reviewed", emailTemplate("Submission Review", body));
}

export async function sendSponsorInterestEmail(
    to: string,
    candidateName: string,
    sponsorOrgName: string,
    message: string,
): Promise<void> {
    const body = `
        <p style="color: #374151;">Hi ${candidateName},</p>
        <p style="color: #374151;">Great news! <strong>${sponsorOrgName}</strong> is interested in your submission.</p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
                <strong>Their message:</strong> "${message}"
            </p>
        </div>
        <p style="color: #374151;">Log in to your dashboard to respond.</p>
    `;
    await sendEmail(to, `${sponsorOrgName} is interested in your work!`, emailTemplate("Sponsor Interest", body));
}

export async function sendScoringEmail(
    to: string,
    name: string,
    challengeTitle: string,
    provisionalScore: number,
): Promise<void> {
    const body = `
        <p style="color: #374151;">Hi ${name},</p>
        <p style="color: #374151;">Your submission for <strong>${challengeTitle}</strong> has been automatically scored.</p>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
                <strong>Provisional AI Score:</strong> ${provisionalScore}/100
            </p>
        </div>
        <p style="color: #374151;">A human judge will review your submission next. You'll be notified when the final review is complete.</p>
        <p style="color: #374151;">Keep building!</p>
    `;
    await sendEmail(to, `AI Score Ready: ${provisionalScore}/100 — ${challengeTitle}`, emailTemplate("AI Scoring Complete", body));
}

export async function sendWeeklyDigestEmail(
    to: string,
    name: string,
    newChallenges: number,
    newBadges: number,
    leaderboardRank: number | null,
): Promise<void> {
    const body = `
        <p style="color: #374151;">Hi ${name},</p>
        <p style="color: #374151;">Here's your weekly EliteBuilders digest:</p>
        <ul style="color: #374151;">
            <li><strong>${newChallenges}</strong> new challenge${newChallenges !== 1 ? "s" : ""} posted this week</li>
            <li><strong>${newBadges}</strong> badge${newBadges !== 1 ? "s" : ""} earned this week</li>
            ${leaderboardRank ? `<li>Current leaderboard rank: <strong>#${leaderboardRank}</strong></li>` : ""}
        </ul>
        <p style="color: #374151;">Keep building!</p>
    `;
    await sendEmail(to, "Your Weekly EliteBuilders Digest", emailTemplate("Weekly Digest", body));
}
