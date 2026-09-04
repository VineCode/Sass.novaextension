// Run with: node Support/tests.cjs
// Nova APIs are mocked; compilation uses the installed Dart Sass executable.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-sass-tests-'));
const config = Object.fromEntries(require('../extension.json').configWorkspace
  .flatMap(item => item.children || [item])
  .filter(item => item.key).map(item => [item.key, item.default]));
const notices = [];
const launches = [];
global.NotificationRequest = class { constructor(id) { this.id = id; } };
global.Issue = class {};
global.IssueSeverity = { Error: 0, Warning: 1 };
global.IssueCollection = class {
  constructor() { this.items = new Map(); }
  clear() { this.items.clear(); }
  set(uri, issues) { this.items.set(uri, issues); }
  dispose() { this.clear(); }
};
global.nova = {
  localize: value => value, path,
  workspace: { path: root, textEditors: [], config: {
    get: key => config[key], set: (key, value) => config[key] = value
  } },
  fs: {
    X_OK: fs.constants.X_OK,
    access(file, mode) { try { fs.accessSync(file, mode); return true; } catch { return false; } },
    open(file, mode) {
      return {
        read() { const b = fs.readFileSync(file); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); },
        write(value) { fs.writeFileSync(file, Buffer.from(value)); }, close() {}
      };
    }
  },
  notifications: { add: n => { notices.push(n); return new Promise(() => {}); }, cancel() {} }
};
global.Process = class {
  constructor(command, options) { this.command = command; this.options = options; }
  onStdout(fn) { this.out = fn; }
  onStderr(fn) { this.err = fn; }
  onDidExit(fn, context) { this.exit = fn.bind(context); }
  start() {
    launches.push(this.options);
    const result = spawnSync(this.command, this.options.args, { cwd: this.options.cwd, encoding: 'utf8' });
    if(result.error) { throw result.error; }
    for(const line of result.stdout.split('\n').filter(Boolean)) { this.out(line); }
    for(const line of result.stderr.split('\n').filter(Boolean)) { this.err(line); }
    this.exit(result.status);
  }
};
const Service = require('../Scripts/SassService');
function issues(service) { return [...service.issues.items.values()].flat(); }
(async () => {
  try {
    const folder = path.join(root, 'source with spaces');
    fs.mkdirSync(folder);
    const source = path.join(folder, 'main.scss');
    fs.writeFileSync(source, '.test { content: "é"; }');
    const editor = { document: { path: source, isDirty: false, isRemote: false } };
    nova.workspace.activeTextEditor = editor;
    nova.workspace.textEditors = [editor];
    config['VineCode.Sass.workspaceEnable'] = false;
    config['VineCode.Sass.cssStyle'] = 'Compressed';
    const service = new Service();
    assert.equal(config['VineCode.Sass.workspaceEnable'], 'Off', 'legacy checkbox migrated');
    await service.compileSassUpdate(editor);
    assert.equal(launches.length, 0, 'automatic compilation disabled');
    await service.compileManually();
    assert(launches.at(-1).args.includes('--update'));
    const css = source.replace('.scss', '.css');
    assert(fs.readFileSync(css, 'utf8').includes('é'));
    assert(!fs.readFileSync(css).subarray(0, 3).equals(Buffer.from([239, 187, 191])));
    // An unchanged input is deliberately not updated.
    fs.writeFileSync(css, 'sentinel');
    await service.compileManually();
    assert.equal(fs.readFileSync(css, 'utf8'), 'sentinel');
    config['VineCode.Sass.updatePath'] = 'source with spaces/main.scss';
    fs.unlinkSync(css);
    await service.compileManually();
    assert.equal(launches.at(-1).args.at(-1), source + ':' + css);
    assert(!fs.readFileSync(css, 'utf8').startsWith('\uFEFF'));
    editor.document.isDirty = true;
    const count = launches.length;
    await service.compileManually();
    assert.equal(launches.length, count);
    editor.document.isDirty = false;
    editor.document.isRemote = true;
    await service.compileManually();
    assert.equal(launches.length, count);
    editor.document.isRemote = false;
    const partial = path.join(folder, '_partial.scss');
    fs.writeFileSync(partial, '.test { color: $missing; }');
    fs.writeFileSync(source, '@use "partial";');
    fs.unlinkSync(css);
    await service.compileManually();
    assert.equal(issues(service).length, 1);
    assert.equal(issues(service)[0].severity, IssueSeverity.Error);
    assert([...service.issues.items.keys()][0].endsWith('/_partial.scss'));
    assert.equal(issues(service)[0].line, 1);
    assert(issues(service)[0].column > 1);
    fs.writeFileSync(partial, '.test { color: red; }');
    fs.unlinkSync(css);
    await service.compileManually();
    assert.equal(issues(service).length, 0, 'resolved issues cleared');
    fs.writeFileSync(source, '@warn "test warning"; .test {color: red}');
    fs.unlinkSync(css);
    await service.compileManually();
    assert.equal(issues(service)[0].severity, IssueSeverity.Warning);
    // Out-of-order results cannot replace the latest results for a scope.
    service.runNumbers.set('older', 2);
    service.updateIssues(['Error: stale', 'main.scss 1:1 root stylesheet'], root, 'older', 1);
    assert(!issues(service).some(issue => issue.message === 'stale'));
    console.log('PASS: real Sass incremental builds, file/directory scopes, BOM removal, dirty/remote guards, partial errors, clearing, warnings, stale results.');
    service.runNumbers.set('deprecations', 1);
    service.updateIssues([
      'DEPRECATION WARNING [import]: Deprecated import', 'main.scss 1:1 root stylesheet',
      'DEPRECATION WARNING: Older format', 'main.scss 2:1 root stylesheet',
      'Error: Keep this error', 'main.scss 3:1 root stylesheet'
    ], root, 'deprecations', 1);
    assert.equal(issues(service).filter(i => /Deprecated import|Older format/.test(i.message)).length, 2);
    config['VineCode.Sass.showDeprecationWarnings'] = 'Off';
    service.publishIssues();
    assert(!issues(service).some(i => /Deprecated import|Older format/.test(i.message)));
    assert(issues(service).some(i => i.message === 'Keep this error'));
    assert(issues(service).some(i => i.message === 'test warning'));
    config['VineCode.Sass.showDeprecationWarnings'] = 'On';
    service.publishIssues();
    assert.equal(issues(service).filter(i => /Deprecated import|Older format/.test(i.message)).length, 2);
    console.log('PASS: deprecations default on, hide/restore without rebuilding, retain errors and ordinary warnings.');
    service.dispose();
  } finally {
    if(nova._notificationTimer) { clearTimeout(nova._notificationTimer); }
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
