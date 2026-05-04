import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'bun:test';

import { findCodexHome, loadConfig } from '../src/utils/config.js';

async function withEnv(name, value, fn) {
  const original = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    await fn();
  } finally {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
}

test('findCodexHome uses CODEX_HOME when present', async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cxresume-home-'));
  await withEnv('CODEX_HOME', tempHome, async () => {
    const resolved = findCodexHome();
    assert.equal(resolved, tempHome);

    const cfg = await loadConfig();
    assert.equal(cfg.logsRoot, path.join(tempHome, 'sessions'));
  });
});

test('findCodexHome rejects missing CODEX_HOME paths', async () => {
  const tempHome = await fs.mkdtemp(path.join(os.tmpdir(), 'cxresume-home-'));
  const missingHome = path.join(tempHome, 'missing');

  await withEnv('CODEX_HOME', missingHome, async () => {
    assert.throws(() => findCodexHome(), /does not exist/);
    await assert.rejects(() => loadConfig(), /does not exist/);
  });
});

test('findCodexHome falls back to the user home directory when unset', async () => {
  await withEnv('CODEX_HOME', undefined, async () => {
    const resolved = findCodexHome();
    assert.equal(resolved, path.join(os.homedir(), '.codex'));

    const cfg = await loadConfig();
    assert.equal(cfg.logsRoot, path.join(os.homedir(), '.codex', 'sessions'));
  });
});
