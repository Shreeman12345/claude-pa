import { dayKey } from "@/lib/schedule/datetime";
import { z } from "zod";
import { SUBJECTS } from "@/lib/router/classifyDocument";

const examInfoSchema = z.object({
  is_exam_info: z.boolean(),
  subject: z.enum(SUBJECTS).nullable(),
  exam_date: z.string().nullable(),
  portions: z.string().nullable(),
  scoring_breakdown: z.string().nullable(),
});

export type ExamInfo = z.infer<typeof examInfoSchema>;

const FALLBACK: ExamInfo = {
  is_exam_info: false,
  subject: null,
  exam_date: null,
  portions: null,
  scoring_breakdown: null,
};

export async function classifyExamInfo(text: string): Promise<ExamInfo> {
  const today = dayKey(new Date());

  const systemPrompt = `Today's date is ${today}.

Determine whether this message describes exam information (a date, portions/coverage, or scoring breakdown) for one of these subjects: Railway, DSP, MOOC, LIC, Microwave, EngEcon, Entrepreneurship.

Return JSON only:
{
  "is_exam_info": boolean,
  "subject": "Railway" | "DSP" | "MOOC" | "LIC" | "Microwave" | "EngEcon" | "Entrepreneurship" | null,
  "exam_date": "YYYY-MM-DD" | null,
  "portions": string | null,
  "scoring_breakdown": string | null
}

Rules:
- is_exam_info is true only if the message is about an exam date, portions/coverage, or scoring for one of the listed subjects.
- subject must be exactly one of the listed values, or null if unclear.
- exam_date must be resolved to an absolute YYYY-MM-DD date if a date or relative date ("next Friday", "in two weeks") is mentioned, using today's date as the reference. Otherwise null.
- portions is the syllabus/coverage described, verbatim or lightly summarized, or null if not mentioned.
- scoring_breakdown is how the exam is scored/weighted, or null if not mentioned.
- Never invent a date, subject, portions, or scoring info that wasn't stated or clearly implied.`;

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
        system: systemPrompt,
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
    return examInfoSchema.parse(parsed);
  } catch (err) {
    console.error("Exam info classification failed:", err);
    return FALLBACK;
  }
}
