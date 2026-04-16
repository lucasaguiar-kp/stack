import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError } from "../../../core/errors/app-error";

function getFileExtension(fileName: string) {
  const extension = path.extname(fileName).trim();

  if (!extension) {
    return ".tmp";
  }

  return extension;
}

export async function convertAudioFileToDeviceBase64(file: File, audioName: string) {
  const tempId = randomUUID();
  const tempInputPath = path.join(tmpdir(), `${tempId}${getFileExtension(file.name)}`);
  const tempOutputPath = path.join(tmpdir(), `${audioName}-${tempId}.wav`);

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(tempInputPath, fileBuffer);

    const rawFilePath = (await new Promise<string>((resolve, reject) => {
      ffmpeg(tempInputPath)
        .output(tempOutputPath)
        .toFormat("wav")
        .audioCodec("pcm_s16le")
        .audioFrequency(16000)
        .audioChannels(1)
        .on("end", () => resolve(tempOutputPath))
        .on("error", (error: Error) => reject(error))
        .run();
    })) as string;

    const rawData = await fs.readFile(rawFilePath);

    return Buffer.from(rawData).toString("base64");
  } catch (error) {
    console.error("Error converting audio file", error);
    throw new AppError("DEVICE_AUDIO_UPLOAD_FAILED");
  } finally {
    await fs.unlink(tempInputPath).catch(() => undefined);
    await fs.unlink(tempOutputPath).catch(() => undefined);
  }
}
