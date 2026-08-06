import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { ExamInfo } from "@/lib/router/classifyExam";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function routeExamInfo(info: ExamInfo): Promise<string> {
  const subject = info.subject!;
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabaseAdmin
    .from("exams")
    .select("*")
    .eq("subject", subject)
    .gte("exam_date", today)
    .order("exam_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (info.exam_date) update.exam_date = info.exam_date;
    if (info.portions) update.portions = info.portions;
    if (info.scoring_breakdown) update.scoring_breakdown = info.scoring_breakdown;

    await supabaseAdmin.from("exams").update(update).eq("id", existing.id);

    const finalDate = info.exam_date ?? existing.exam_date;
    return `Got it — ${subject} exam on ${formatDate(finalDate)}, updated.`;
  }

  if (!info.exam_date) {
    return `Got it — noted for ${subject}, but I still need a date to create an exam entry.`;
  }

  await supabaseAdmin.from("exams").insert({
    subject,
    exam_date: info.exam_date,
    portions: info.portions,
    scoring_breakdown: info.scoring_breakdown,
  });

  return `Got it — ${subject} exam on ${formatDate(info.exam_date)}, noted.`;
}
