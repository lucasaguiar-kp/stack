import { env } from "@stack-pbx/env/web";
import { useQuery } from "@tanstack/react-query";
import {
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  Wifi,
  WifiOff,
} from "lucide-react";
import { startTransition, useEffect, useRef, useState } from "react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";
import type { ReactNode } from "react";

type BrowserPhoneStatus =
  | "idle"
  | "connecting"
  | "registered"
  | "dialing"
  | "incoming"
  | "in-call"
  | "error";

type BrowserPhoneIdentity = {
  extension: string;
  sipPassword: string;
  sipUser: string;
};

type BrowserPhoneActionState = "idle" | "answering" | "hanging-up";

type BrowserPhoneContextValue = {
  actionState: BrowserPhoneActionState;
  activeDestination: string | null;
  error: string | null;
  hasCredentials: boolean;
  identity: BrowserPhoneIdentity | null;
  isMuted: boolean;
  isSecureContext: boolean;
  status: BrowserPhoneStatus;
  answer: () => Promise<void>;
  call: (destination: string) => Promise<void>;
  hangup: () => Promise<void>;
  reconnect: () => Promise<void>;
  toggleMute: () => void;
};

const BrowserPhoneContext = React.createContext<BrowserPhoneContextValue | null>(null);

function getSipDomain() {
  return env.VITE_ASTERISK_SIP_DOMAIN ?? new URL(env.VITE_ASTERISK_WS_URL).hostname;
}

function ensureRemoteAudioPlayback(audioElement: HTMLAudioElement | null) {
  if (!audioElement) {
    return;
  }

  void audioElement.play().catch(() => undefined);
}

function setLocalMicrophoneMuted(simpleUser: any, muted: boolean) {
  const peerConnection = simpleUser?.session?.sessionDescriptionHandler?.peerConnection;
  const audioSenders = peerConnection
    ?.getSenders()
    ?.filter((sender: RTCRtpSender) => sender.track?.kind === "audio");

  if (!audioSenders?.length) {
    return false;
  }

  for (const sender of audioSenders) {
    if (sender.track) {
      sender.track.enabled = !muted;
    }
  }

  return true;
}

export function BrowserPhoneProvider({ children }: { children: ReactNode }) {
  const credentials = useQuery({
    ...orpc.user.pbxCredentials.queryOptions(),
  });
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const simpleUserRef = useRef<any>(null);
  const [status, setStatus] = useState<BrowserPhoneStatus>("idle");
  const [actionState, setActionState] = useState<BrowserPhoneActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeDestination, setActiveDestination] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (!credentials.data) {
      return;
    }

    let disposed = false;

    async function connectBrowserPhone() {
      const memberCredentials = credentials.data;

      if (!memberCredentials) {
        return;
      }

      startTransition(() => {
        setStatus("connecting");
        setError(null);
      });

      const { UserAgent, Web } = await import("sip.js");

      if (disposed) {
        return;
      }

      const simpleUser = new Web.SimpleUser(env.VITE_ASTERISK_WS_URL, {
        aor: `sip:${memberCredentials.sipUser}@${getSipDomain()}`,
        media: {
          constraints: { audio: true, video: false },
          remote: { audio: remoteAudioRef.current ?? undefined },
        },
        sessionDescriptionHandlerFactoryOptions: {
          peerConnectionConfiguration: {
            iceServers: [],
            iceTransportPolicy: "all",
            rtcpMuxPolicy: "require",
          },
        },
        delegate: {
          onCallAnswered: () => {
            ensureRemoteAudioPlayback(remoteAudioRef.current);
            startTransition(() => {
              setStatus("in-call");
              setActionState("idle");
            });
          },
          onCallHangup: () => {
            startTransition(() => {
              setStatus("registered");
              setActionState("idle");
              setActiveDestination(null);
              setIsMuted(false);
            });
          },
          onCallReceived: () => {
            ensureRemoteAudioPlayback(remoteAudioRef.current);
            startTransition(() => {
              setStatus("incoming");
              setActionState("idle");
              setActiveDestination("Chamada recebida");
            });
          },
          onRegistered: () => {
            startTransition(() => {
              setStatus("registered");
              setActionState("idle");
            });
          },
          onServerDisconnect: () => {
            startTransition(() => {
              setStatus("error");
              setActionState("idle");
              setError("Softphone desconectado do Asterisk.");
            });
          },
        },
        userAgentOptions: {
          authorizationPassword: memberCredentials.sipPassword,
          authorizationUsername: memberCredentials.sipUser,
          displayName: memberCredentials.extension,
          uri: UserAgent.makeURI(`sip:${memberCredentials.sipUser}@${getSipDomain()}`) ?? undefined,
        },
      } as ConstructorParameters<typeof Web.SimpleUser>[1] & {
        sessionDescriptionHandlerFactoryOptions?: {
          peerConnectionConfiguration?: RTCConfiguration;
        };
      });

      simpleUserRef.current = simpleUser;

      try {
        await simpleUser.connect();
        await simpleUser.register();
      } catch (connectError) {
        if (disposed) {
          return;
        }

        startTransition(() => {
          setStatus("error");
          setError(
            connectError instanceof Error
              ? connectError.message
              : "Nao foi possivel conectar o softphone.",
          );
        });
      }
    }

    void connectBrowserPhone();

    return () => {
      disposed = true;

      const simpleUser = simpleUserRef.current;
      simpleUserRef.current = null;

      if (!simpleUser) {
        return;
      }

      void simpleUser.unregister().catch(() => undefined);
      void simpleUser.disconnect().catch(() => undefined);
    };
  }, [credentials.data?.extension, credentials.data?.sipPassword, credentials.data?.sipUser]);

  const value: BrowserPhoneContextValue = {
    actionState,
    activeDestination,
    error,
    hasCredentials: Boolean(credentials.data),
    identity: credentials.data ?? null,
    isMuted,
    isSecureContext:
      typeof window === "undefined"
        ? true
        : window.isSecureContext || window.location.hostname === "localhost",
    status,
    answer: async () => {
      if (!simpleUserRef.current) {
        return;
      }

      startTransition(() => {
        setActionState("answering");
        setError(null);
      });

      try {
        await simpleUserRef.current.answer();
        ensureRemoteAudioPlayback(remoteAudioRef.current);
      } catch (answerError) {
        startTransition(() => {
          setActionState("idle");
          setError(
            answerError instanceof Error
              ? answerError.message
              : "Nao foi possivel atender a chamada.",
          );
        });
      }
    },
    call: async (destination: string) => {
      if (!simpleUserRef.current) {
        throw new Error("Browser phone is not connected.");
      }

      startTransition(() => {
        setStatus("dialing");
        setError(null);
        setActiveDestination(destination);
      });

      try {
        await simpleUserRef.current.call(`sip:${destination}@${getSipDomain()}`);
        ensureRemoteAudioPlayback(remoteAudioRef.current);
      } catch (callError) {
        startTransition(() => {
          setStatus("registered");
          setActiveDestination(null);
          setError(
            callError instanceof Error ? callError.message : "Nao foi possível iniciar a chamada.",
          );
        });
        throw callError;
      }
    },
    hangup: async () => {
      if (!simpleUserRef.current) {
        return;
      }

      startTransition(() => {
        setActionState("hanging-up");
        setError(null);
      });

      try {
        await simpleUserRef.current.hangup();
      } catch (hangupError) {
        startTransition(() => {
          setActionState("idle");
          setError(
            hangupError instanceof Error
              ? hangupError.message
              : "Nao foi possível encerrar a chamada.",
          );
        });
      }
    },
    reconnect: async () => {
      const simpleUser = simpleUserRef.current;

      if (!simpleUser) {
        return;
      }

      startTransition(() => {
        setStatus("connecting");
        setError(null);
      });

      await simpleUser.connect();
      await simpleUser.register();
      startTransition(() => setStatus("registered"));
    },
    toggleMute: () => {
      const simpleUser = simpleUserRef.current;

      if (!simpleUser || status !== "in-call") {
        return;
      }

      const nextMuted = !isMuted;

      try {
        const updated = setLocalMicrophoneMuted(simpleUser, nextMuted);

        if (!updated) {
          setError("Não foi possível controlar o microfone da chamada atual.");
          return;
        }

        setError(null);
        setIsMuted(nextMuted);
      } catch (muteError) {
        setError(
          muteError instanceof Error
            ? muteError.message
            : "Não foi possível controlar o microfone da chamada atual.",
        );
      }
    },
  };

  return (
    <BrowserPhoneContext.Provider value={value}>
      {children}
      <BrowserPhoneCallDialog />
      <audio ref={remoteAudioRef} autoPlay playsInline hidden />
    </BrowserPhoneContext.Provider>
  );
}

export function useBrowserPhone() {
  const context = React.useContext(BrowserPhoneContext);

  if (!context) {
    throw new Error("useBrowserPhone must be used inside BrowserPhoneProvider");
  }

  return context;
}

export function BrowserPhoneStatusIndicator() {
  const browserPhone = useBrowserPhone();
  const label =
    browserPhone.status === "registered"
      ? "PBX online"
      : browserPhone.status === "dialing"
        ? "PBX chamando"
        : browserPhone.status === "incoming"
          ? "PBX recebendo"
          : browserPhone.status === "in-call"
            ? "PBX em chamada"
            : browserPhone.status === "connecting"
              ? "PBX conectando"
              : browserPhone.status === "error"
                ? "PBX error"
                : "PBX ocioso";

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={cn(
          "bg-background/70 border-border/60 h-8 rounded-full px-3 text-xs font-medium",
          browserPhone.status === "registered" && "border-green-500 text-green-500",
          browserPhone.status === "dialing" && "border-blue-500 text-blue-500",
          browserPhone.status === "in-call" && "border-blue-500 text-blue-500",
          browserPhone.status === "incoming" && "border-yellow-500 text-yellow-500",
          browserPhone.status === "connecting" && "border-gray-500 text-gray-500",
          browserPhone.status === "error" && "border-red-500 text-red-500",
        )}
      >
        {browserPhone.status === "registered" ? (
          <Wifi className="size-3" />
        ) : browserPhone.status === "incoming" ? (
          <PhoneIncoming className="size-3" />
        ) : browserPhone.status === "dialing" || browserPhone.status === "in-call" ? (
          <PhoneCall className="size-3" />
        ) : browserPhone.status === "error" ? (
          <WifiOff className="size-3" />
        ) : (
          <Phone className="size-3" />
        )}
        {label}
      </Badge>
      {browserPhone.status === "error" ? (
        <Button size="sm" variant="outline" onClick={() => void browserPhone.reconnect()}>
          Reconectar
        </Button>
      ) : null}
    </div>
  );
}

function BrowserPhoneCallDialog() {
  const browserPhone = useBrowserPhone();
  const open =
    browserPhone.status === "dialing" ||
    browserPhone.status === "incoming" ||
    browserPhone.status === "in-call";
  const isAnswering = browserPhone.actionState === "answering";
  const isHangingUp = browserPhone.actionState === "hanging-up";

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm p-6" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {browserPhone.status === "dialing" || isAnswering || isHangingUp ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PhoneCall className="size-4" />
            )}
            {isAnswering
              ? "Atendendo chamada"
              : isHangingUp
                ? "Encerrando chamada"
                : browserPhone.status === "dialing"
                  ? "Chamando"
                  : browserPhone.status === "incoming"
                    ? "Chamada recebida"
                    : "Chamada em andamento"}
          </DialogTitle>
          <DialogDescription>
            {browserPhone.activeDestination
              ? `Destino: ${browserPhone.activeDestination}`
              : "Gerencie a chamada atual sem sair da tela."}
          </DialogDescription>
        </DialogHeader>
        {browserPhone.status === "incoming" ? (
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={isAnswering || isHangingUp}
              onClick={() => void browserPhone.hangup()}
            >
              {isHangingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneOff className="size-4" />
              )}
              {isHangingUp ? "Recusando..." : "Recusar"}
            </Button>
            <Button
              disabled={isAnswering || isHangingUp}
              onClick={() => void browserPhone.answer()}
            >
              {isAnswering ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneIncoming className="size-4" />
              )}
              {isAnswering ? "Atendendo..." : "Atender"}
            </Button>
          </div>
        ) : (
          <div className="flex justify-between">
            {browserPhone.status === "in-call" ? (
              <Button
                variant={browserPhone.isMuted ? "destructive" : "outline"}
                onClick={() => browserPhone.toggleMute()}
              >
                {browserPhone.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                {browserPhone.isMuted ? "Desmutado" : "Mutar"}
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="destructive"
              disabled={isHangingUp}
              onClick={() => void browserPhone.hangup()}
            >
              {isHangingUp ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PhoneOff className="size-4" />
              )}
              {isHangingUp
                ? "Encerrando..."
                : browserPhone.status === "dialing"
                  ? "Cancelar chamada"
                  : "Desligar"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
