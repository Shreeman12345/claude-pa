import { z } from "zod";

const SYSTEM_PROMPT = `You classify a personal capture into exactly one of: task, journal, expense, decision.

Return JSON only:
{
  "kind": "task" | "journal" | "expense" | "decision",
  "confidence": "high" | "low",
  "reasoning": "one sentence, only meaningful when confidence is low",
  "fields": {
    // task:     { "title": str, "urgency": "today"|"week"|"month"|"someday" }
    // journal:  { "text": str, "mood": str | null }
    // expense:  { "amount": number, "currency": str, "merchant_or_category": str, "note": str | null }
    // decision: { "what_was_decided": str, "context": str }
  }
}

Rules:
- Default urgency to "week" if no time pressure is stated or implied.
- confidence is "low" only when the capture could plausibly be filed two different ways. Most captures should be "high".
- Never invent an entity, amount, or date that wasn't stated or clearly implied.`;

const taskFields = z.object({
  title: z.string(),
  urgency: z.enum(["today", "week", "month", "someday"]),
});

const journalFields = z.object({
  text: z.string(),
  mood: z.string().nullable(),
});

const expenseFields = z.object({
  amount: z.number(),
  currency: z.string(),
  merchant_or_category: z.string(),
  note: z.string().nullable(),
});

const decisionFields = z.object({
  what_was_decided: z.string(),
  context: z.string(),
});

const classificationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("task"),
    confidence: z.enum(["high", "low"]),
    reasoning: z.string(),
    fields: taskFields,
  }),
  z.object({
    kind: z.literal("journal"),
    confidence: z.enum(["high", "low"]),
    reasoning: z.string(),
    fields: journalFields,
  }),
  z.object({
    kind: z.literal("expense"),
    confidence: z.enum(["high", "low"]),
    reasoning: z.string(),
    fields: expenseFields,
  }),
  z.object({
    kind: z.literal("decision"),
    confidence: z.enum(["high", "low"]),
    reasoning: z.string(),
    fields: decisionFields,
  }),
]);

export type Classification = z.infer<typeof classificationSchema>;

type ClassificationFailure = { kind: null; confidence: "low" };

export async function classify(
  text: string
): Promise<Classification | ClassificationFailure> {
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
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
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

    const parsed = JSON.parse(rawText);
    return classificationSchema.parse(parsed);
  } catch (err) {
    console.error("Classification failed:", err);
    return { kind: null, confidence: "low" };
  }
}
