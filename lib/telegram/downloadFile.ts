export async function downloadTelegramFile(fileId: string): Promise<Blob> {
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

  return fileRes.blob();
}
