//
// Sass Extension for Nova
// Sass.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

class NovaSassService {
	constructor(editorConfigService = null) {
		this.editorConfigService = editorConfigService;
	}

	get isCompileOnSavePreferenceEnabled() {
		return nova.config.get('VineCode.Sass.compileOnSave');
	}

  async compileSass(editor) {

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

    // Check that this is enabled
		if (!this.isCompileOnSavePreferenceEnabled) return;

    //
    var source = editor.document.path;
    if(source.slice((source.lastIndexOf(".") - 1 >>> 0) + 2) != 'scss') return;

    return this.compileSass(editor);
	}
}

module.exports = NovaSassService;
