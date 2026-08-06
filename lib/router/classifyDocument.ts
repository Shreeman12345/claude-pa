import { z } from "zod";

const SYSTEM_PROMPT = `You classify an uploaded document's subject and type based on its caption.

Return JSON only:
{
  "subject": "Railway" | "DSP" | "MOOC" | "LIC" | "Microwave" | "EngEcon" | "Entrepreneurship" | null,
  "doc_type": "assignment" | "deadline" | "notes" | "pyq" | "lab" | null,
  "confidence": "high" | "low"
}

Rules:
- subject must be exactly one of the listed values, or null if the caption doesn't clearly indicate a subject.
- doc_type must be exactly one of the listed values, or null if unclear.
- confidence is "low" if either subject or doc_type is null, or if the caption is ambiguous between two options. Otherwise "high".`;

export const SUBJECTS = [
  "Railway",
  "DSP",
  "MOOC",
  "LIC",
  "Microwave",
  "EngEcon",
  "Entrepreneurship",
] as const;

export const DOC_TYPES = [
  "assignment",
  "deadline",
  "notes",
  "pyq",
  "lab",
] as const;

const documentClassificationSchema = z.object({
  subject: z.enum(SUBJECTS).nullable(),
  doc_type: z.enum(DOC_TYPES).nullable(),
  confidence: z.enum(["high", "low"]),
});

export type DocumentClassification = z.infer<typeof documentClassificationSchema>;

const FALLBACK: DocumentClassification = {
  subject: null,
  doc_type: null,
  confidence: "low",
};

export async function classifyDocument(
  captionText: string
): Promise<DocumentClassification> {
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
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: captionText }],
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
    return documentClassificationSchema.parse(parsed);
  } catch (err) {
    console.error("Document classification failed:", err);
    return FALLBACK;
  }
}
