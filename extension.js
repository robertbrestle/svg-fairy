const vscode = require('vscode');
const { optimize } = require('svgo');
const fs = require('fs');

const symbols = /[\r\n%#()<>?[\\\]^`{|}]/g;
const quotes = { level1: '"', level2: "'" };

var outputChannel;

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	// create output channel
	outputChannel = vscode.window.createOutputChannel('SVG Fairy');

	// register commands
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeInPlace", (context) => {
		try {
			outputChannel.appendLine("Running optimizeInPlace...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				var optimizeResult = optimizeSVG(path, false);
				showMessage(optimizeResult.message, !optimizeResult.success);
			}
			else {// is a directory
				var svgArray = getAllSVGs(path);
				var changePercentArr = [];
				for(let i = 0; i < svgArray.length; i++) {
					let optimizeResult = optimizeSVG(svgArray[i], false);
					changePercentArr.push(optimizeResult.changePercent);
					outputChannel.appendLine(optimizeResult.outPath);
				}
				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);
				showMessage("Optimized " + svgArray.length + " files, saving an average of " + changeAverage + "%", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeInPlace error:");
			outputChannel.appendLine(err);
		}
		outputChannel.append("done!");
		outputChannel.appendLine('');
	}));
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeAndCopy", (context) => {
		try {
			outputChannel.appendLine("Running optimizeAndCopy...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				var optimizeResult = optimizeSVG(path, true);
				showMessage(optimizeResult.message, !optimizeResult.success);
			}
			else {// is a directory
				var svgArray = getAllSVGs(path);
				var changePercentArr = [];
				for(let i = 0; i < svgArray.length; i++) {
					let optimizeResult = optimizeSVG(svgArray[i], true, path);
					changePercentArr.push(optimizeResult.changePercent);
					outputChannel.appendLine(svgArray[i] + "  =>  " + optimizeResult.outPath);
				}
				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);
				showMessage("Optimized and copied " + svgArray.length + " files, saving an average of " + changeAverage + "%", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeAndCopy error:");
			outputChannel.appendLine(err);
		}
		outputChannel.append("done!");
		outputChannel.appendLine('');
	}));
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.exportSVGCSS", (context) => {
		try {
			outputChannel.appendLine("Running Export SVG CSS...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				var encodeResult = encodeSVGToCSS(path, true);
				showMessage(encodeResult.message, !encodeResult.success);
			}
			else {// is a directory
				let svgArray = getAllSVGs(path);
				let encodedSVGCSSArr = [];
				for(let i = 0; i < svgArray.length; i++) {
					let encodeResult = encodeSVGToCSS(svgArray[i], false);
					encodedSVGCSSArr.push({
						"name": getFilename(svgArray[i]),
						"css": encodeResult.result
					});
					outputChannel.appendLine("Encoded for CSS: " + svgArray[i]);
				}
				// create single file
				let exportResult = exportCSSFile(path, encodedSVGCSSArr);
				showMessage(exportResult.message, !exportResult.success);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("exportSVGCSS error:");
			outputChannel.appendLine(err);
		}
		outputChannel.append("done!");
		outputChannel.appendLine('');
	}));

	outputChannel.appendLine("SVG Fairy is now active!");
}

// This method is called when your extension is deactivated
function deactivate() {}

/**
 * Recursively find all nested SVG files in a directory
 * @param {string} directoryPath
 * @param {Array<string>} fileArray
 * @returns 
 */
function getAllSVGs(directoryPath, fileArray) {
	try {
		var files = fs.readdirSync(directoryPath);
		fileArray = fileArray || [];

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
		outputChannel.appendLine("getAllSVGs() error:");
		outputChannel.appendLine(err);
	}
	return fileArray;
}

/**
 * Shallow SVG extension validation
 * @param {string} path
 */
function isSVG(path) {
	if(typeof path === "undefined" || path == "") {
		return false;
	}
	var fileName = path.split("/").at(-1);
	var fileExtension = fileName.split(".").at(1);
	if(typeof fileExtension === "undefined" || fileExtension == "") {
		return false;
	}
	if(fileExtension.toUpperCase() === "SVG") {
		return true;
	}
	return false;
}

/**
 * 
 * @param {string} path - the path of the directory to be tested
 * @returns {boolean}
 */
function isDirectory(path) {
	if(typeof path === "undefined" || path == "") {
		return false;
	}
	try {
		return fs.lstatSync(path).isDirectory();
	}catch(err) {
		// write error to output
		outputChannel.appendLine("isDirectory() error:");
		outputChannel.appendLine(err);
	}
	return false;
}

/**
 * Removes the potential '/' from the beginning of the path
 * @param {string} path - the path of a file or directory
 * @returns 
 */
function sanitizePath(path) {
	// if path starts with leading '/', remove
	if(path.startsWith('/')) {
		path = path.substring(1);
	}
	return path;
}

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
 * @typedef {Object} ResponseObject
 * @property {boolean} success - whether the optimization was successful
 * @property {string} message - the response message
 * @property {string} outPath - the output path of the file
 * @property {string} result - the result string of the operation
 * @property {number} changePercent - the percentage of change after optimization
 */
/**
 * @param {string} path - the path of the SVG
 * @param {boolean} copy - if the output file should be copied to a new directory
 * @param {string} parentDirectory - the parent directory for the copied SVGs - references `svg-fairy.optimizeDirectory` configuration
 * @returns {ResponseObject}
 */
function optimizeSVG(path, copy, parentDirectory) {
	try {
		// filename with extension
		var svgFile = path.split("/").at(-1);

		// extension check if file is SVG
		if(!isSVG(path)) {
			return {
				"success": false,
				"message": svgFile + " is not an SVG"
			};
		}

		// read SVG
		var svgString = getSVGString(path);

		// optimize
		var result = optimize(svgString, {
			path: path,
			multipass: true
		});
		const optimizedSvgString = result.data;

		let outPath = path;

		// if copy enabled, copy optimized SVG to new directory
		if(copy) {
			let optimizedDirectory = vscode.workspace.getConfiguration('svg-fairy').get('optimizeDirectory');

			let pathArr = path.split('/');

			// if parentDirectory specified
			if(typeof parentDirectory !== "undefined" && parentDirectory != "") {
				pathArr = parentDirectory.split('/');
			}
			else { // inject optimized directory into path
				// remove filename
				pathArr.pop();
			}
			pathArr.push(optimizedDirectory);
			// update path
			path = pathArr.join('/');

			// build full file path
			pathArr.push(svgFile);
			fullPath = pathArr.join('/');
			// save new outPath
			outPath = fullPath;

			// if optimized directory doesn't exist, create it
			if(!fs.existsSync(path)) {
				fs.mkdirSync(path);
			}
			// write file to new directory
			fs.writeFileSync(fullPath, optimizedSvgString);
		}
		else { // else overwrite file
			fs.writeFileSync(path, optimizedSvgString);
		}

		var message = "";
		var changePercent = 0;
		if(svgString.length > optimizedSvgString.length) {
			changePercent = ((svgString.length - optimizedSvgString.length) / svgString.length) * 100;
			message = svgFile + " was reduced by " + Math.trunc(changePercent) + "%";
		//}else if(svgString.length < optimizedSvgString.length) {
		//	message = svgFile + " increased by XX%";
		}else {
			message = svgFile + " was optimized, but had no filesize changes";
		}

		return {
			"success": true,
			"message": message,
			"outPath": outPath,
			"changePercent": changePercent
		};
	}catch(err) {
		// write error to output
		outputChannel.appendLine("optimize() error:");
		outputChannel.appendLine(err);
	}
	return {
		"success": false,
		"message": "Error optimizing SVG. See the output for more information."
	};
}

/**
 * 
 * @param {string} path - the path of the SVG 
 * @returns SVG string
 */
function getSVGString(path) {
	try{
		// extension check if file is SVG
		if(!isSVG(path)) {
			return null;
		}
		// read SVG
		var data = fs.readFileSync(path, 'utf8');
		return data.toString();
	}catch(err) {
		// write error to output
		outputChannel.appendLine("getSVGString() error:");
		outputChannel.appendLine(err);
	}
	return null;
}

/**
 * Get the filename without an extension
 * @param {string} path - the path of the SVG
 * @returns the filename without an extension
 */
function getFilename(path) {
	// filename with extension
	let svgFile = path.split('/').at(-1);
	let svgName = svgFile.split('.').at(0);
	return svgName;
}

/**
 * Encode the SVG for use in CSS
 * @param {string} path - the path of the SVG
 * @param {boolean} saveFile - whether a CSS file should be made after encoding
 * @returns {ResponseObject}
 */
function encodeSVGToCSS(path, saveFile) {
	// filename with extension
	let svgFile = path.split('/').at(-1);

	// get the contents of the SVG
	let svgString = getSVGString(path);
	if(svgString == null) {
		return {
			"success": false,
			"message": "Error fetching SVG. See the output for more information."
		};
	}

	// Use single quotes instead of double to avoid encoding.
	svgString = svgString.replace(/"/g, `'`);

	svgString = svgString.replace(/>\s{1,}</g, `><`);
	svgString = svgString.replace(/\s{2,}/g, ` `);

	// Using encodeURIComponent() as replacement function
	// allows to keep result code readable
	svgString = svgString.replace(symbols, encodeURIComponent);
	let encodedCSSString = `url(${quotes.level1}data:image/svg+xml,${svgString}${quotes.level1});`;

	// if enabled, create single CSS file for the encoded SVG CSS
	if(typeof saveFile !== "undefined" && saveFile === true) {
		// get filename without extension
		let svgName = getFilename(path);
		let cssFile = svgName + ".css";
		// get directory path
		let pathArr = path.split('/');
		// remove filename
		pathArr.pop();
		// create new CSS file
		pathArr.push(cssFile);
		let newPath = pathArr.join('/');

		// TODO: make this better
		// normalize
		svgName = svgName.replaceAll(' ', '-');

		// build file contents
		let cssFileContents = getCSSString(svgName, encodedCSSString, true);

		// write file
		fs.writeFileSync(newPath, cssFileContents);

		return {
			"success": true,
			"message": "SVG encoded and exported to " + cssFile
		};
	}//if: saveFile enabled

	return {
		"success": true,
		"message": svgFile + " encoded for CSS",
		"result": encodedCSSString
	};
}

/**
 * @typedef {Object} EncodedSVGObject
 * @property {string} name - the filename without an extension
 * @property {string} css - the encoded CSS
 */
/**
 * Compiles and saves a CSS file
 * @param {string} directoryPath - the parent directory path
 * @param {Array<EncodedSVGObject>} encodedSVGCSSObj - an array of encoded SVG objects
 * @returns {ResponseObject}
 */
function exportCSSFile(directoryPath, encodedSVGObjArr) {
	try {
		let dirPathArr = directoryPath.split('/');
		// normalize
		let dirName = dirPathArr.at(-1).replaceAll(' ', '-');
		let fileName = dirName + ".css";
		dirPathArr.push(fileName);
		let cssFilePath = dirPathArr.join('/');

		// build file contents
		let exportFormat = vscode.workspace.getConfiguration('svg-fairy').get('exportFormat');
		let cssFileContents = "";
		if(exportFormat == "css-custom-properties") {
			cssFileContents += ":root {\n";
		}

		for(let i = 0; i < encodedSVGObjArr.length; i++) {
			// TODO: make this better
			// normalize
			let svgName = encodedSVGObjArr[i].name.replaceAll(' ', '-');
			cssFileContents += getCSSString(svgName, encodedSVGObjArr[i].css, false) + '\n';
		}

		if(exportFormat == "css-custom-properties") {
			cssFileContents += "}";
		}
	
		// write file
		fs.writeFileSync(cssFilePath, cssFileContents);

		return {
			"success": true,
			"message": "SVGs encoded and exported to " + fileName
		}
	}catch(err) {
		// write error to output
		outputChannel.appendLine("exportCSSFile() error:");
		outputChannel.appendLine(err);
	}

	return {
		"success": false,
		"message": "Error exporting CSS file. See the output for more information."
	}
}

/**
 * Build the CSS-ready string
 * @param {string} name - the filename without an extension
 * @param {string} cssString - the encoded CSS string
 * @param {boolean} isSingle - if the file should be wrapped; only applies to the export property `css-custom-property`
 * @returns the formatted CSS string
 */
function getCSSString(name, cssString, isSingle) {
	let exportFormat = vscode.workspace.getConfiguration('svg-fairy').get('exportFormat');
	let cssStringFmt = "";
	// css-custom-property header
	if(typeof isSingle !== "undefined" && isSingle == true && exportFormat == "css-custom-properties") {
		cssStringFmt += ":root {\n"
	}
	// format as CSS variable
	if(exportFormat == "css-custom-properties") {
		cssStringFmt += "\t--" + name + ":\n\t\t" + cssString + "\n";
	}
	else // format as CSS class
	if(exportFormat == "css-class") {
		cssStringFmt += '.' + name + " {\n\tbackground-image: " + cssString + "\n}";
	}
	// css-custom-property footer
	if(typeof isSingle !== "undefined" && isSingle == true && exportFormat == "css-custom-properties") {
		cssStringFmt += "}"
	}
	return cssStringFmt;
}

module.exports = {
	activate,
	deactivate
}
