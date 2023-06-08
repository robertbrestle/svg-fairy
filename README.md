# svg-fairy

A vscode extension wrapper for [SVGO](https://github.com/svg/svgo) and [Url encoder for SVG](https://github.com/yoksel/url-encoder/)


## Features

- Optimize SVG files in place (overwrite) or as a copy  
- Encode and export SVG files for use in CSS  
- All features work on individual files or directories  

### Optimization with [SVGO](https://github.com/svg/svgo)

Unmodified SVG:  
```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <title>Circle Example</title>
  <desc>
    This is an example SVG with metadata.
  </desc>
  <circle cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />
  <text x="30" y="55" stroke="blue" rotate="-10">Circle</text>
</svg>
```

Optimized SVG:  
```
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff0" stroke="green" stroke-width="4"/><text x="30" y="55" stroke="#00f" rotate="-10">Circle</text></svg>
```

### CSS Export with [Url encoder for SVG](https://github.com/yoksel/url-encoder/)
Exported optimized SVG for CSS:  
```
.circle {
	background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0' stroke='green' stroke-width='4'/%3E%3Ctext x='30' y='55' stroke='%2300f' rotate='-10'%3ECircle%3C/text%3E%3C/svg%3E");
}
```

## Extension Settings

This extension contributes the following settings: 

* `svg-fairy.optimizeDirectory`: The name of the directory used with the "SVG optimize and copy". Defaults to `optimized`.
* `svg-fairy.exportFormat`: The format for the exported SVG CSS. Defaults to `css-class`.
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
