import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function findCodexHome() {
  const envValue = process.env.CODEX_HOME;
  if (envValue !== undefined && envValue !== '') {
    const resolved = path.resolve(envValue);
    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch (err) {
      if (err?.code === 'ENOENT') {
        throw new Error(`CODEX_HOME points to "${envValue}", but that path does not exist`);
      }
      throw new Error(`failed to read CODEX_HOME "${envValue}": ${err?.message || err}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`CODEX_HOME points to "${envValue}", but that path is not a directory`);
    }
    try {
      return fs.realpathSync(resolved);
    } catch (err) {
      throw new Error(`failed to canonicalize CODEX_HOME "${envValue}": ${err?.message || err}`);
    }
  }

  return path.join(os.homedir(), '.codex');
}

export function getConfigPath() {
  const xdg = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(xdg, 'cxresume', 'config.json');
}

export async function loadConfig({ overrideCodexCmd, overrideRoot } = {}) {
  const p = getConfigPath();
  let fileCfg = {};
  try {
    const s = fs.readFileSync(p, 'utf8');
    fileCfg = JSON.parse(s);
  } catch {
    // ignore missing
  }

  return {
    codexCmd: 'codex',
    logsRoot: path.join(findCodexHome(), 'sessions'),
    preview: false,
    ...fileCfg,
    ...(overrideCodexCmd ? { codexCmd: overrideCodexCmd } : {}),
    ...(overrideRoot ? { logsRoot: overrideRoot } : {}),
  };
}

export function resolveLogsRoot(cfg) {
  const p = cfg.logsRoot;
  try {
    if (fs.existsSync(p)) return p;
    // Fallback to legacy singular path if it exists
    const legacy = p.replace(/sessions$/, 'session');
    if (legacy !== p && fs.existsSync(legacy)) return legacy;
  } catch {}
  return p;
}
