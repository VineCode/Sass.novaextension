//
// Sass Extension for Nova
// main.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

const EditorConfigService = require('./EditorConfigService');
const NovaSassService = require('./NovaSassService');

exports.activate = function() {
	const editorConfigService = new EditorConfigService();
	const novaSass = new NovaSassService(editorConfigService);

	// "Compile on Save"
	nova.workspace.onDidAddTextEditor(editor => {
		return editor.onWillSave(novaSass.compileSassFile.bind(novaSass));
	});

	// "Compile SCSS" Action
	nova.commands.register('novaSass.compile', novaSass.compileSass);
};
