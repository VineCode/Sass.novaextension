//
// Sass Extension for Nova
// main.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

const NovaSassService = require('./NovaSassService');

exports.activate = function() {
	const novaSass = new NovaSassService();

	// "Compile on Save"
	nova.workspace.onDidAddTextEditor(editor => {
		return editor.onWillSave(novaSass.compileSassUpdate.bind(novaSass));
	});

	// "Compile SCSS" Action
	nova.commands.register('novaSass.compileFile', novaSass.compileSassFile);

};
