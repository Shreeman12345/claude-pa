import { z } from "zod";

const SYSTEM_PROMPT = `Assess this study document. Return JSON only:
{ "summary": "2-3 sentences on what this covers",
  "difficulty": "light" | "moderate" | "heavy",
  "estimated_hours": number }
Do not explain the content — only assess scope and difficulty.`;

const assessmentSchema = z.object({
  summary: z.string(),
  difficulty: z.enum(["light", "moderate", "heavy"]),
  estimated_hours: z.number(),
});

export type DocumentAssessment = z.infer<typeof assessmentSchema>;

async function callAnthropic(content: unknown): Promise<DocumentAssessment | null> {
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
        messages: [{ role: "user", content }],
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

    return assessmentSchema.parse(JSON.parse(rawText));
  } catch (err) {
    console.error("Document assessment failed:", err);
    return null;
  }
}

export async function assessTextDocument(text: string): Promise<DocumentAssessment | null> {
  return callAnthropic(text);
}

export async function assessImageDocument(
  base64: string,
  mediaType: string
): Promise<DocumentAssessment | null> {
  return callAnthropic([
    {
      type: "image",
      source: { type: "base64", media_type: mediaType, data: base64 },
    },
    { type: "text", text: "Assess this study document." },
  ]);
}
