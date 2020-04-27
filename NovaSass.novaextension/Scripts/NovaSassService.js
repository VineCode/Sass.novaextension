//
// Sass Extension for Nova
// Sass.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class NovaSassService {
	constructor() {

	}

	get isCompileOnSavePreferenceEnabled() {
		return nova.config.get('VineCode.NovaSass.compileOnSave');
	}

  async compileSassUpdate(editor) {
    
    // Check that this is enabled
    if (!this.isCompileOnSavePreferenceEnabled) return;    

    console.log('Compile scss');

    var path = nova.workspace.path;
    var options = {
      args: ["sass", "--update",  path]
    };

    var process = new Process("/usr/bin/env", options);
    process.onStdout(function(line) {
        console.log("Running " + line);
    });

    process.start();

    return true;
  }

	async compileSassFile(editor) {

    var source   = editor.document.path;
    var filename = source.split('\\').pop().split('/').pop();  
    var target   = source.replace('.scss', '.css');

    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss') {
      let request = new NotificationRequest("invalid-file");      
      request.title = nova.localize("Non valid file type");
      request.body = nova.localize("This action can only be performed on scss files.");  
      request.actions = [nova.localize("OK")];
          
      let promise = nova.notifications.add(request);
          
      return false;    
    };

    console.log("File Path " + source);
    console.log("File Name " + filename);    
    console.log("Target " + target);  
    
    var path = nova.workspace.path;
    var options = {
      args: ["sass", source,  target]
    };

    var process = new Process("/usr/bin/env", options);
    process.onStdout(function(line) {
        console.log("Running " + line);
    });

    process.start();    

    return;
	}
}

module.exports = NovaSassService;
