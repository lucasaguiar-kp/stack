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

function buildUpdateCommand() {
  if (env.APP_INSTALL_DIR) {
    return `cd "${env.APP_INSTALL_DIR}"\npowershell -ExecutionPolicy Bypass -File ".\\update-windows.ps1"`;
  }

  return 'powershell -ExecutionPolicy Bypass -File ".\\update-windows.ps1"';
}

export async function getUpdateStatus(): Promise<Output> {
  const checkedAt = new Date().toISOString();
  const updateCommand = buildUpdateCommand();
  const repository = env.APP_GIT_REMOTE_URL ?? null;
  const branch = env.APP_GIT_BRANCH ?? null;
  const currentCommit = env.APP_CURRENT_COMMIT ?? null;
  const installDirectory = env.APP_INSTALL_DIR ?? null;

  if (!repository || !branch || !currentCommit) {
    return {
      isConfigured: false,
      hasUpdate: false,
      repository,
      branch,
      currentCommit,
      latestCommit: null,
      installDirectory,
      updateCommand,
      unavailableReason: "Dados de atualizacao ainda nao foram configurados no .env.",
      checkedAt,
    };
  }

  const githubRepository = parseGitHubRepository(repository);

  if (!githubRepository) {
    return {
      isConfigured: false,
      hasUpdate: false,
      repository,
      branch,
      currentCommit,
      latestCommit: null,
      installDirectory,
      updateCommand,
      unavailableReason: "A verificacao automatica suporta apenas repositórios publicos no GitHub.",
      checkedAt,
    };
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${githubRepository.owner}/${githubRepository.repo}/commits/${branch}`,
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

    const data = (await response.json()) as { sha?: string };
    const latestCommit = data.sha ?? null;

    return {
      isConfigured: latestCommit !== null,
      hasUpdate: latestCommit !== null && latestCommit !== currentCommit,
      repository,
      branch,
      currentCommit,
      latestCommit,
      installDirectory,
      updateCommand,
      unavailableReason: latestCommit ? null : "Nao foi possivel determinar o commit remoto.",
      checkedAt,
    };
  } catch {
    return {
      isConfigured: false,
      hasUpdate: false,
      repository,
      branch,
      currentCommit,
      latestCommit: null,
      installDirectory,
      updateCommand,
      unavailableReason: "Nao foi possivel consultar o GitHub para verificar atualizacoes.",
      checkedAt,
    };
  }
}
