import { z } from "zod";

const SYSTEM_PROMPT = `You help someone stay on top of exam prep. Apply 80/20 thinking: identify what genuinely matters most for the score, not everything.

Return JSON only:
{ "should_nudge": true | false,
  "message": "the Telegram message to send, or null if should_nudge is false" }

Only nudge if there's something genuinely worth their attention today — the total workload versus time remaining warrants starting, a deadline is approaching, or they haven't been nudged in a while and should be. Don't nudge daily out of habit. Keep messages short, specific, and friendly — mention actual documents and hours, not vague encouragement.`;

const nudgeDecisionSchema = z.object({
  should_nudge: z.boolean(),
  message: z.string().nullable(),
});

export type NudgeDecision = z.infer<typeof nudgeDecisionSchema>;

const FALLBACK: NudgeDecision = { should_nudge: false, message: null };

export async function reasonAboutExam(context: {
  exam: {
    subject: string;
    exam_date: string;
    days_remaining: number;
    portions: string | null;
    scoring_breakdown: string | null;
  };
  documents: {
    file_name: string;
    doc_type: string;
    summary: string | null;
    difficulty: string | null;
    estimated_hours: number | null;
  }[];
  recentNudges: { message_sent: string | null; sent_at: string }[];
}): Promise<NudgeDecision> {
  const userContent = JSON.stringify(context, null, 2);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const rawText = data.content?.[0]?.text;
    if (typeof rawText !== "string") {
      throw new Error("No text content in Anthropic response");
    }

    return nudgeDecisionSchema.parse(JSON.parse(rawText));
  } catch (err) {
    console.error("Exam reasoning failed:", err);
    return FALLBACK;
  }
}
