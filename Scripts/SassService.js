//
// Sass Extension for Nova
// Sass.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class SassService {
	constructor() {

	}

  get getArgs() {

    var cssStyle  = nova.workspace.config.get('VineCode.Sass.cssStyle');
    var errorCss  = nova.workspace.config.get('VineCode.Sass.errorCss');
    var sourceMap = nova.workspace.config.get('VineCode.Sass.sourceMap');
    var execPath  = nova.workspace.config.get('VineCode.Sass.execPath');

    if(!execPath) {
      execPath = 'sass';
    }

    execPath = execPath.replace(/(\s+)/g, '\\$1');

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

    if(sourceMap == 'Internal') {
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
  Update the file sets
  */

  async compileSassUpdate(editor) {
    
    var isWorkspaceEnabled  = nova.workspace.config.get('VineCode.Sass.workspaceEnable');
    if (isWorkspaceEnabled == false) { return }
    
    var source   = editor.document.path;
    
    // Check that this is enabled
    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss' &&
       source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'sass' ) { return }

    // Get the parent directory
    var path = source.substr(0, source.lastIndexOf("/"));

    // If the current directory is scss move up a level
    if(path.substr(path.lastIndexOf("/") + 1).toLowerCase() == 'scss') {
        path = path.substr(0, path.lastIndexOf("/"));
    }

    // Get the update scope
    var updatePath  = nova.workspace.config.get('VineCode.Sass.updatePath');
    if(updatePath && updatePath != 'null') {
      updatePath = updatePath.trim('/');
      path = nova.workspace.path + '/' + updatePath.replace(/^\/+/, '');
    }

    // Check for an output path
    var outputPath  = nova.workspace.config.get('VineCode.Sass.outputPath');
    if(outputPath && outputPath != 'null') {
        outputPath = outputPath.trim('/');
        path = path + ':' + nova.workspace.path + '/' + outputPath.replace(/^\/+/, '');
    }

    var args = this.getArgs;
        args.push('--update');
        args.push(path);

    var options = { args: args };

    var process = new Process("/usr/bin/env", options);

    var stdOut = new Array;
    process.onStdout(function(line) {
      stdOut.push(line.trim());
    });

    var stdErr = new Array;
    process.onStderr(function(line) {
      stdErr.push(line.trim());
    });

    process.onDidExit(function() {

      if(stdErr.length > 0) {

        if(nova._notificationTimer) {
          clearTimeout(nova._notificationTimer);
        }

        var message = stdErr[0] + "\n";
        if(stdErr.length > 1) {
          message = message + stdErr[stdErr.length-1];
        }

        let request = new NotificationRequest("sass-error");
        request.title = nova.localize("Sass Compile Error");
        request.body = nova.localize(stdErr[0] + "\n" + stdErr[stdErr.length-1]);
        request.actions = [nova.localize("Dismiss")];
        let promise = nova.notifications.add(request);

        // hide the notification after 5 seconds
        nova._notificationTimer = setTimeout(function() {
          nova.notifications.cancel("sass-error");
        }, 10000);

      } else {
        // Hide any notifications of the previous error
        nova.notifications.cancel("sass-error");
      }

    });

    process.start();

    return true;
  }
}

module.exports = SassService;