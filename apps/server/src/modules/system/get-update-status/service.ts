import { env } from "@stack-pbx/env/server";
import type { Output } from "./schema";

function parseGitHubRepository(remoteUrl: string): { owner: string; repo: string } | null {
  const normalized = remoteUrl.trim();
  const sshMatch = normalized.match(/^git@github\.com:(.+?)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    const owner = sshMatch[1];
    const repo = sshMatch[2];

    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  }

  try {
    const url = new URL(normalized);
    if (url.hostname !== "github.com") {
      return null;
    }

    const [owner, repo] = url.pathname.replace(/^\/+/, "").replace(/\.git$/, "").split("/");
    if (!owner || !repo) {
      return null;
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

function normalizeVersion(version: string | null | undefined) {
  return version?.trim().replace(/^v/i, "") || null;
}

function compareVersionPart(left: string, right: string) {
  const leftNumber = Number.parseInt(left.replace(/\D.*$/, ""), 10);
  const rightNumber = Number.parseInt(right.replace(/\D.*$/, ""), 10);

  if (Number.isNaN(leftNumber) || Number.isNaN(rightNumber)) {
    return left.localeCompare(right);
  }

  return leftNumber - rightNumber;
}

function compareVersions(left: string | null, right: string | null) {
  if (!left || !right) {
    return 0;
  }

  const leftParts = left.split(/[.-]/);
  const rightParts = right.split(/[.-]/);
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const result = compareVersionPart(leftParts[index] ?? "0", rightParts[index] ?? "0");
    if (result !== 0) {
      return result;
    }
  }

  return 0;
}

function buildUpdateCommand(installerDownloadUrl: string | null) {
  return installerDownloadUrl
    ? `Start-Process "${installerDownloadUrl}"`
    : "Abra a ultima release do GitHub e execute o instalador mais recente.";
}

function buildStatus(input: Partial<Output> & Pick<Output, "checkedAt">): Output {
  return {
    isConfigured: input.isConfigured ?? false,
    hasUpdate: input.hasUpdate ?? false,
    repository: input.repository ?? null,
    branch: input.branch ?? null,
    currentVersion: input.currentVersion ?? null,
    latestVersion: input.latestVersion ?? null,
    latestTag: input.latestTag ?? null,
    currentCommit: input.currentCommit ?? null,
    latestCommit: input.latestCommit ?? null,
    installDirectory: input.installDirectory ?? null,
    updateCommand: input.updateCommand ?? buildUpdateCommand(input.installerDownloadUrl ?? null),
    releaseUrl: input.releaseUrl ?? null,
    installerDownloadUrl: input.installerDownloadUrl ?? null,
    installerAssetName: input.installerAssetName ?? null,
    unavailableReason: input.unavailableReason ?? null,
    checkedAt: input.checkedAt,
  };
}

export async function getUpdateStatus(): Promise<Output> {
  const checkedAt = new Date().toISOString();
  const repository = env.APP_GIT_REMOTE_URL ?? null;
  const branch = env.APP_GIT_BRANCH ?? null;
  const currentCommit = env.APP_CURRENT_COMMIT ?? null;
  const currentVersion = normalizeVersion(env.APP_VERSION ?? null);
  const installDirectory = env.APP_INSTALL_DIR ?? null;

  if (!repository || !currentVersion) {
    return buildStatus({
      checkedAt,
      repository,
      branch,
      currentCommit,
      currentVersion,
      installDirectory,
      unavailableReason: "Dados de atualizacao ainda nao foram configurados no runtime.",
    });
  }

  const githubRepository = parseGitHubRepository(repository);

  if (!githubRepository) {
    return buildStatus({
      checkedAt,
      repository,
      branch,
      currentCommit,
      currentVersion,
      installDirectory,
      unavailableReason: "A verificacao automatica suporta apenas repositorios publicos no GitHub.",
    });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubRepository.owner}/${githubRepository.repo}/releases/latest`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "stack-pbx-update-check",
        },
      },
    );

    if (!response.ok) {
      throw new Error(`GitHub responded with ${response.status}`);
    }

    const data = (await response.json()) as {
      assets?: Array<{
        browser_download_url?: string;
        name?: string;
      }>;
      html_url?: string;
      tag_name?: string;
      target_commitish?: string;
    };
    const latestTag = data.tag_name ?? null;
    const latestVersion = normalizeVersion(latestTag);
    const installerAsset =
      data.assets?.find((asset) => asset.name?.toLowerCase().endsWith("-setup.exe")) ??
      data.assets?.find((asset) => asset.name?.toLowerCase().endsWith(".exe")) ??
      null;
    const installerDownloadUrl = installerAsset?.browser_download_url ?? null;
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0;

    return buildStatus({
      isConfigured: latestVersion !== null,
      hasUpdate,
      repository,
      branch,
      currentVersion,
      latestVersion,
      latestTag,
      currentCommit,
      latestCommit: data.target_commitish ?? null,
      installDirectory,
      updateCommand: buildUpdateCommand(installerDownloadUrl),
      releaseUrl: data.html_url ?? null,
      installerDownloadUrl,
      installerAssetName: installerAsset?.name ?? null,
      unavailableReason:
        latestVersion && installerDownloadUrl
          ? null
          : "Nao foi possivel localizar um instalador .exe na ultima release.",
      checkedAt,
    });
  } catch {
    return buildStatus({
      checkedAt,
      repository,
      branch,
      currentCommit,
      currentVersion,
      installDirectory,
      unavailableReason: "Nao foi possivel consultar o GitHub para verificar releases.",
    });
  }
}
