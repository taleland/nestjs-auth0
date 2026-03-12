import neostandard, { resolveIgnoresFromGitignore } from 'neostandard';

export default neostandard({
  ignores: resolveIgnoresFromGitignore(),
  noJsx: true,
  semi: true,
  ts: true,
});
