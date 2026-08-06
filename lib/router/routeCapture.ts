import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type CaptureKind = "task" | "journal" | "expense" | "decision";

const TABLE_BY_KIND: Record<CaptureKind, string> = {
  task: "tasks",
  journal: "journal_entries",
  expense: "expenses",
  decision: "decisions",
};

export function summarizeFields(kind: CaptureKind, fields: any): string {
  switch (kind) {
    case "task":
      return fields.title;
    case "journal":
      return fields.text;
    case "expense":
      return `${fields.amount} ${fields.currency} - ${fields.merchant_or_category}`;
    case "decision":
      return fields.what_was_decided;
  }
}

export function defaultFieldsFromRawText(kind: CaptureKind, rawText: string) {
  switch (kind) {
    case "task":
      return { title: rawText, urgency: "week" as const };
    case "journal":
      return { text: rawText, mood: null };
    case "expense":
      return {
        amount: 0,
        currency: "USD",
        merchant_or_category: null,
        note: rawText,
      };
    case "decision":
      return { what_was_decided: rawText, context: null };
  }
}

export async function routeCapture(
  captureId: string,
  kind: CaptureKind,
  fields: any
): Promise<void> {
  const table = TABLE_BY_KIND[kind];

  let insertPayload: Record<string, unknown>;
  switch (kind) {
    case "task":
      insertPayload = { title: fields.title, urgency: fields.urgency };
      break;
    case "journal":
      insertPayload = { text: fields.text, mood: fields.mood };
      break;
    case "expense":
      insertPayload = {
        amount: fields.amount,
        currency: fields.currency,
        merchant_or_category: fields.merchant_or_category,
        note: fields.note,
      };
      break;
    case "decision":
      insertPayload = {
        what_was_decided: fields.what_was_decided,
        context: fields.context,
      };
      break;
  }

  const { data, error } = await supabaseAdmin
    .from(table)
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    console.error(`Failed to insert into ${table}:`, error);
    return;
  }

  await supabaseAdmin
    .from("raw_captures")
    .update({ routed_to: table, routed_id: data.id })
    .eq("id", captureId);
}
