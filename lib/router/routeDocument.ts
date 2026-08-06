import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { downloadTelegramFile } from "@/lib/telegram/downloadFile";

export async function fileDocument({
  fileId,
  fileName,
  subject,
  docType,
  captionText,
}: {
  fileId: string;
  fileName: string;
  subject: string;
  docType: string;
  captionText: string | null;
}): Promise<boolean> {
  try {
    const blob = await downloadTelegramFile(fileId);
    const storagePath = `${subject}/${docType}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, blob, { upsert: false });

    if (uploadError) {
      console.error("Failed to upload document to storage:", uploadError);
      return false;
    }

    const { error: insertError } = await supabaseAdmin.from("documents").insert({
      subject,
      doc_type: docType,
      file_name: fileName,
      storage_path: storagePath,
      caption_text: captionText,
    });

    if (insertError) {
      console.error("Failed to insert documents row:", insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to file document:", err);
    return false;
  }
}
