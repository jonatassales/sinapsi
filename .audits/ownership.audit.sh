#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

graph_tmp=$(mktemp -d "${TMPDIR:-/tmp}/graph-ownership-audit.XXXXXX")
trap 'rm -rf "$graph_tmp"' 0 1 2 15

node - "$ROOT" "$graph_tmp" <<'NODE'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync, spawnSync } = require('node:child_process')
const [root, temporary] = process.argv.slice(2)
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const pkg = JSON.parse(read('package.json'))
const pass = (message) => console.log(`PASS  ${message}`)

try {
  assert.equal(pkg.name, 'sinapsi', 'package must use the Sinapsi npm identity')
  assert.equal(pkg.author, 'jonatassales', 'author must use the owner handle without an invented email')
  assert.equal(pkg.repository?.url, 'git+https://github.com/jonatassales/sinapsi.git')
  assert.equal(pkg.bugs?.url, 'https://github.com/jonatassales/sinapsi/issues')
  assert.match(read('LICENSE'), /Copyright \(c\) 2026 Neongate AI/)
  pass('npm identity and GitHub metadata identify jonatassales; license identifies Neongate AI')

  const release = read('.github/workflows/release.yml')
  for (const token of [
    "github.repository == 'jonatassales/sinapsi' && github.ref == 'refs/heads/main'",
    "name !== 'sinapsi'",
    'sinapsi-$RELEASE_VERSION.tgz'
  ]) {
    assert.ok(release.includes(token), `release identity is missing: ${token}`)
  }
  pass('release owner guard and tarball use the Sinapsi package')

  const staleGithubOwner = /(?:github\.com[/:]|githubusercontent\.com\/|github\/actions\/workflow\/status\/)neongate(?:-ai)?\//i
  const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: root, encoding: 'utf8'
  }).split('\0').filter(Boolean)
  for (const file of new Set(files)) {
    const absolute = path.join(root, file)
    if (!fs.existsSync(absolute)) continue
    if (!fs.lstatSync(absolute).isFile()) continue
    const contents = fs.readFileSync(absolute)
    if (contents.includes(0)) continue
    const text = contents.toString('utf8')
    assert.ok(!staleGithubOwner.test(text), `obsolete GitHub ownership remains in active text: ${file}`)
  }
  pass('active text preserves npm identity and rejects obsolete GitHub ownership')

  const configuration = JSON.parse(read('src/sinapsi.config.json'))
  assert.equal(configuration.component.tagName, 'sinaps-i')
  assert.deepEqual(configuration.palette, {
    primary: '#F97316', text: '#F5F5F5', muted: '#A1A1AA'
  })
  pass('Sinapsi branding and canonical palette remain independent of GitHub ownership')

  const packageDirectory = path.join(temporary, 'package')
  const consumer = path.join(temporary, 'consumer project')
  const fixtureBin = path.join(temporary, 'bin')
  fs.mkdirSync(packageDirectory)
  fs.mkdirSync(consumer)
  fs.mkdirSync(fixtureBin)
  fs.cpSync(path.join(root, 'cli'), path.join(packageDirectory, 'cli'), { recursive: true })
  fs.copyFileSync(path.join(root, 'package.json'), path.join(packageDirectory, 'package.json'))
  const cli = path.join(packageDirectory, 'cli/graph')
  const manifest = path.join(consumer, 'package.json')
  const source = path.join(consumer, 'app.js')
  fs.writeFileSync(source, 'export const existingApplication = true\n')
  const initial = { name: 'graph-ownership-consumer', private: true }
  const reset = () => fs.writeFileSync(manifest, JSON.stringify(initial))
  const env = { ...process.env, PATH: `${fixtureBin}${path.delimiter}${process.env.PATH}`,
    GRAPH_PACKAGE_SPEC: '', GRAPH_FIXTURE_SKIP_WRITE: '0', GRAPH_FIXTURE_VERSION: pkg.version }

  const npm = path.join(fixtureBin, 'npm')
  fs.writeFileSync(npm, `#!/bin/sh
set -eu
[ "$#" -eq 3 ] && [ "$1" = install ] && [ "$2" = --save ]
[ "$3" = "sinapsi@$GRAPH_FIXTURE_VERSION" ]
[ "\${GRAPH_FIXTURE_SKIP_WRITE:-0}" != 1 ] || exit 0
node <<'FIXTURE'
const fs = require('node:fs')
const data = JSON.parse(fs.readFileSync('package.json', 'utf8'))
data.dependencies = { ...data.dependencies, 'sinapsi': process.env.GRAPH_FIXTURE_VERSION }
fs.writeFileSync('package.json', JSON.stringify(data))
FIXTURE
`)
  fs.chmodSync(npm, 0o755)
  const run = (args, options = {}) => spawnSync(cli, args, {
    cwd: consumer, env, encoding: 'utf8', ...options
  })
  reset()
  const installed = run(['--package-manager', 'npm'])
  assert.equal(installed.status, 0, installed.stderr)
  assert.equal(JSON.parse(fs.readFileSync(manifest, 'utf8')).dependencies?.[pkg.name], pkg.version)
  assert.ok(installed.stdout.includes("import 'sinapsi/browser'"))
  assert.ok(installed.stdout.includes('<sinaps-i'))
  assert.equal(fs.readFileSync(source, 'utf8'), 'export const existingApplication = true\n')
  assert.deepEqual(fs.readdirSync(consumer).sort(), ['app.js', 'package.json'])
  pass('published setup installs the Sinapsi package at its own version and preserves consumer source')

  const existing = { ...initial, dependencies: { [pkg.name]: '^0.1.0' } }
  const existingManifest = JSON.stringify(existing)
  fs.writeFileSync(manifest, existingManifest)
  const repeated = run(['--package-manager', 'npm'])
  assert.equal(repeated.status, 0, repeated.stderr)
  assert.equal(fs.readFileSync(manifest, 'utf8'), existingManifest)
  assert.ok(repeated.stdout.includes(`${pkg.name} is already a project dependency`))
  assert.equal(fs.readFileSync(source, 'utf8'), 'export const existingApplication = true\n')
  pass('existing published-package dependency is preserved without a reinstall or source changes')

  reset()
  const noWrite = run(['--package-manager', 'npm'], {
    env: { ...env, GRAPH_FIXTURE_SKIP_WRITE: '1' }
  })
  assert.equal(noWrite.status, 1, 'setup must reject a manager that did not add the new dependency')
  assert.ok(noWrite.stderr.includes('without adding sinapsi to dependencies'))
  for (const packageName of ['@neongate-ai/sinapsi', '@unrelated/sinapsi']) {
    const wrongPackage = run(['--package-spec', `${packageName}@1.0.0`, '--dry-run'])
    assert.equal(wrongPackage.status, 2, `setup must reject package scope: ${packageName}`)
  }
  fs.writeFileSync(manifest, JSON.stringify({ name: pkg.name }))
  assert.equal(run(['--dry-run']).status, 2, 'setup must reject installing into its own package')
  for (const command of ['cleanup', 'clean']) {
    assert.equal(run([command]).status, 2, `published ${command} must remain repository-only`)
  }
  pass('setup rejects missing dependency writes, other scopes and self-installation; cleanup stays repository-only')
} catch (error) {
  console.error(`FAIL  ${error.message}`)
  process.exit(1)
}
console.log('\nOwnership audit passed.')
NODE
