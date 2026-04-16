import type { DeviceConfigUpdate } from "./device-config-schema";

function hasKeys(value: Record<string, unknown>) {
  return Object.keys(value).length > 0;
}

export function buildDeviceConfigPatch(config: DeviceConfigUpdate) {
  const params: Record<string, unknown> = {};
  const syncedSections: string[] = [];
  const storedOnlySections: string[] = [];

  if (config.audioConfig) {
    const audio: Record<string, unknown> = {};

    if (typeof config.audioConfig.volume?.speaker === "number") {
      audio.volume_speaker = config.audioConfig.volume.speaker;
    }

    if (typeof config.audioConfig.volume?.microphone === "number") {
      audio.volume_microphone = config.audioConfig.volume.microphone;
    }

    if (config.audioConfig.codecSettings?.enabled) {
      audio.codecs_enabled = config.audioConfig.codecSettings.enabled;
    }

    if (typeof config.audioConfig.advanced?.dtmfPlaybackEnabled === "boolean") {
      audio.dtmf_audio_enabled = config.audioConfig.advanced.dtmfPlaybackEnabled;
    }

    if (typeof config.audioConfig.advanced?.beepOnBootEnabled === "boolean") {
      audio.beep_on_boot_enabled = config.audioConfig.advanced.beepOnBootEnabled;
    }

    if (hasKeys(audio)) {
      params.audio = audio;
      syncedSections.push("audioConfig");
    }
  }

  if (config.networkConfig) {
    const network: Record<string, unknown> = {};

    if (typeof config.networkConfig.connection?.dhcpEnabled === "boolean") {
      network.dhcp_enabled = config.networkConfig.connection.dhcpEnabled;
    }

    if (config.networkConfig.connection?.ipAddress) {
      network.ip_address = config.networkConfig.connection.ipAddress;
    }

    if (config.networkConfig.connection?.subnetMask) {
      network.subnet_mask = config.networkConfig.connection.subnetMask;
    }

    if (config.networkConfig.connection?.gateway) {
      network.gateway = config.networkConfig.connection.gateway;
    }

    if (config.networkConfig.connection?.dnsPrimary) {
      network.dns_primary = config.networkConfig.connection.dnsPrimary;
    }

    if (config.networkConfig.connection?.dnsSecondary) {
      network.dns_secondary = config.networkConfig.connection.dnsSecondary;
    }

    if (typeof config.networkConfig.advanced?.ipAnnouncementEnabled === "boolean") {
      network.vocalize_ip = config.networkConfig.advanced.ipAnnouncementEnabled;
    }

    if (typeof config.networkConfig.advanced?.httpApiTokenEnabled === "boolean") {
      network.http_api_token_enabled = config.networkConfig.advanced.httpApiTokenEnabled;
    }

    if (hasKeys(network)) {
      params.network = network;
      syncedSections.push("networkConfig");
    }
  }

  if (config.mqttConfig) {
    const mqtt: Record<string, unknown> = {};

    if (config.mqttConfig.connection?.brokerAddress) {
      mqtt.broker_address = config.mqttConfig.connection.brokerAddress;
    }

    if (typeof config.mqttConfig.connection?.mqttEnabled === "boolean") {
      mqtt.mqtt_enabled = config.mqttConfig.connection.mqttEnabled;
    }

    if (typeof config.mqttConfig.connection?.port === "number") {
      mqtt.port = config.mqttConfig.connection.port;
    }

    if (config.mqttConfig.connection?.username) {
      mqtt.username = config.mqttConfig.connection.username;
    }

    if (config.mqttConfig.connection?.password) {
      mqtt.password = config.mqttConfig.connection.password;
    }

    if (config.mqttConfig.connection?.subscribeTopic) {
      mqtt.subscribe_topic = config.mqttConfig.connection.subscribeTopic;
    }

    if (config.mqttConfig.connection?.publishTopic) {
      mqtt.publish_topic = config.mqttConfig.connection.publishTopic;
    }

    if (typeof config.mqttConfig.advanced?.tlsEnabled === "boolean") {
      mqtt.tls_enabled = config.mqttConfig.advanced.tlsEnabled;
    }

    if (hasKeys(mqtt)) {
      params.mqtt = mqtt;
      syncedSections.push("mqttConfig");
    }
  }

  if (config.sipConfig) {
    const sip: Record<string, unknown> = {};

    if (typeof config.sipConfig.authentication?.registrationEnabled === "boolean") {
      sip.sip_register_on_pabx_enabled = config.sipConfig.authentication.registrationEnabled;
    }

    if (config.sipConfig.authentication?.pbxIpAddress) {
      sip.pabx_address = config.sipConfig.authentication.pbxIpAddress;
    }

    if (typeof config.sipConfig.advanced?.pbxSipPort === "number") {
      sip.pabx_sip_port = config.sipConfig.advanced.pbxSipPort;
    }

    if (typeof config.sipConfig.advanced?.sipPort === "number") {
      sip.sip_call_ip_port = config.sipConfig.advanced.sipPort;
    }

    if (config.sipConfig.authentication?.username) {
      sip.username = config.sipConfig.authentication.username;
    }

    if (config.sipConfig.authentication?.displayName) {
      sip.display_name = config.sipConfig.authentication.displayName;
    }

    if (config.sipConfig.authentication?.authUsername) {
      sip.auth_username = config.sipConfig.authentication.authUsername;
    }

    if (config.sipConfig.authentication?.userPassword) {
      sip.user_password = config.sipConfig.authentication.userPassword;
    }

    if (typeof config.sipConfig.advanced?.stunEnabled === "boolean") {
      sip.stun_enabled = config.sipConfig.advanced.stunEnabled;
    }

    if (typeof config.sipConfig.advanced?.optionsEnabled === "boolean") {
      sip.send_options_enabled = config.sipConfig.advanced.optionsEnabled;
    }

    if (typeof config.sipConfig.advanced?.registrationMessageFrequencySeconds === "number") {
      sip.send_options_interval = config.sipConfig.advanced.registrationMessageFrequencySeconds;
    }

    if (typeof config.sipConfig.advanced?.maxRegistrationSeconds === "number") {
      sip.max_registration_seconds = config.sipConfig.advanced.maxRegistrationSeconds;
    }

    if (typeof config.sipConfig.advanced?.rtpPortMin === "number") {
      sip.rtp_port_min = config.sipConfig.advanced.rtpPortMin;
    }

    if (typeof config.sipConfig.advanced?.rtpPortMax === "number") {
      sip.rtp_port_max = config.sipConfig.advanced.rtpPortMax;
    }

    if (typeof config.sipConfig.advanced?.proxyEnabled === "boolean") {
      sip.proxy_enabled = config.sipConfig.advanced.proxyEnabled;
    }

    if (typeof config.sipConfig.advanced?.whitelistEnabled === "boolean") {
      sip.whitelist_enabled = config.sipConfig.advanced.whitelistEnabled;
    }

    if (config.sipConfig.authentication?.transportProtocol) {
      sip.transport_protocol = config.sipConfig.authentication.transportProtocol;
    }

    if (hasKeys(sip)) {
      params.sip = sip;
      syncedSections.push("sipConfig");
    }
  }

  if (config.sensorFlowConfig && hasKeys(config.sensorFlowConfig)) {
    params.gpio = config.sensorFlowConfig;
    syncedSections.push("sensorFlowConfig");
  }

  if (config.callConfig) {
    const calls: Record<string, unknown> = {};

    if (typeof config.callConfig.timings?.answerTimeoutSeconds === "number") {
      calls.answer_timeout_seconds = config.callConfig.timings.answerTimeoutSeconds;
    }

    if (typeof config.callConfig.timings?.maxConversationSeconds === "number") {
      calls.max_conversation_seconds = config.callConfig.timings.maxConversationSeconds;
    }

    if (typeof config.callConfig.advanced?.callLimitEnabled === "boolean") {
      calls.call_limit_enabled = config.callConfig.advanced.callLimitEnabled;
    }

    if (typeof config.callConfig.advanced?.autoAnswerEnabled === "boolean") {
      calls.auto_answer_enabled = config.callConfig.advanced.autoAnswerEnabled;
    }

    if (typeof config.callConfig.advanced?.relayDuringCallEnabled === "boolean") {
      calls.relay_during_call_enabled = config.callConfig.advanced.relayDuringCallEnabled;
    }

    if (typeof config.callConfig.advanced?.playPreambleEnabled === "boolean") {
      calls.play_preamble_enabled = config.callConfig.advanced.playPreambleEnabled;
    }

    if (hasKeys(calls)) {
      params.calls = calls;
      syncedSections.push("callConfig");
    }
  }

  for (const key of [
    "stateConfig",
    "relayConfig",
    "ledConfig",
    "multicastConfig",
    "taskConfig",
    "systemConfig",
  ] as const) {
    if (config[key]) {
      storedOnlySections.push(key);
    }
  }

  return {
    params,
    storedOnlySections,
    syncedSections,
  };
}
