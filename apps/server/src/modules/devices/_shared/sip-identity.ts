export function sanitizeSipToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
}

export function buildGroupScopedSipUser(input: {
  groupKey: string;
  extension: string;
}) {
  return sanitizeSipToken(`${input.groupKey}_${input.extension}`);
}
