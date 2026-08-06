import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { classify } from "@/lib/router/classify";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return new NextResponse(null, { status: 401 });
  }

  const body = await req.json();
  const message = body.message;

  const senderId = message?.from?.id;
  if (String(senderId) !== process.env.TELEGRAM_USER_ID) {
    return new NextResponse(null, { status: 200 });
  }

  const source = message.voice ? "telegram_voice" : "telegram_text";
  const raw_text = message.voice
    ? await transcribeVoice(message.voice.file_id)
    : message.text ?? null;

  const classification = raw_text ? await classify(raw_text) : null;

  await supabase.from("raw_captures").insert({
    source,
    raw_text,
    classification,
    routed_to: null,
    routed_id: null,
  });

  return new NextResponse(null, { status: 200 });
}

async function transcribeVoice(fileId: string): Promise<string | null> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const getFileRes = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const getFileData = await getFileRes.json();
    if (!getFileData.ok) {
      throw new Error(`getFile failed: ${JSON.stringify(getFileData)}`);
    }
    const filePath = getFileData.result.file_path;

    const fileRes = await fetch(
      `https://api.telegram.org/file/bot${botToken}/${filePath}`
    );
    if (!fileRes.ok) {
      throw new Error(`File download failed: ${fileRes.status}`);
    }
    const audioBlob = await fileRes.blob();

    const formData = new FormData();
    formData.append("file", audioBlob, "voice.ogg");
    formData.append("model", "whisper-1");

    const transcriptionRes = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: formData,
      }
    );

    if (!transcriptionRes.ok) {
      const errText = await transcriptionRes.text();
      throw new Error(`Whisper transcription failed: ${errText}`);
    }

    const transcriptionData = await transcriptionRes.json();
    return transcriptionData.text ?? null;
  } catch (err) {
    console.error("Voice transcription failed:", err);
    return null;
  }
}
