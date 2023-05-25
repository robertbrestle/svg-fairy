const vscode = require("vscode");
const { optimize } = require("svgo");
const fs = require("fs");
const messages = require("./messages.json");

const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
const quotes = { level1: '"', level2: "'" };

var outputChannel;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// create output channel
	outputChannel = vscode.window.createOutputChannel("SVG Fairy");

	// register commands
	// Optimize In Place
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeInPlace", (context) => {
		try {
			outputChannel.appendLine(getMessage("START_OPTIMIZE_IN_PLACE"));

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {

				// exit if not an SVG
				if(!isSVG(path)) {
					let filename = getFilename(path, true);
					let message = getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				let optimizedResult = optimizeSVG(path);
				addResultChannelMessage(path, optimizedResult.changePercent, !optimizedResult.success);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = getAllSVGs(path);
				let changePercentArr = [];

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = getFilename(path, false);
					let message = getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				// optimize SVGs
				for(let i = 0; i < svgPathArr.length; i++) {
					let optimizedResult = optimizeSVG(svgPathArr[i]);
					changePercentArr.push(optimizedResult.changePercent);
					addResultChannelMessage(svgPathArr[i], optimizedResult.changePercent, !optimizedResult.success);
				}

				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);
				
				showMessage(getMessage("SUCCESS_OPTIMIZE_IN_PLACE", [svgPathArr.length, changeAverage]));
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(getMessage("ERROR_OPTIMIZE_IN_PLACE"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	// Optimize and Copy
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeAndCopy", (context) => {
		try {
			outputChannel.appendLine(getMessage("START_OPTIMIZE_COPY"));

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				
				// exit if not an SVG
				if(!isSVG(path)) {
					let filename = getFilename(path, true);
					let message = getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				let fullOptimizedDirectory = getOptimizedDirectory(path, true);
				let optimizedResult = optimizeSVG(path, fullOptimizedDirectory);
				addResultChannelMessage(fullOptimizedDirectory, optimizedResult.changePercent, !optimizedResult.success);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = getAllSVGs(path);
				let changePercentArr = [];

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = getFilename(path, false);
					let message = getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				let optimizedDirectory = getOptimizedDirectory(path, false);
				// optimize SVGs
				for(let i = 0; i < svgPathArr.length; i++) {
					let fullOptimizedDirectory = optimizedDirectory + '/' + getFilename(svgPathArr[i], true);
					let optimizedResult = optimizeSVG(svgPathArr[i], fullOptimizedDirectory);
					changePercentArr.push(optimizedResult.changePercent);
					addResultChannelMessage(fullOptimizedDirectory, optimizedResult.changePercent, !optimizedResult.success);
				}
				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);

				showMessage(getMessage("SUCCESS_OPTIMIZE_COPY", [svgPathArr.length, changeAverage]));
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(getMessage("ERROR_OPTIMIZE_COPY"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	// Export SVG CSS
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.exportSVGCSS", (context) => {
		try {
			outputChannel.appendLine(getMessage("START_EXPORT_SVG_CSS"));

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {

				// exit if not an SVG
				if(!isSVG(path)) {
					let filename = getFilename(path, true);
					let message = getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				// encode SVG to CSS
				let encodeResult = encodeSVGToCSS(path);
				outputChannel.appendLine(getMessage("SUCCESS_ENCODE_SVG_CSS", [path]));

				// build CSS export path
				let cssPath = getCSSFilename(path);

				// build and save file
				let exportResult = exportCSSFile([encodeResult], cssPath);
				if(exportResult.success === true) {
					showMessage(getMessage("SUCCESS_EXPORT_SVG_CSS", [getFilename(cssPath, true)]));
				}else {
					throw exportResult.message;
				}
			}
			else {// is a directory
				let svgPathArr = getAllSVGs(path);

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = getFilename(path, false);
					let message = getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				let encodeResultArr = [];
				for(let i = 0; i < svgPathArr.length; i++) {
					encodeResultArr.push(encodeSVGToCSS(svgPathArr[i]));
					outputChannel.appendLine(getMessage("SUCCESS_ENCODE_SVG_CSS", [svgPathArr[i]]));
				}

				// build CSS export path
				let cssPath = getCSSFilename(path);

				// create single file
				let exportResult = exportCSSFile(encodeResultArr, cssPath);
				if(exportResult.success === true) {
					showMessage(getMessage("SUCCESS_EXPORT_SVG_CSS", [getFilename(cssPath, true)]));
				}else {
					throw exportResult.message;
				}
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(getMessage("ERROR_EXPORT_SVG_CSS"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	outputChannel.appendLine(getMessage("ACTIVATE_EXTENSION"));
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}


// #region Message Helpers

/**
 * Display a vscode.window message toast
 * @param {string} text - the message text
 * @param {boolean} isError - if the message should be displayed as an error
 */
function showMessage(text, isError) {
	if(!isError) {
		vscode.window.showInformationMessage(text);
	}else {
		vscode.window.showErrorMessage(text);
	}
}

/**
 * Format SVG optimization and write to output channel.
 * @param {string} path - the file path
 * @param {number} changePercent - the file change percentage
 * @param {boolean} isError - whether to display as an error
 */
function addResultChannelMessage(path, changePercent, isError) {
	if(!isError) {
		outputChannel.appendLine(getMessage("SUCCESS_SVG_OPTIMIZATION", [Math.trunc(changePercent), path]));
	}else {
		outputChannel.appendLine(getMessage("ERROR", [path]));
	}
}

/**
 * Get and format the message with value substitutions
 * @param {string} messageKey - the key of the message
 * @param {string[]} subArr - the array of substitution values
 * @returns {string}
 */
function getMessage(messageKey, subArr) {
	if(typeof messages[messageKey] === "undefined") {
		return "Could not fetch the message for this action"
	}
	// if no substitutions, return message
	if(typeof subArr === "undefined" || subArr == null || subArr.length == 0) {
		return messages[messageKey];
	}
	// if substitutions, grab value and update
	let value = messages[messageKey];
	// iterate substitutions
	for(let i = 0; i < subArr.length; i++) {
		value = value.replaceAll('{' + i + '}', subArr[i]);
	}
	return value;
}

// #endregion

// #region File/Directory Helpers
/**
 * @param {string} path - the path of a directory or file
 * @returns {boolean} if the path is a directory
 */
function isDirectory(path) {
	if(typeof path === "undefined" || path == '') {
		return false;
	}
	try {
		return fs.lstatSync(path).isDirectory();
	}catch(err) {
		// write error to output
		outputChannel.appendLine(getMessage("ERROR_ISDIRECTORY"));
		outputChannel.appendLine(err);
	}
	return false;
}

/**
 * Shallow SVG extension validation
 * @param {string} path - the path of the file
 * @returns {boolean} whether the file is an SVG
 */
function isSVG(path) {
	if(typeof path === "undefined" || path == '') {
		return false;
	}
	let fileName = path.split('/').at(-1);
	let fileExtension = fileName.split(".").at(1);
	if(typeof fileExtension === "undefined" || fileExtension == '') {
		return false;
	}
	if(fileExtension.toUpperCase() === "SVG") {
		return true;
	}
	return false;
}

/**
 * Get the filename without an extension
 * @param {string} path - the path of the SVG
 * @param {boolean} includeExtension - whether result should include the extension
 * @returns the filename without an extension
 */
function getFilename(path, includeExtension) {
	// filename with extension
	let svgFile = path.split('/').at(-1);
	if(typeof includeExtension !== "undefined" && includeExtension === true) {
		return svgFile;
	}
	let svgName = svgFile.split('.').at(0);
	return svgName;
}

/**
 * Append the exported CSS file to the path
 * @param {string} path - the path to build as CSS file path
 * @returns {string}
 */
function getCSSFilename(path) {

	// build CSS export path
	let pathArr = path.split('/');

	let cssFilename = '';
	if(isDirectory(path)) {
		// if directory, append directory name as CSS file
		cssFilename = getFilename(pathArr.at(-1)) + ".css";
	}
	else {
		// if file, remove from the pathArr and add as CSS file
		cssFilename = getFilename(pathArr.pop()) + ".css";
	}

	pathArr.push(cssFilename);
	return pathArr.join('/');
}

/**
 * Removes the potential '/' from the beginning of the path
 * @param {string} path - the path of a file or directory
 * @returns {string} the santized path
 */
function sanitizePath(path) {
	// if path starts with leading '/', remove
	if(path.startsWith('/')) {
		path = path.substring(1);
	}
	return path;
}

/**
 * Removes special characters from the filename.
 * @param {string} filename
 * @returns {string} the sanitized filename
 */
function sanitizeName(filename) {
	// replace all symbols with '-'
	// replace all groups of 2 or more '-' with a single '-'
	// remove leading and trailing '-'
	return filename.replace(/[^A-Za-z0-9]/g,'-').replace(/\-{2,}/g, '-').replace(/^\-|\-$/g, '');
}

/**
 * Recursively collect all SVG files from a directory
 * @param {string} directoryPath
 * @param {Array<string>} fileArray
 * @returns {string[]} an array of SVG files
 */
function getAllSVGs(directoryPath, fileArray) {
	try {
		fileArray = fileArray || [];
		let files = fs.readdirSync(directoryPath);

		for(let i = 0; i < files.length; i++) {
			let file = directoryPath + '/' + files[i];
			if (isDirectory(file)) {
				fileArray = getAllSVGs(file, fileArray);
			}else if(isSVG(file)) {
				fileArray.push(file);
			}
		}
	}catch(err) {
		// write error to output
		outputChannel.appendLine(getMessage("ERROR_GET_ALL_SVG"));
		outputChannel.appendLine(err);
	}
	return fileArray;
}

/**
 * Get the optimized directory path for a given path. Creates the optimized directory if it doesn't exist.
 * @param {string} path - the path of a file or directory
 * @param {boolean} includeFile - whether to include the file
 * @returns {string} the original path including the optimized directory
 */
function getOptimizedDirectory(path, includeFile) {
	// if optimized directory doesn't exist, create it
	let optimizedDirectory = vscode.workspace.getConfiguration("svg-fairy").get("optimizeDirectory");
	let fullOptimizedDirectory = path + '/' + optimizedDirectory;

	// if path is a not directory
	let svgFilename = '';
	if(!isDirectory(path)) {
		let pathArr = path.split('/');
		svgFilename = pathArr.pop();
		pathArr.push(optimizedDirectory);
		//pathArr.push(svgFilename);
		fullOptimizedDirectory = pathArr.join('/');
	}

	// create directory if it doesn't exist
	if(!fs.existsSync(fullOptimizedDirectory)) {
		fs.mkdirSync(fullOptimizedDirectory);
	}

	// if enabled, append file to optimizedDirectory
	if(typeof includeFile !== "undefined" && includeFile === true) {
		return fullOptimizedDirectory + '/' + svgFilename;
	}

	// else return directory
	return fullOptimizedDirectory;
}
// #endregion

// #region SVG Helpers
/**
 * 
 * @param {string} path - the path of the SVG 
 * @returns {string} the SVG string
 */
function getSVGString(path) {
	try{
		// extension check if file is SVG
		if(!isSVG(path)) {
			return null;
		}
		// read SVG with configured encoding (default 'utf8')
		let data = fs.readFileSync(path, vscode.workspace.getConfiguration("svg-fairy").get("svgEncoding"));
		return data.toString();
	}catch(err) {
		// write error to output
		outputChannel.appendLine(getMessage("ERROR_GET_SVG_STRING"));
		outputChannel.appendLine(err);
	}
	return null;
}

/**
 * @typedef {Object} SVGOptimizedResponseObject
 * @property {boolean} success - whether the optimization was successful
 * @property {string} message - the response message
 * @property {number} changePercent - the percentage of change after optimization
 */
/**
 * @param {string} inPath - the path of the SVG
 * @param {string} outPath - the output path of the optimized SVG
 * @returns {SVGOptimizedResponseObject}
 */
function optimizeSVG(inPath, outPath) {
	try {
		// filename with extension
		let svgFilename = getFilename(inPath, true);

		// extension check if file is SVG
		if(!isSVG(inPath)) {
			return {
				"success": false,
				"message": getMessage("ERROR_FILE_NOT_SVG", [svgFilename])
			};
		}

		// read SVG
		let svgString = getSVGString(inPath);

		// optimize
		let result = optimize(svgString, {
			path: inPath,
			multipass: true
		});
		const optimizedSvgString = result.data;

		// if defined, write result to outPath
		if(typeof outPath !== "undefined" && outPath != '') {
			fs.writeFileSync(outPath, optimizedSvgString);
		}
		else { // else, overwrite
			fs.writeFileSync(inPath, optimizedSvgString);
		}

		let message = '';
		let changePercent = ((svgString.length - optimizedSvgString.length) / svgString.length) * 100;
		if(svgString.length > optimizedSvgString.length) {
			message = getMessage("SUCCESS_OPTIMIZE_REDUCED", [svgFilename, Math.trunc(changePercent)])
		}else if(svgString.length < optimizedSvgString.length) {
			message = getMessage("SUCCESS_OPTIMIZE_INCREASED", [svgFilename, Math.abs(Math.trunc(changePercent))])
			outputChannel.appendLine(getMessage("ERROR_OPTIMIZE_ANOMALY", [svgFilename]));
		}else {
			changePercent = 0;
			message = getMessage("SUCCESS_OPTIMIZE_SAME", [svgFilename])
		}

		return {
			"success": true,
			"message": message,
			"changePercent": changePercent
		};
	}catch(err) {
		// write error to output
		outputChannel.appendLine(getMessage("SEVERE_ERROR_OPTIMIZE_SVG"));
		outputChannel.appendLine(err);
	}
	return {
		"success": false,
		"message": getMessage("SEVERE_ERROR_OPTIMIZE_SVG")
	};
}
// #endregion

// #region CSS Helpers
/**
 * @typedef {Object} EncodedSVGToCSSObject
 * @property {string} className - the CSS class name derived from the SVG filename
 * @property {string} cssString - the encoded CSS string
 */
/**
 * Encode the SVG for use in CSS
 * @param {string} path - the path of the SVG file
 * @returns {EncodedSVGToCSSObject}
 */
function encodeSVGToCSS(path) {
	// get the contents of the SVG
	let svgString = getSVGString(path);

	// svg-fairy.externalQuotesValue
	let externalQuotesValue = vscode.workspace.getConfiguration("svg-fairy").get("externalQuotesValue");

	// Use single quotes instead of double to avoid encoding.
	if(externalQuotesValue === "double") {
		svgString = svgString.replace(/"/g, `'`);
	}
	else { // else use double quotes instead of single
		svgString = svgString.replace(/'/g, `"`);
	}

	// remove whitespace
	svgString = svgString.replace(/>\s{1,}</g, `><`);
	svgString = svgString.replace(/\s{2,}/g, ` `);

	// Using encodeURIComponent() as replacement function
	// allows to keep result code readable
	svgString = svgString.replace(symbols, encodeURIComponent);
	let encodedCSSString = `url(${quotes.level1}data:image/svg+xml,${svgString}${quotes.level1});`;

	// filename without extension
	let svgFilename = getFilename(path);
	// get CSS class name with sanitized filename
	let className = sanitizeName(svgFilename);

	return {
		className: className,
		cssString: encodedCSSString
	};
}

/**
 * Build the CSS-ready string. May be a partial result if the export type is `css-custom-property`.
 * @param {string} className - the filename without an extension
 * @param {string} cssString - the encoded CSS string
 * @returns {string} the formatted CSS string
 */
function getCSSString(className, cssString) {
	// response
	let cssStringFmt = '';

	// get export format
	let exportFormat = vscode.workspace.getConfiguration("svg-fairy").get("exportFormat");
	
	// format as CSS variable
	if(exportFormat == "css-custom-properties") {
		cssStringFmt += "\t--" + className + ":\n\t\t" + cssString + '\n';
	}
	else // format as CSS class
	if(exportFormat == "css-class") {
		cssStringFmt += '.' + className + " {\n\tbackground-image: " + cssString + "\n}";
	}

	return cssStringFmt;
}

/**
 * @typedef {Object} ResponseObject
 * @property {boolean} success - whether the operation was successful
 * @property {string} message - the response message
 */
/**
 * Build and write the CSS file
 * @param {EncodedSVGToCSSObject[]} encodedSVGToCSSArr - an array of encoded SVG to CSS objects
 * @param {string} outPath - the output path of the CSS
 * @returns {ResponseObject}
 */
function exportCSSFile(encodedSVGToCSSArr, outPath) {
	try {
		// full output file
		let cssFileContents = '';

		let exportFormat = vscode.workspace.getConfiguration("svg-fairy").get("exportFormat");
		// css-custom-property header
		if(exportFormat == "css-custom-properties") {
			cssFileContents += ":root {\n"
		}

		for(let i = 0; i < encodedSVGToCSSArr.length; i++) {
			cssFileContents += getCSSString(encodedSVGToCSSArr[i].className, encodedSVGToCSSArr[i].cssString);
			cssFileContents += '\n';
		}

		// css-custom-property footer
		if(exportFormat == "css-custom-properties") {
			cssFileContents += '}'
		}

		// write file
		fs.writeFileSync(outPath, cssFileContents);

		return {
			"success": true
		}
	}catch(err) {
		// write error to output
		outputChannel.appendLine(getMessage("ERROR_EXPORT_SVG_CSS"));
		outputChannel.appendLine(err);
	}
	return {
		"success": false,
		"message": getMessage("SEVERE_ERROR_EXPORT_SVG_CSS")
	}
}

// #endregion
