import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { AppError } from "../../../core/errors/app-error";

let resolvedFfmpegPath: string | null | undefined;

function getFileExtension(fileName: string) {
  const extension = path.extname(fileName).trim();

  if (!extension) {
    return ".tmp";
  }

  return extension;
}

async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFfmpegPath() {
  if (resolvedFfmpegPath !== undefined) {
    return resolvedFfmpegPath;
  }

  const candidates = [
    process.env.FFMPEG_PATH,
    process.env.APP_INSTALL_DIR
      ? path.join(process.env.APP_INSTALL_DIR, "ffmpeg", "ffmpeg.exe")
      : null,
    process.env.WINDOWS_PROGRAM_FILES_DIR
      ? path.join(process.env.WINDOWS_PROGRAM_FILES_DIR, "ffmpeg", "ffmpeg.exe")
      : null,
    path.join(process.cwd(), "ffmpeg", "ffmpeg.exe"),
    "C:\\Program Files\\Khomp Stack\\ffmpeg\\ffmpeg.exe",
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      resolvedFfmpegPath = candidate;
      ffmpeg.setFfmpegPath(candidate);
      return candidate;
    }
  }

  resolvedFfmpegPath = null;
  return resolvedFfmpegPath;
}

export async function convertAudioFileToDeviceBase64(file: File, audioName: string) {
  const tempId = randomUUID();
  const tempInputPath = path.join(tmpdir(), `${tempId}${getFileExtension(file.name)}`);
  const tempOutputPath = path.join(tmpdir(), `${audioName}-${tempId}.wav`);

  try {
    const ffmpegPath = await resolveFfmpegPath();

    if (!ffmpegPath) {
      console.error("FFmpeg executable was not found", {
        appInstallDir: process.env.APP_INSTALL_DIR,
        ffmpegPath: process.env.FFMPEG_PATH,
        windowsProgramFilesDir: process.env.WINDOWS_PROGRAM_FILES_DIR,
      });
      throw new AppError("DEVICE_AUDIO_UPLOAD_FAILED");
    }

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
