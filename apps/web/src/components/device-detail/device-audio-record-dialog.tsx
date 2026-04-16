import { Mic, Pause, Play, RotateCcw, Send, Square } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type RecorderStatus = "idle" | "recording" | "paused" | "ready";

export function DeviceAudioRecordDialog({
  open,
  onOpenChange,
  onSend,
  pending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (file: File) => void | Promise<void>;
  pending: boolean;
}) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const audioUrl = useMemo(() => {
    if (!audioBlob) {
      return null;
    }

    return URL.createObjectURL(audioBlob);
  }, [audioBlob]);

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!open) {
      cleanupRecorder();
      setStatus("idle");
      setAudioBlob(null);
      chunksRef.current = [];
    }
  }, [open]);

  function cleanupRecorder() {
    mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const nextBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        setAudioBlob(nextBlob);
        setStatus("ready");
      };

      mediaRecorder.start();
      setAudioBlob(null);
      setStatus("recording");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível acessar o microfone.",
      );
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      setStatus("paused");
    }
  }

  function resumeRecording() {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      setStatus("recording");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      cleanupRecorder();
    }
  }

  function resetRecording() {
    cleanupRecorder();
    setStatus("idle");
    setAudioBlob(null);
    chunksRef.current = [];
  }

  async function sendRecording() {
    if (!audioBlob) {
      return;
    }

    const file = new File([audioBlob], `gravacao-${Date.now()}.webm`, {
      type: audioBlob.type || "audio/webm",
    });

    await Promise.resolve(onSend(file));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Gravar áudio temporário</DialogTitle>
          <DialogDescription>
            Grave sua voz e envie para o device tocar imediatamente, sem salvar na memória dele.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="border-border/40 bg-background/50 rounded-xl border p-4">
            <div className="flex flex-wrap gap-2">
              {status === "idle" ? (
                <Button type="button" onClick={startRecording}>
                  <Mic className="size-4" />
                  Gravar
                </Button>
              ) : null}

              {status === "recording" ? (
                <>
                  <Button type="button" variant="outline" onClick={pauseRecording}>
                    <Pause className="size-4" />
                    Pausar
                  </Button>
                  <Button type="button" variant="secondary" onClick={stopRecording}>
                    <Square className="size-4" />
                    Finalizar
                  </Button>
                </>
              ) : null}

              {status === "paused" ? (
                <>
                  <Button type="button" variant="outline" onClick={resumeRecording}>
                    <Play className="size-4" />
                    Retomar
                  </Button>
                  <Button type="button" variant="secondary" onClick={stopRecording}>
                    <Square className="size-4" />
                    Finalizar
                  </Button>
                </>
              ) : null}

              {status === "ready" ? (
                <Button type="button" variant="outline" onClick={resetRecording}>
                  <RotateCcw className="size-4" />
                  Deletar
                </Button>
              ) : null}
            </div>
          </div>

          {audioUrl ? (
            <audio controls src={audioUrl} className="w-full" />
          ) : (
            <div className="text-muted-foreground rounded-xl border border-dashed px-3 py-6 text-sm">
              Nenhuma gravação pronta ainda.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" disabled={!audioBlob || pending} onClick={() => void sendRecording()}>
            <Send className="size-4" />
            Enviar para tocar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
