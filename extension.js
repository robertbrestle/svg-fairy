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
	// Optimize In Place
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeInPlace", (context) => {
		try {
			outputChannel.appendLine("Running Optimize In Place...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				let optimizedResult = optimizeSVG(path);
				addResultChannelMessage(path, optimizedResult.changePercent, !optimizedResult.success);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = getAllSVGs(path);
				let changePercentArr = [];
				if(svgPathArr.length == 0) {
					showMessage("No SVG files in the specified directory", true);
					throw "";
				}
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
				showMessage("Optimized " + svgPathArr.length + " files, saving an average of " + changeAverage + "%", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeInPlace error:");
			outputChannel.appendLine(err);
		}
		outputChannel.appendLine("Done!");
		outputChannel.appendLine('');
	}));

	// Optimize and Copy
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeAndCopy", (context) => {
		try {
			outputChannel.appendLine("Running Optimize and Copy...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				
				// exit if not an SVG
				if(!isSVG(path)) {
					showMessage("The specified file is not an SVG", true);
					throw "";
				}

				let fullOptimizedDirectory = getOptimizedDirectory(path, true);
				let optimizedResult = optimizeSVG(path, fullOptimizedDirectory);
				addResultChannelMessage(fullOptimizedDirectory, optimizedResult.changePercent, !optimizedResult.success);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = getAllSVGs(path);
				let changePercentArr = [];
				if(svgPathArr.length == 0) {
					showMessage("No SVG files in the specified directory", true);
					throw "";
				}
				let optimizedDirectory = getOptimizedDirectory(path, false);
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
				showMessage("Optimized and copied " + svgPathArr.length + " files, saving an average of " + changeAverage + "%", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeAndCopy error:");
			outputChannel.appendLine(err);
		}
		outputChannel.appendLine("Done!");
		outputChannel.appendLine('');
	}));

	// Export SVG CSS
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.exportSVGCSS", (context) => {
		try {
			outputChannel.appendLine("Running Export SVG CSS...");

			let path = sanitizePath(context.path);

			// if not a directory
			if(!isDirectory(path)) {
				let encodeResult = encodeSVGToCSS(path, true);
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
		outputChannel.appendLine("Done!");
		outputChannel.appendLine('');
	}));

	outputChannel.appendLine("SVG Fairy is now active!");
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
		outputChannel.appendLine("Saved: " + Math.trunc(changePercent) + "%\t" + path);
	}else {
		outputChannel.appendLine("Error: " + path);
	}
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
		outputChannel.appendLine("isDirectory() error:");
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
 * Recursively collect all SVG files from a directory
 * @param {string} directoryPath
 * @param {Array<string>} fileArray
 * @returns {string[]} an array of SVG files
 */
function getAllSVGs(directoryPath, fileArray) {
	try {
		let files = fs.readdirSync(directoryPath);
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
 * @returns SVG string
 */
function getSVGString(path) {
	try{
		// extension check if file is SVG
		if(!isSVG(path)) {
			return null;
		}
		// read SVG
		let data = fs.readFileSync(path, 'utf8');
		return data.toString();
	}catch(err) {
		// write error to output
		outputChannel.appendLine("getSVGString() error:");
		outputChannel.appendLine(err);
	}
	return null;
}

/**
 * @typedef {Object} ResponseObject
 * @property {boolean} success - whether the optimization was successful
 * @property {string} message - the response message
 * @property {number} changePercent - the percentage of change after optimization
 */
/**
 * @param {string} path - the path of the SVG
 * @param {boolean} copy - if the output file should be copied to a new directory
 * @param {string} parentDirectory - the parent directory for the copied SVGs - references `svg-fairy.optimizeDirectory` configuration
 * @returns {ResponseObject}
 */
function optimizeSVG(inPath, outPath) {
	try {
		// filename with extension
		let svgFilename = getFilename(inPath, true);

		// extension check if file is SVG
		if(!isSVG(inPath)) {
			return {
				"success": false,
				"message": svgFilename + " is not an SVG"
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
		let changePercent = 0;
		if(svgString.length > optimizedSvgString.length) {
			changePercent = ((svgString.length - optimizedSvgString.length) / svgString.length) * 100;
			message = svgFilename + " was reduced by " + Math.trunc(changePercent) + "%";
		}else if(svgString.length < optimizedSvgString.length) {
			changePercent = ((svgString.length - optimizedSvgString.length) / svgString.length) * 100;
			message = svgFilename + " was increased by " + Math.trunc(changePercent) + "%";
		}else {
			message = svgFilename + " was optimized, but had no filesize changes";
		}

		return {
			"success": true,
			"message": message,
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
// #endregion

// #region CSS Helpers
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
		let cssFileContents = '';
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
	let cssStringFmt = '';
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
// #endregion
