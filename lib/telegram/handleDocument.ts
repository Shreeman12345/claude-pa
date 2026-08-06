import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { classifyDocument } from "@/lib/router/classifyDocument";
import { fileDocument } from "@/lib/router/routeDocument";
import { sendMessage } from "@/lib/telegram/api";
import { subjectKeyboard, docTypeKeyboard } from "@/lib/telegram/documentKeyboards";

export async function handleDocumentMessage(message: any): Promise<void> {
  let fileId: string;
  let fileName: string;

  if (message.document) {
    fileId = message.document.file_id;
    fileName = message.document.file_name ?? `document_${Date.now()}`;
  } else if (message.photo) {
    const largest = message.photo[message.photo.length - 1];
    fileId = largest.file_id;
    fileName = `photo_${Date.now()}.jpg`;
  } else {
    return;
  }

  const caption: string | null = message.caption ?? null;

  const classification = caption
    ? await classifyDocument(caption)
    : { subject: null, doc_type: null, confidence: "low" as const };

  if (classification.confidence === "high" && classification.subject && classification.doc_type) {
    await fileDocument({
      fileId,
      fileName,
      subject: classification.subject,
      docType: classification.doc_type,
      captionText: caption,
    });
    return;
  }

  const { data: pending, error } = await supabaseAdmin
    .from("pending_documents")
    .insert({
      chat_id: String(message.chat.id),
      message_id: null,
      file_id: fileId,
      file_name: fileName,
      caption_text: caption,
      subject: classification.subject,
      doc_type: classification.doc_type,
    })
    .select()
    .single();

  if (error || !pending) {
    console.error("Failed to create pending_documents row:", error);
    return;
  }

  const text = classification.subject
    ? `Subject: ${classification.subject}. What type of document is this?`
    : "Which subject is this for?";
  const keyboard = classification.subject
    ? docTypeKeyboard(pending.id)
    : subjectKeyboard(pending.id);

  const sent = await sendMessage(message.chat.id, text, keyboard);
  if (sent) {
    await supabaseAdmin
      .from("pending_documents")
      .update({ message_id: String(sent.message_id) })
      .eq("id", pending.id);
  }
}
