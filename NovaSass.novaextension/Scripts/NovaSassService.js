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
  
  get getArgs() {
    
    var cssStyle  = nova.config.get('VineCode.NovaSass.cssStyle');
    var errorCss  = nova.config.get('VineCode.NovaSass.errorCss');
    var sourceMap = nova.config.get('VineCode.NovaSass.sourceMap'); 
    var execPath  = nova.config.get('VineCode.NovaSass.execPath');       
    
    if(!execPath) {
      execPath = 'sass';
    }            
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
    
    if(sourceMap != 'Yes') {
      options.push('--no-source-map'); 
    }    
    
    if(sourceMap == 'Internal') {
      options.push('--embed-source-map'); 
    } else if(sourceMap == 'None') {
      options.push('–-no-source-map'); 
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
    
    var source   = editor.document.path;
    
    // Check that this is enabled
    if (!this.isCompileOnSavePreferenceEnabled) return;    
    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss') { return }

    var path = nova.workspace.path;
        
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
        
        var message = stdErr[0] + "\n" + stdErr[stdErr.length-1];
   
        let request = new NotificationRequest("invalid-file");      
        request.title = nova.localize("Sass Compile Error");
        request.body = nova.localize(stdErr[0] + "\n" + stdErr[stdErr.length-1]);  
        request.actions = [nova.localize("Dismiss")];        
        let promise = nova.notifications.add(request);
             
        // nova.workspace.showErrorMessage(message);
      } 
    });

    process.start();

    return true;
  }

  /*
  Compile an individual file
  */

	async compileSassFile(editor) {
console.log('sdsd');
    var source   = editor.document.path;
    var filename = source.split('\\').pop().split('/').pop();  
    var target   = source.replace('.scss', '.css');

    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss') {
      nova.workspace.showErrorMessage("This action can only be performed on scss files.");    
      return false;    
    };

    var args = this.getArgs;
    args.push(source);
    args.push(target);        

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
        var message = stdErr[0] + "\n" + stdErr[stdErr.length-1];      
        nova.workspace.showErrorMessage(message);
      }
    });

    process.start();   
    
    console.log('DONE'); 

    return;
	}
}

module.exports = NovaSassService;
