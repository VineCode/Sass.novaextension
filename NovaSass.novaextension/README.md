# Sass Extension for Nova

Converts scss files into css files automatically on save.

## Requirements

Before using this extension, you must ensure that `sass` is installed on your system. The preferred method is using [Homebrew](https://brew.sh).

## Sass Insall

1. Install [Homebrew](https://brew.sh).
2. Via Terminal run `brew install sass/sass/sass`

## Extension Installation

1. Open Nova.
2. Choose menu **Extensions** > **Extension Library...**
3. Search extension `NovaSass`
5. Click **Install**.

## Preferences 

| Preference          | Options                 | Summary                                                                                                                                                                                                                              |
|---------------------|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| CSS Style           | Expanded, Compressed    | Controls the output style of the resulting CSS                                                                                                                                                                                       |
| Error CSS           | On, Off                 | Tells Sass whether to emit a CSS file when an error occurs<br/>during compilation                                                                                                                                                    |
| Generate Source Map | External, Internal, Off | Source maps are files that tell browsers or other tools that <br>consume CSS how that CSS corresponds to the Sass files from <br>which it was generated. They make it possible to see and even <br>edit your Sass files in browsers. |

## Features

* Auto compiles scss files on save