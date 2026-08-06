import { z } from "zod";
import { SUBJECTS } from "@/lib/router/classifyDocument";

const scheduleFallbackSchema = z.object({
  is_schedule_item: z.boolean(),
  kind: z.enum(["class", "event", "reminder", "deadline"]).nullable(),
  title: z.string().nullable(),
  location: z.string().nullable(),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
  recurrence: z.enum(["daily", "weekly", "monthly", "yearly"]).nullable(),
  recurrence_days: z.string().nullable(),
  subject: z.enum(SUBJECTS).nullable(),
  time_specificity: z.enum(["specific", "vague", "none"]),
});

export type ScheduleFallback = z.infer<typeof scheduleFallbackSchema>;

const FALLBACK: ScheduleFallback = {
  is_schedule_item: false,
  kind: null,
  title: null,
  location: null,
  starts_at: null,
  ends_at: null,
  recurrence: null,
  recurrence_days: null,
  subject: null,
  time_specificity: "none",
};

export async function classifyScheduleFallback(text: string): Promise<ScheduleFallback> {
  const now = new Date().toISOString();

  const systemPrompt = `The current date and time is ${now} (ISO 8601, UTC).

Determine whether this message describes something to schedule: a class, event, reminder, or deadline.

Return JSON only:
{
  "is_schedule_item": boolean,
  "kind": "class" | "event" | "reminder" | "deadline" | null,
  "title": string | null,
  "location": string | null,
  "starts_at": "YYYY-MM-DDTHH:mm:ssZ" | null,
  "ends_at": "YYYY-MM-DDTHH:mm:ssZ" | null,
  "recurrence": "daily" | "weekly" | "monthly" | "yearly" | null,
  "recurrence_days": string | null,
  "subject": "Railway" | "DSP" | "MOOC" | "LIC" | "Microwave" | "EngEcon" | "Entrepreneurship" | null,
  "time_specificity": "specific" | "vague" | "none"
}

Rules:
- is_schedule_item is true only if there's a clear thing to schedule.
- kind: "reminder" for general reminders ("remind me to..."), "deadline" for something due, "class" for a class session, "event" for meetings/social/other time-bound things. Default to "reminder" if ambiguous.
- title should be short and specific (what to do / what it's about), never include the raw date phrase.
- time_specificity is "specific" if the message names an actual clock time or a specific day (e.g. "3pm", "monday", "tomorrow at 5", "the 12th"). It is "vague" if only a loose reference is given (e.g. "next week", "soon", "this month"). It is "none" if there's no time reference at all.
- starts_at must still be your best-resolved absolute UTC timestamp even when time_specificity is "vague" (e.g. resolve "next week" to a reasonable date next week) — pick a sensible default time of day if none is stated. Only leave starts_at null when time_specificity is "none".
- recurrence_days, if the message implies specific weekdays (e.g. "every Monday and Wednesday"), should be a lowercase comma-separated list using 3-letter abbreviations, e.g. "mon,wed". Otherwise null.
- subject should only be set if the message clearly references one of the listed subjects.
- Never invent a title, location, or date that wasn't stated or clearly implied.`;

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

    return scheduleFallbackSchema.parse(JSON.parse(rawText));
  } catch (err) {
    console.error("Schedule fallback classification failed:", err);
    return FALLBACK;
  }
}
