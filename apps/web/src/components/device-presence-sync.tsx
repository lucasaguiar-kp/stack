import { useEffect } from "react";
import { env } from "@stack-pbx/env/web";
import { queryClient } from "@/utils/orpc";

type DevicePresenceEvent = {
  connectionStatus: "online" | "offline" | "unknown";
  deviceId: string;
  mqttTopic: string;
  occurredAt: string;
  type: "device.connection-status.changed";
};

function buildDevicePresenceWebSocketUrl() {
  const url = new URL(env.VITE_SERVER_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws/device-presence";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function DevicePresenceSync() {
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;

    const connect = () => {
      socket = new WebSocket(buildDevicePresenceWebSocketUrl());

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as DevicePresenceEvent;

          if (payload.type !== "device.connection-status.changed") {
            return;
          }

          void queryClient.invalidateQueries({
            predicate: (query) => JSON.stringify(query.queryKey).includes("device"),
          });
        } catch (error) {
          console.error("Failed to parse device presence event", error);
        }
      };

      socket.onerror = () => {
        socket?.close();
      };

      socket.onclose = () => {
        if (disposed) {
          return;
        }

        reconnectTimer = window.setTimeout(() => {
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, []);

  return null;
}
