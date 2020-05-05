//
// Sass Extension for Nova
// main.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

const SassService = require('./SassService');

exports.activate = function() {
	const Sass = new SassService();

	// "Compile on Save"
	nova.workspace.onDidAddTextEditor(editor => {
		return editor.onWillSave(Sass.compileSassUpdate.bind(Sass));
	});
};
