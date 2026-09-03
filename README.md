# Sass Extension for Nova

Converts scss files into css files automatically on save.

## Features
- Converts scss files into css files automatically on save
- Automatically create source maps
- Generated css can be compressed or expanded
- Notification of compile errors
- Compilation status, warnings, and complete errors in Nova's Extension Console

## Requirements

Before using this extension, you must ensure that `sass` is installed on your system. One method is using [Homebrew](https://brew.sh).

The extension requires a local Nova project. It is disabled for Remote Projects because Nova's extension process cannot run Sass against files stored only on a remote server. To work with a remote website, compile in a Local Project and use Nova Publishing to upload the generated CSS.

## Sass Insall

1. Install [Homebrew](https://brew.sh).
2. Via Terminal run `brew install sass/sass/sass`

## Extension Installation

1. Open Nova.
2. Choose menu **Extensions** > **Extension Library...**
3. Search extension `Sass`
5. Click **Install**.

## Preferences 

Preferences are managed per project, these can be accessed via Project -> Project Settings -> Sass

**Enable compile Sass on Save** 
<br/>Enables compile on save for this project.

**CSS Style** <br/>
`Expanded, Compressed`
<br/>Controls the output style of the resulting CSS. 

**Error CSS**<br/>
`On, Off`<br/>
Tells Sass whether to emit a CSS file when an error occurs during compilation.

**Generate Source Map**<br/>
`External, Embedded, None`<br/>
Source maps are files that tell browsers or other tools that consume CSS how that CSS corresponds to the Sass files from which it was generated. They make it possible to see and even edit your Sass files in browsers. Source maps are disabled by default and can be enabled per project.

**Update Path**<br/>
`source/css/`<br/>
Manually set the path that an update will be performed on, relative to the workspace directory.

**Output Path**<br/>
`dist/css/`<br/>
Manually set the output path of the generated css files, relative to the workspace directory.

**Resolve Paths Relative to Sass File**<br/>
`On, Off`<br/>
When off (the default), Update Path and Output Path remain relative to the workspace root. When on, both paths are resolved from the directory containing the saved Sass file. This allows values such as `.` and `../css` and supports projects with multiple independent Sass directories.

**Sass Executable**<br/>
Select a detected Dart Sass installation or enter a custom executable path. The detected choices display the Sass version and location. When no path is selected, the extension automatically checks the standard Apple Silicon and Intel Homebrew locations before falling back to Nova's process `PATH`.

**Check Sass Installation**<br/>
Verifies the selected or automatically detected Sass executable and displays its version and location.

## Notes

- As default the scss processor will compile in the current directory. If the current directory name is `scss` it will start at the parent. 
  This allows us to use the following directory structure where the `combined.scss` includes styles from the sub folder:
  ```
  project
  project/assets/css
  project/assets/css/combined.css  
  project/assets/css/combined.scss
  project/assets/css/scss
  project/assets/css/scss/_include.scss
  ```
  
  If either `_include.scss` or `combined.scss` are saved the compiler will run on the directory `project/assets/css/`
