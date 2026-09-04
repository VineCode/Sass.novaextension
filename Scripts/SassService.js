//
// Sass Extension for Nova
// Sass.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class SassService {
	constructor() {
		// Keep preferences saved by the former checkbox controls.
		for(const key of ['VineCode.Sass.workspaceEnable', 'VineCode.Sass.showDeprecationWarnings']) {
			const value = nova.workspace.config.get(key);
			if(typeof value === 'boolean') { nova.workspace.config.set(key, value ? 'On' : 'Off'); }
		}
		this.remoteUnsupportedNotified = false;
		this.issues = new IssueCollection('Sass');
		this.issueRuns = new Map();
		this.runNumbers = new Map();
	}

  dispose() {
    this.disposed = true;
    this.issues.dispose();
  }

  notify(message) {
    let request = new NotificationRequest('sass-command');
    request.title = 'Sass';
    request.body = message;
    nova.notifications.add(request);
  }

  compileManually() {
    const editor = nova.workspace.activeTextEditor;
    if(!editor || !editor.document.path || !/\.(scss|sass)$/i.test(editor.document.path)) {
      this.notify('Open a saved .scss or .sass file first. Its project settings determine the compilation scope.');
      return;
    }
    if(editor.document.isRemote) {
      this.notifyRemoteUnsupported();
      return;
    }
    // Partials elsewhere in the workspace may be dependencies. Do not silently
    // compile their older on-disk contents or save unrelated documents for users.
    const editors = nova.workspace.textEditors || [editor];
    if(editors.some(item => !item.document.isRemote && item.document.isDirty &&
        (/\.(scss|sass|css)$/i.test(item.document.path || '') || item === editor))) {
      this.notify('Save your modified Sass/CSS files, then run the compile command again.');
      return;
    }
    return this.compileSassUpdate(editor, { manual: true });
  }

  updateIssues(lines, workingDirectory, scope, runNumber) {
    if(this.disposed || this.runNumbers.get(scope) !== runNumber) { return; }
    const results = [];
    let diagnostic = null;
    let inSnippet = false;
    for(const raw of lines) {
      const line = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
      const header = line.match(/^(Error|WARNING|DEPRECATION WARNING(?:\s*\[[^\]]+\])?):\s*(.*)$/i);
      if(header) {
        diagnostic = { message: header[2], warning: header[1].toLowerCase() !== 'error',
          deprecation: /^DEPRECATION WARNING/i.test(header[1]) };
        inSnippet = false;
        continue;
      }
      if(!diagnostic) { continue; }
      // The first stack frame is the actual source, including imported partials.
      const location = line.match(/^(.+?)\s+(\d+):(\d+)\s+.+$/);
      if(location) {
        let path = location[1];
        if(path.startsWith('file://')) {
          try { path = decodeURIComponent(path.slice(7)); } catch(error) { diagnostic = null; continue; }
        }
        if(!/^[a-z]+:/i.test(path)) {
          if(path.charAt(0) !== '/') { path = nova.path.join(workingDirectory, path); }
          path = nova.path.normalize(path);
          const issue = new Issue();
          issue.message = diagnostic.message || 'Sass diagnostic';
          issue.source = 'Dart Sass';
          issue.severity = diagnostic.warning ? IssueSeverity.Warning : IssueSeverity.Error;
          issue.line = Number(location[2]);
          issue.column = Number(location[3]);
          const uri = 'file://' + path.split('/').map(encodeURIComponent).join('/');
          results.push({ uri: uri, issue: issue, deprecation: diagnostic.deprecation });
        }
        diagnostic = null;
      } else if(/[╷╵│]/.test(line)) {
        inSnippet = true;
      } else if(line && !inSnippet) {
        diagnostic.message += (diagnostic.message ? '\n' : '') + line;
      }
    }
    // Retain issues from other compilation scopes, replacing only this run's.
    this.issueRuns.set(scope, results);
    this.publishIssues();
  }

  publishIssues() {
    if(this.disposed) { return; }
    const preference = nova.workspace.config.get('VineCode.Sass.showDeprecationWarnings');
    const showDeprecations = preference !== false && preference !== 'Off';
    this.issues.clear();
    const grouped = new Map();
    for(const entries of this.issueRuns.values()) {
      for(const entry of entries) {
        if(entry.deprecation && !showDeprecations) { continue; }
        const existing = grouped.get(entry.uri) || [];
        if(!existing.some(issue => issue.line === entry.issue.line &&
            issue.column === entry.issue.column && issue.message === entry.issue.message &&
            issue.severity === entry.issue.severity)) { existing.push(entry.issue); }
        grouped.set(entry.uri, existing);
      }
    }
    for(const [uri, issues] of grouped) { this.issues.set(uri, issues); }
  }

  notifyRemoteUnsupported() {
    if(this.remoteUnsupportedNotified) { return; }

    this.remoteUnsupportedNotified = true;

    let request = new NotificationRequest("sass-remote-unsupported");
    request.title = nova.localize("Sass is disabled for remote projects");
    request.body = nova.localize("Sass requires a local project. Compile locally and use Nova Publishing to upload the generated CSS.");
    request.actions = [nova.localize("Dismiss")];
    nova.notifications.add(request);
  }

  get executablePath() {
    var configuredPath = nova.workspace.config.get('VineCode.Sass.execPath');
    if(configuredPath) { return configuredPath; }

    var standardPaths = [
      '/opt/homebrew/bin/sass',
      '/usr/local/bin/sass'
    ];

    for(var index = 0; index < standardPaths.length; index++) {
      if(nova.fs.access(standardPaths[index], nova.fs.X_OK)) {
        return standardPaths[index];
      }
    }

    // Fall back to the process environment for other installations.
    return 'sass';
  }

  checkSassVersion(executablePath) {
    return new Promise(function(resolve) {
      var command = executablePath == 'sass' ? '/usr/bin/env' : executablePath;
      var args = executablePath == 'sass' ? ['sass', '--version'] : ['--version'];
      var process;

      try {
        process = new Process(command, { args: args });
      } catch(error) {
        resolve(null);
        return;
      }

      var output = [];
      process.onStdout(function(line) { output.push(line.trim()); });
      process.onStderr(function(line) { output.push(line.trim()); });
      process.onDidExit(function(status) {
        if(status == 0 && output.length > 0) {
          resolve({ path: executablePath, version: output[0] });
        } else {
          resolve(null);
        }
      });

      try {
        process.start();
      } catch(error) {
        resolve(null);
      }
    });
  }

  findSassInstallations() {
    var configuredPath = nova.workspace.config.get('VineCode.Sass.execPath');
    var candidates = [configuredPath, '/opt/homebrew/bin/sass', '/usr/local/bin/sass', 'sass'];
    var uniqueCandidates = candidates.filter(function(path, index, paths) {
      return path && paths.indexOf(path) == index;
    });

    return Promise.all(uniqueCandidates.map(this.checkSassVersion.bind(this))).then(function(results) {
      return results.filter(function(result) { return result != null; });
    });
  }

  resolveExecutables() {
    return this.findSassInstallations().then(function(installations) {
      if(installations.length == 0) {
        return [['', 'Sass not found — enter a custom path']];
      }

      // Dynamic enum choices do not select themselves. Persist the preferred
      // detected installation when this workspace has no existing selection.
      if(!nova.workspace.config.get('VineCode.Sass.execPath')) {
        nova.workspace.config.set('VineCode.Sass.execPath', installations[0].path);
      }

      return installations.map(function(installation) {
        var location = installation.path == 'sass' ? 'sass from Nova PATH' : installation.path;
        return [installation.path, 'Dart Sass ' + installation.version + ' — ' + location];
      });
    });
  }

  checkInstallation() {
    var executablePath = this.executablePath;

    return this.checkSassVersion(executablePath).then(function(installation) {
      let request = new NotificationRequest("sass-installation-status");

      if(installation) {
        var location = installation.path == 'sass' ? 'Nova process PATH' : installation.path;
        request.title = nova.localize("Dart Sass " + installation.version + " is installed");
        request.body = nova.localize("Executable: " + location);
      } else {
        request.title = nova.localize("Sass executable not found");
        request.body = nova.localize("Install Dart Sass or select its absolute path in the Sass project settings.");
      }

      request.actions = [nova.localize("Dismiss")];
      // Do not return the notification promise. It remains pending until the
      // notification is dismissed, which would leave the settings button's
      // progress spinner running and report a helper communication error when
      // the user cancelled it.
      nova.notifications.add(request);
    });
  }

  get getArgs() {

    var cssStyle  = nova.workspace.config.get('VineCode.Sass.cssStyle');
    var errorCss  = nova.workspace.config.get('VineCode.Sass.errorCss');
    var sourceMap = nova.workspace.config.get('VineCode.Sass.sourceMap');
    var execPath  = this.executablePath;

    var options = [];

    options.push(execPath);

    if(cssStyle == 'Compressed') {
      options.push('--style=compressed');
    } else {
      options.push('--style=expanded');
    }

    if(errorCss == 'Yes') {
      options.push('--error-css');
    }  else {
      options.push('--no-error-css');
    }

    if(sourceMap == 'Embedded') {
      options.push('--embed-source-map');
    } else if(sourceMap == 'None') {
      options.push('--no-source-map');
    } else {
      // The default it is generate
      // one externally
    }

    return options;
  }

  /*
  Remove a UTF-8 byte order mark from a generated CSS file.
  */

  stripUtf8Bom(path) {
    var input = nova.fs.open(path, 'rb');
    var contents;

    try {
      contents = input.read();
    } finally {
      input.close();
    }

    if(!contents) { return false; }

    var bytes = new Uint8Array(contents);
    if(bytes.length < 3 || bytes[0] != 0xEF || bytes[1] != 0xBB || bytes[2] != 0xBF) {
      return false;
    }

    var output = nova.fs.open(path, 'wb');
    try {
      output.write(contents.slice(3));
    } finally {
      output.close();
    }

    return true;
  }

  resolveConfiguredPath(configuredPath, sourceDirectory, useRelativePaths) {
    if(useRelativePaths) {
      // A leading slash historically meant "from the workspace root". Remove
      // it in relative mode so all configured values remain file-relative.
      configuredPath = configuredPath.trim().replace(/^\/+/, '');
      return nova.path.normalize(nova.path.join(sourceDirectory, configuredPath));
    }

    // Preserve the original workspace-relative behaviour for existing users.
    configuredPath = configuredPath.trim('/');
    return nova.workspace.path + '/' + configuredPath.replace(/^\/+/, '');
  }

  /*
  Update the file sets
  */

  async compileSassUpdate(editor, requestOptions = {}) {
    
    var isWorkspaceEnable  = nova.workspace.config.get('VineCode.Sass.workspaceEnable');
    if ((isWorkspaceEnable === false || isWorkspaceEnable === 'Off') && !requestOptions.manual) { return }
    if(editor.document.isRemote) { this.notifyRemoteUnsupported(); return; }
    
    var source   = editor.document.path;
    if(!source) { return; }
    
    // Check that this is enabled
    if(!/\.(scss|sass)$/i.test(source)) { return; }

    // Get the parent directory
    var sourceDirectory = source.substr(0, source.lastIndexOf("/"));
    var path = sourceDirectory;

    // If the current directory is scss move up a level
    if(path.substr(path.lastIndexOf("/") + 1).toLowerCase() == 'scss') {
        path = path.substr(0, path.lastIndexOf("/"));
    }

    var useRelativePaths = nova.workspace.config.get('VineCode.Sass.relativePaths') == true;

    // Get the update scope
    var updatePath  = nova.workspace.config.get('VineCode.Sass.updatePath');
    if(updatePath && updatePath != 'null') {
      path = this.resolveConfiguredPath(updatePath, sourceDirectory, useRelativePaths);
    }

    const compilationInput = path;
    // Check for an output path
    var outputPath  = nova.workspace.config.get('VineCode.Sass.outputPath');
    if(outputPath && outputPath != 'null') {
        outputPath = this.resolveConfiguredPath(outputPath, sourceDirectory, useRelativePaths);
        path = path + ':' + outputPath;
    } else if(/\.(scss|sass)$/i.test(path)) {
        // A single-file update needs an explicit output, otherwise Sass tries
        // stdout and rejects --update. Default to CSS beside the input file.
        path = path + ':' + path.replace(/\.(scss|sass)$/i, '.css');
    }

    var args = this.getArgs;
        args.push('--no-color');
        args.push('--update');
        args.push(path);

    // Sass may print output paths relative to its working directory. Capture
    // the same base for the process and subsequent filesystem cleanup.
    var workingDirectory = nova.workspace.path || sourceDirectory;
    var options = { args: args, cwd: workingDirectory };

    const scope = workingDirectory + '\n' + nova.path.normalize(compilationInput);
    const runNumber = (this.runNumbers.get(scope) || 0) + 1;
    this.runNumbers.set(scope, runNumber);
    let process;
    try {
      process = new Process("/usr/bin/env", options);
    } catch(error) {
      console.error(error);
      this.notify('Could not launch Sass: ' + error);
      return false;
    }

    var stdOut = new Array;
    process.onStdout(function(line) {
      line = line.trim();
      stdOut.push(line);
      if(line) { console.log(line); }
    });

    var stdErr = new Array;
    process.onStderr(function(line) {
      stdErr.push(line.trim());
    });

    process.onDidExit(function(status) {

      this.updateIssues(stdErr, workingDirectory, scope, runNumber);

      if(status == 0) {
        // Sass writes the generated file names to stdout when --update compiles
        // them. Restrict BOM cleanup to those files instead of rewriting every
        // CSS file in the output directory.
        stdOut.forEach(function(line) {
          var match = line.match(/\s+to\s+(.+\.css)\.\s*$/);
          if(match) {
            var cssPath = match[1];
            if(cssPath.charAt(0) != '/') {
              cssPath = nova.path.normalize(nova.path.join(workingDirectory, cssPath));
            }
            try {
              this.stripUtf8Bom(cssPath);
            } catch(error) {
              console.error('Could not remove the BOM from ' + cssPath + ': ' + error);
            }
          }
        }, this);

        // Deprecations and other warnings are written to stderr even when Sass
        // succeeds. Keep them visible without presenting them as compile errors.
        if(stdErr.length > 0) {
          console.warn(stdErr.join("\n"));
        }

        nova.notifications.cancel("sass-error");
        if(requestOptions.manual) {
          this.notify('Sass update completed (unchanged outputs may be skipped).');
        }
        return;
      }

      if(stdErr.length > 0) {

        console.error(stdErr.join("\n"));

        if(nova._notificationTimer) {
          clearTimeout(nova._notificationTimer);
        }

        let request = new NotificationRequest("sass-error");
        request.title = nova.localize("Sass Compile Error");
        request.body = nova.localize(stdErr[0] + "\n" + stdErr[stdErr.length-1]);
        request.actions = [nova.localize("Dismiss")];
        nova.notifications.add(request);

        // hide the notification after 5 seconds
        nova._notificationTimer = setTimeout(function() {
          nova.notifications.cancel("sass-error");
        }, 10000);

      }

      if(stdErr.length == 0) {
        var message = "Sass exited with status " + status + " without an error message.";
        console.error(message);

        let request = new NotificationRequest("sass-error");
        request.title = nova.localize("Sass Compile Error");
        request.body = nova.localize(message);
        request.actions = [nova.localize("Dismiss")];
        nova.notifications.add(request);
      }

    }, this);

    try {
      process.start();
    } catch(error) {
      console.error(error);
      this.notify('Could not launch Sass: ' + error);
      return false;
    }

    return true;
  }
}

module.exports = SassService;
