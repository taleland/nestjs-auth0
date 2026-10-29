import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { generateNotes } from '@semantic-release/release-notes-generator';

test('release tooling renders conventional commits and breaking changes', async () => {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const config = JSON.parse(await readFile(new URL('../.releaserc.json', import.meta.url), 'utf8'));
  const [, options] = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === '@semantic-release/release-notes-generator');
  const notes = await generateNotes(options, {
    cwd,
    commits: [{ hash: 'a'.repeat(40), message: 'fix!: update memoization\n\nBREAKING CHANGE: Requires Node.js 22.' }],
    lastRelease: { gitTag: 'v3.0.0' },
    nextRelease: { version: '4.0.0', gitTag: 'v4.0.0' },
    options: { repositoryUrl: 'https://github.com/taleland/nestjs-auth0.git' },
  });
  assert.match(notes, /4\.0\.0/);
  assert.match(notes, /update memoization/);
  assert.match(notes, /Requires Node\.js 22/);
});
