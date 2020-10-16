# Sass Extension for Nova

Converts scss files into css files automatically on save.

## Features
- Converts scss files into css files automatically on save
- Automatically create source maps
- Generated css can be compressed or expanded
- Notification of compile errors

## Requirements

Before using this extension, you must ensure that `sass` is installed on your system. One method is using [Homebrew](https://brew.sh).

## Sass Insall

1. Install [Homebrew](https://brew.sh).
2. Via Terminal run `brew install sass/sass/sass`

## Extension Installation

1. Open Nova.
2. Choose menu **Extensions** > **Extension Library...**
3. Search extension `Sass`
5. Click **Install**.

## Preferences 

**CSS Style** <br/>
`Expanded, Compressed`
<br/>Controls the output style of the resulting CSS. 

**Error CSS**<br/>
`On, Off`<br/>
Tells Sass whether to emit a CSS file when an error occurs during compilation.

**Generate Source Map**<br/>
`External, Internal, Off`<br/>
Source maps are files that tell browsers or other tools that consume CSS how that CSS corresponds to the Sass files from which it was generated. They make it possible to see and even edit your Sass files in browsers. 

**Update Path**<br/>
`source/css/`<br/>
Manually set the path that an update will be performed on, relative to the workspace directory.

**Output Path**<br/>
`dist/css/`<br/>
Manually set the output path of the generated css files, relative to the workspace directory.

**Executable Path**<br/>
`/path/to/sass`<br/>
Manually enter or select the scss binary location.

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