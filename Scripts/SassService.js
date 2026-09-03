//
// Sass Extension for Nova
// Sass.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class SassService {
	constructor() {
		this.remoteUnsupportedNotified = false;
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
        request.title = nova.localize("Dart Sass " + installation.version + " is available");
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

  async compileSassUpdate(editor) {
    
    var isWorkspaceEnable  = nova.workspace.config.get('VineCode.Sass.workspaceEnable');
    if (isWorkspaceEnable == false) { return }
    
    var source   = editor.document.path;
    
    // Check that this is enabled
    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss' &&
       source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'sass' ) { return }

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

    // Check for an output path
    var outputPath  = nova.workspace.config.get('VineCode.Sass.outputPath');
    if(outputPath && outputPath != 'null') {
        outputPath = this.resolveConfiguredPath(outputPath, sourceDirectory, useRelativePaths);
        path = path + ':' + outputPath;
    }

    var args = this.getArgs;
        args.push('--update');
        args.push(path);

    var options = { args: args };

    var process = new Process("/usr/bin/env", options);

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

      if(status == 0) {
        // Sass writes the generated file names to stdout when --update compiles
        // them. Restrict BOM cleanup to those files instead of rewriting every
        // CSS file in the output directory.
        stdOut.forEach(function(line) {
          var match = line.match(/\s+to\s+(.+\.css)\.\s*$/);
          if(match) {
            try {
              this.stripUtf8Bom(match[1]);
            } catch(error) {
              console.error('Could not remove the BOM from ' + match[1] + ': ' + error);
            }
          }
        }, this);

        // Deprecations and other warnings are written to stderr even when Sass
        // succeeds. Keep them visible without presenting them as compile errors.
        if(stdErr.length > 0) {
          console.warn(stdErr.join("\n"));
        }

        nova.notifications.cancel("sass-error");
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

    process.start();

    return true;
  }
}

module.exports = SassService;
