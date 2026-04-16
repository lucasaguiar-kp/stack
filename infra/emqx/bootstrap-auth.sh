#!/bin/sh

set -eu

BOOTSTRAP_FILE="/opt/emqx/etc/stack-pbx-auth-bootstrap.csv"
BASE_HOCON="/opt/emqx/etc/base.hocon"

if [ -n "${MQTT_BROKER_USERNAME:-}" ] && [ -n "${MQTT_BROKER_PASSWORD:-}" ]; then
  cat >"$BOOTSTRAP_FILE" <<EOF
user_id,password,is_superuser
${MQTT_BROKER_USERNAME},${MQTT_BROKER_PASSWORD},false
EOF

  cat >>"$BASE_HOCON" <<'EOF'

authentication = [
  {
    enable = true
    backend = built_in_database
    mechanism = password_based
    user_id_type = username
    bootstrap_file = "/opt/emqx/etc/stack-pbx-auth-bootstrap.csv"
    bootstrap_type = plain
  }
]
EOF
elif [ -n "${MQTT_BROKER_USERNAME:-}" ] || [ -n "${MQTT_BROKER_PASSWORD:-}" ]; then
  echo "stack-pbx: defina MQTT_BROKER_USERNAME e MQTT_BROKER_PASSWORD juntos para habilitar autenticacao no EMQX" >&2
fi

exec /usr/bin/docker-entrypoint.sh /opt/emqx/bin/emqx foreground
