//
// Sass Extension for Nova
// main.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

const SassService = require('./SassService');

exports.activate = function() {
	const Sass = new SassService();
	nova.subscriptions.add(Sass);
	Sass.startMenuAvailability();
	nova.subscriptions.add(nova.workspace.config.onDidChange(
		'VineCode.Sass.showDeprecationWarnings', () => Sass.publishIssues()));

	nova.commands.register('VineCode.Sass.resolveExecutables', Sass.resolveExecutables.bind(Sass));
	nova.commands.register('VineCode.Sass.checkInstallation', Sass.checkInstallation.bind(Sass));
	nova.commands.register('VineCode.Sass.compileNow', () => Sass.compileManually());

	// "Compile on Save"
	nova.workspace.onDidAddTextEditor(editor => {
		if(editor.document.isRemote) {
			Sass.notifyRemoteUnsupported();
			return;
		}

		return editor.onDidSave(Sass.compileSassUpdate.bind(Sass));
	});
};
