import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendMessage } from "@/lib/telegram/api";
import { summarizeDocument } from "@/lib/study/summarizeDocument";
import { reasonAboutExam } from "@/lib/study/reasonAboutExam";

const RELEVANT_DOC_TYPES = ["notes", "assignment", "pyq", "lab"];

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse(null, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: exams, error: examsError } = await supabaseAdmin
    .from("exams")
    .select("*")
    .gte("exam_date", today);

  if (examsError || !exams) {
    console.error("Failed to fetch exams:", examsError);
    return NextResponse.json({ examsChecked: 0, docsSummarized: 0, nudgesSent: 0 });
  }

  let docsSummarized = 0;
  let nudgesSent = 0;

  for (const exam of exams) {
    const { data: documents, error: docsError } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("subject", exam.subject)
      .in("doc_type", RELEVANT_DOC_TYPES);

    if (docsError || !documents) {
      console.error(`Failed to fetch documents for ${exam.subject}:`, docsError);
      continue;
    }

    for (const doc of documents) {
      if (doc.summary !== null) continue;

      const success = await summarizeDocument(doc);
      if (success) {
        docsSummarized++;
        const { data: updated } = await supabaseAdmin
          .from("documents")
          .select("*")
          .eq("id", doc.id)
          .single();
        if (updated) Object.assign(doc, updated);
      }
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentNudges } = await supabaseAdmin
      .from("study_nudges")
      .select("message_sent, sent_at")
      .eq("exam_id", exam.id)
      .gte("sent_at", sevenDaysAgo);

    const daysRemaining = Math.ceil(
      (new Date(exam.exam_date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    const decision = await reasonAboutExam({
      exam: {
        subject: exam.subject,
        exam_date: exam.exam_date,
        days_remaining: daysRemaining,
        portions: exam.portions,
        scoring_breakdown: exam.scoring_breakdown,
      },
      documents: documents.map((d) => ({
        file_name: d.file_name,
        doc_type: d.doc_type,
        summary: d.summary,
        difficulty: d.difficulty,
        estimated_hours: d.estimated_hours,
      })),
      recentNudges: recentNudges ?? [],
    });

    if (decision.should_nudge && decision.message) {
      await sendMessage(process.env.TELEGRAM_USER_ID!, decision.message);
      await supabaseAdmin.from("study_nudges").insert({
        exam_id: exam.id,
        message_sent: decision.message,
      });
      nudgesSent++;
    }
  }

  return NextResponse.json({
    examsChecked: exams.length,
    docsSummarized,
    nudgesSent,
  });
}
