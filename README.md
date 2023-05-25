# svg-fairy

A vscode extension wrapper for [SVGO](https://github.com/svg/svgo) and [Url encoder for SVG](https://github.com/yoksel/url-encoder/)


## Features

- Optimize SVG files in place (overwrite) or as a copy  
- Encode and export SVG files for use in CSS  
- All features work on individual files or directories  

## Extension Settings

This extension contributes the following settings: 

* `svg-fairy.optimizeDirectory`: The name of the directory used with the "SVG optimize and copy". Defaults to `optimized`.
* `svg-fairy.exportFormat`: The format for the exported SVG CSS. Defaults to `css-custom-properties`.
* `svg-fairy.externalQuotesValue`: The external quote value which surrounds the encoded SVG in CSS. Defaults to `double`.
* `svg-fairy.svgEncoding`: The encoding used for reading SVG file contents. Defaults to `utf8`.

## Explorer Context Menu Options

* `svg-fairy.exportSVGCSS`: Export a single SVG or directory or SVGs to a CSS file.
* `svg-fairy.optimizeAndCopy`: Optimize and copy SVG to the optimize directory set in the `svg-fairy.optimizeDirectory` setting.
* `svg-fairy.optimizeInPlace`: Optimize and overwrite SVG.

## Known Issues
- Invalid SVG files can be exported to CSS  

---

# References

- [SVGO](https://github.com/svg/svgo)  
- [Url encoder for SVG](https://github.com/yoksel/url-encoder/)  

&nbsp;
