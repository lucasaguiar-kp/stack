import { env } from "@stack-pbx/env/web";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type AudioConfigDraft,
  type CommandPreview,
  type PendingAction,
  areStringArraysEqual,
  buildAudioConfigBaseline,
  buildAudioConfigPatch,
  createCommandPreview,
  normalizeDeviceDetailData,
} from "./device-detail-types";
import type { DeviceListItem } from "@/components/device-card";

type SendDeviceCommandFn = (
  title: string,
  command: { type: string; [key: string]: unknown },
  preview: Omit<CommandPreview, "title" | "topic">,
  options?: { onSuccess?: () => void | Promise<void> },
) => void;

type RunWithPreviewFn = (action: PendingAction) => void;

const WAV_HEADER_SIZE_BYTES = 44;
const DEVICE_WAV_BYTES_PER_SECOND = 16_000 * 2;
const PLAYBACK_SETTLE_BUFFER_MS = 750;

async function getMediaFileDurationMs(file: File) {
  if (typeof window === "undefined") {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const audio = new Audio();

    const durationSeconds = await new Promise<number | null>((resolve) => {
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        resolve(Number.isFinite(audio.duration) ? audio.duration : null);
      };
      audio.onerror = () => resolve(null);
      audio.src = objectUrl;
    });

    return durationSeconds ? Math.ceil(durationSeconds * 1000) : null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function estimateDeviceWavDurationMs(sizeBytes?: number | null) {
  if (!sizeBytes || sizeBytes <= WAV_HEADER_SIZE_BYTES) {
    return null;
  }

  return Math.ceil(((sizeBytes - WAV_HEADER_SIZE_BYTES) / DEVICE_WAV_BYTES_PER_SECOND) * 1000);
}

export function useDeviceAudio(input: {
  detail: ReturnType<typeof normalizeDeviceDetailData>;
  device: DeviceListItem;
  detailQueryKey: QueryKey;
  sendDeviceCommand: SendDeviceCommandFn;
  runWithPreview: RunWithPreviewFn;
  updateConfigMutation: {
    mutateAsync: (input: {
      config: never;
      deviceId: string;
      syncWithDevice: boolean;
    }) => Promise<unknown>;
  };
}) {
  const {
    detail,
    device,
    detailQueryKey,
    sendDeviceCommand,
    runWithPreview,
    updateConfigMutation,
  } = input;
  const queryClient = useQueryClient();
  const audioBaseline = buildAudioConfigBaseline(detail);
  const audioAssetsSourceKey = detail.audioAssets
    .map((audio) => `${audio.id}:${audio.audioIndex ?? ""}:${audio.updatedAt}`)
    .join("|");

  const [speakerVolume, setSpeakerVolume] = useState(audioBaseline.speakerVolume);
  const [microphoneVolume, setMicrophoneVolume] = useState(audioBaseline.microphoneVolume);
  const [dtmfPlaybackEnabled, setDtmfPlaybackEnabled] = useState(audioBaseline.dtmfPlaybackEnabled);
  const [beepOnBootEnabled, setBeepOnBootEnabled] = useState(audioBaseline.beepOnBootEnabled);
  const [enabledCodecs, setEnabledCodecs] = useState<string[]>(audioBaseline.enabledCodecs);
  const [audioUploadName, setAudioUploadName] = useState("");
  const [audioRecordDialogOpen, setAudioRecordDialogOpen] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [audioAssets, setAudioAssets] = useState(detail.audioAssets);
  const [audioInputResetKey, setAudioInputResetKey] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [currentPlayingAudioIndex, setCurrentPlayingAudioIndex] = useState<string | null>(null);
  const playbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPlaybackTimeout() {
    if (playbackTimeoutRef.current) {
      clearTimeout(playbackTimeoutRef.current);
      playbackTimeoutRef.current = null;
    }
  }

  function schedulePlaybackReset(durationMs: number | null) {
    clearPlaybackTimeout();

    if (!durationMs || durationMs <= 0) {
      return;
    }

    playbackTimeoutRef.current = setTimeout(() => {
      setIsAudioPlaying(false);
      setCurrentPlayingAudioIndex(null);
      playbackTimeoutRef.current = null;
    }, durationMs + PLAYBACK_SETTLE_BUFFER_MS);
  }

  useEffect(() => {
    setAudioAssets(detail.audioAssets);
  }, [audioAssetsSourceKey]);

  useEffect(() => clearPlaybackTimeout, []);

  const uploadAudioMutation = useMutation({
    mutationFn: async (variables: { audioName?: string; file: File; playNow?: boolean }) => {
      const formData = new FormData();
      formData.set("file", variables.file);

      if (variables.audioName) {
        formData.set("audioName", variables.audioName);
      }

      if (variables.playNow) {
        formData.set("playNow", "true");
      }

      const response = await fetch(`${env.VITE_SERVER_URL}/devices/${device.id}/audio-assets`, {
        body: formData,
        credentials: "include",
        method: "POST",
      });

      if (!response.ok) {
        const error = (await response.json().catch(() => undefined)) as
          | { message?: string }
          | undefined;
        throw new Error(error?.message ?? "Falha ao enviar áudio para o device.");
      }

      return (await response.json()) as {
        audioIndex?: string;
        audioName: string;
        deviceId: string;
        displayName?: string;
        playNow: boolean;
      };
    },
  });

  function resetAudioUploadForm() {
    setSelectedAudioFile(null);
    setAudioUploadName("");
    setAudioInputResetKey((current) => current + 1);
  }

  async function applyUploadedAudioResult(variables: {
    audioName?: string;
    file: File;
    playNow?: boolean;
  }) {
    toast.success(
      variables.playNow ? "Áudio temporário enviado para reprodução" : "Áudio salvo no device",
    );

    if (variables.playNow) {
      setIsAudioPlaying(true);
      setCurrentPlayingAudioIndex(null);

      const playbackDurationMs = await getMediaFileDurationMs(variables.file);
      schedulePlaybackReset(playbackDurationMs);
    }

    // Refetch para pegar os dados atualizados do DB
    await queryClient.refetchQueries({
      queryKey: detailQueryKey,
      type: "active",
    });
  }

  function toggleCodec(codec: string, checked: boolean) {
    setEnabledCodecs((current) => {
      if (checked) {
        return Array.from(new Set([...current, codec]));
      }

      return current.filter((item) => item !== codec);
    });
  }

  function handleSelectedAudioFile(file: File | null) {
    setSelectedAudioFile(file);

    if (file && !audioUploadName) {
      setAudioUploadName(file.name.replace(/\.[^/.]+$/, ""));
    }
  }

  function sendAudioConfig() {
    const currentAudioConfig: AudioConfigDraft = {
      beepOnBootEnabled,
      dtmfPlaybackEnabled,
      enabledCodecs,
      microphoneVolume,
      speakerVolume,
    };
    const config = buildAudioConfigPatch({
      baseline: audioBaseline,
      current: currentAudioConfig,
    });

    if (!config.audioConfig) {
      toast.info("Nenhuma alteração para enviar no áudio.");
      return;
    }

    const audioParams: Record<string, unknown> = {};

    if (config.audioConfig.advanced?.beepOnBootEnabled !== undefined) {
      audioParams.beep_on_boot_enabled = config.audioConfig.advanced.beepOnBootEnabled;
    }

    if (config.audioConfig.advanced?.dtmfPlaybackEnabled !== undefined) {
      audioParams.dtmf_audio_enabled = config.audioConfig.advanced.dtmfPlaybackEnabled;
    }

    if (config.audioConfig.codecSettings?.enabled) {
      audioParams.codecs_enabled = config.audioConfig.codecSettings.enabled;
    }

    if (config.audioConfig.volume?.microphone !== undefined) {
      audioParams.volume_microphone = config.audioConfig.volume.microphone;
    }

    if (config.audioConfig.volume?.speaker !== undefined) {
      audioParams.volume_speaker = config.audioConfig.volume.speaker;
    }

    runWithPreview({
      execute: async () => {
        await updateConfigMutation.mutateAsync({
          config: config as never,
          deviceId: device.id,
          syncWithDevice: true,
        });
      },
      preview: createCommandPreview(device, {
        title: "Atualizar áudio",
        path: "v1/configs",
        params: {
          audio: audioParams,
        },
      }),
    });
  }

  function handleUploadAudio() {
    if (!selectedAudioFile) {
      toast.error("Selecione um arquivo de áudio primeiro.");
      return;
    }

    const file = selectedAudioFile;
    const resolvedAudioName = audioUploadName.trim() || file.name.replace(/\.[^/.]+$/, "");

    runWithPreview({
      execute: async () => {
        try {
          const variables = {
            audioName: resolvedAudioName,
            file,
            playNow: false,
          } as const;
          await uploadAudioMutation.mutateAsync(variables);
          await applyUploadedAudioResult(variables);
        } finally {
          resetAudioUploadForm();
        }
      },
      preview: createCommandPreview(device, {
        title: "Adicionar áudio ao device",
        path: "v1/audios/upload",
        params: {
          data: "[hidden]",
          file: `${resolvedAudioName}.wav`,
        },
      }),
    });
  }

  function handlePlayTemporaryAudio(file: File) {
    const tempAudioName = `temp-${Date.now()}`;

    runWithPreview({
      execute: async () => {
        const variables = {
          audioName: tempAudioName,
          file,
          playNow: true,
        } as const;
        await uploadAudioMutation.mutateAsync(variables);
        await applyUploadedAudioResult(variables);
      },
      preview: createCommandPreview(device, {
        title: "Gravar e tocar áudio temporário",
        path: "v1/audios/upload-play",
        params: {
          data: "[hidden]",
          file: `${tempAudioName}.wav`,
        },
      }),
    });
  }

  function handlePlayAudio(audioId: string | number) {
    const selectedAudio = audioAssets.find(
      (audio) => String(audio.audioIndex ?? "") === String(audioId),
    );
    const estimatedDurationMs = estimateDeviceWavDurationMs(selectedAudio?.sizeBytes);

    sendDeviceCommand(
      "Reproduzir áudio",
      {
        type: "play-audio",
        audioId,
        milliSecondsBetweenPlay: 10000,
        numberOfTimes: 1,
      },
      {
        path: `v1/audios/${audioId}/play`,
        params: {
          milli_seconds_between_play: 10000,
          number_of_times: 1,
        },
      },
      {
        onSuccess: () => {
          setIsAudioPlaying(true);
          setCurrentPlayingAudioIndex(String(audioId));
          schedulePlaybackReset(estimatedDurationMs);
        },
      },
    );
  }

  function handleStopAudio() {
    sendDeviceCommand(
      "Parar áudio",
      { type: "stop-audio" },
      { path: "v1/audios/stop" },
      {
        onSuccess: () => {
          clearPlaybackTimeout();
          setIsAudioPlaying(false);
          setCurrentPlayingAudioIndex(null);
        },
      },
    );
  }

  function handleDeleteAudio(audioId: string | number) {
    sendDeviceCommand(
      "Remover áudio",
      { type: "delete-audio", audioId },
      { path: `v1/audios/${audioId}` },
      {
        onSuccess: () => {
          setAudioAssets((current) =>
            current.filter((audio) => String(audio.audioIndex ?? "") !== String(audioId)),
          );
        },
      },
    );
  }

  return {
    audioRecordDialogOpen,
    audioAssets,
    audioInputResetKey,
    audioUploadName,
    beepOnBootEnabled,
    currentPlayingAudioIndex,
    dtmfPlaybackEnabled,
    enabledCodecs,
    isAudioPlaying,
    microphoneVolume,
    selectedAudioFile,
    speakerVolume,
    uploadAudioPending: uploadAudioMutation.isPending,
    audioAdvancedDirty:
      beepOnBootEnabled !== audioBaseline.beepOnBootEnabled ||
      dtmfPlaybackEnabled !== audioBaseline.dtmfPlaybackEnabled,
    audioCodecDirty: !areStringArraysEqual(enabledCodecs, audioBaseline.enabledCodecs),
    audioConfigDirty:
      beepOnBootEnabled !== audioBaseline.beepOnBootEnabled ||
      dtmfPlaybackEnabled !== audioBaseline.dtmfPlaybackEnabled ||
      microphoneVolume !== audioBaseline.microphoneVolume ||
      speakerVolume !== audioBaseline.speakerVolume ||
      !areStringArraysEqual(enabledCodecs, audioBaseline.enabledCodecs),
    audioVolumeDirty:
      microphoneVolume !== audioBaseline.microphoneVolume ||
      speakerVolume !== audioBaseline.speakerVolume,
    handleDeleteAudio,
    handlePlayAudio,
    handlePlayTemporaryAudio,
    handleSelectedAudioFile,
    handleStopAudio,
    handleUploadAudio,
    sendAudioConfig,
    setAudioRecordDialogOpen,
    setAudioUploadName,
    setBeepOnBootEnabled,
    setDtmfPlaybackEnabled,
    setMicrophoneVolume,
    setSpeakerVolume,
    toggleCodec,
  };
}
