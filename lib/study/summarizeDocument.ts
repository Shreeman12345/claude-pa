import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  isTextExtractable,
  imageMimeType,
  extractTextFromFile,
} from "@/lib/study/extractText";
import { assessTextDocument, assessImageDocument } from "@/lib/study/assessDocument";

export async function summarizeDocument(doc: {
  id: string;
  file_name: string;
  storage_path: string;
}): Promise<boolean> {
  try {
    const { data: blob, error: downloadError } = await supabaseAdmin.storage
      .from("documents")
      .download(doc.storage_path);

    if (downloadError || !blob) {
      console.error(`Failed to download document ${doc.storage_path}:`, downloadError);
      return false;
    }

    const mediaType = imageMimeType(doc.file_name);

    const assessment = mediaType
      ? await assessImageDocument(
          Buffer.from(await blob.arrayBuffer()).toString("base64"),
          mediaType
        )
      : isTextExtractable(doc.file_name)
      ? await assessTextDocument(await extractTextFromFile(blob, doc.file_name))
      : null;

    if (!assessment) {
      console.error(`Could not assess document ${doc.file_name} (${doc.storage_path})`);
      return false;
    }

    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({
        summary: assessment.summary,
        difficulty: assessment.difficulty,
        estimated_hours: assessment.estimated_hours,
      })
      .eq("id", doc.id);

    if (updateError) {
      console.error(`Failed to save assessment for ${doc.file_name}:`, updateError);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`Failed to summarize document ${doc.file_name}:`, err);
    return false;
  }
}
