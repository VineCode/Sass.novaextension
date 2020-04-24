//
// Whitespace Extension for Nova
// EditorConfigService.js
//
// Copyright © 2020 Vine Code Limited. All rights reserved.
//

const { NPMExecutable } = require('nova-npm-executable');

class EditorConfigService {
	constructor() {
		this.editorConfig = new NPMExecutable('editorconfig');
		if (!this.editorConfig.isInstalled) {
			this.editorConfig.install().catch(error => console.error(error));
		}
	}

	settingsForDocument(document) {
		return new Promise((resolve, reject) => {
			try {
				const settings = {};
				const commandArguments = [document.path];

				this.editorConfig.process({ args: commandArguments }).then(process => {
					let output = '';
					process.onStdout(line => (output += line));
					process.onStderr(line => (output += line));
					process.onDidExit(status => {
						if (status !== 0) resolve(settings);

						const rules = output.split(/\n/);
						for (const rule of rules) {
							const [key, value] = rule.split('=');
							settings[key] = value;
						}

						resolve(settings);
					});

					process.start();
				});
			} catch (error) {
				console.error(error);
				reject(error);
			}
		});
	}
}

module.exports = EditorConfigService;
