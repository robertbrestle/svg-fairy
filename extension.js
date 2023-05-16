const vscode = require('vscode');
const { optimize } = require('svgo');
const fs = require('fs');

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

			// if not a directory
			if(!isDirectory(context.path)) {
				var optimizeResult = optimizeSVG(context.path, false);
				showMessage(optimizeResult.message, !optimizeResult.success);
			}
			else {// is a directory
				var svgArray = getAllSVGs(context.path);
				for(let i = 0; i < svgArray.length; i++) {
					let optimizeResult = optimizeSVG(svgArray[i], false);
					outputChannel.appendLine(optimizeResult.outPath);
				}
				showMessage("Optimized " + svgArray.length + " files", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeInPlace error:");
			outputChannel.appendLine(err);
		}
		outputChannel.appendLine('');
	}));
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeAndCopy", (context) => {
		try {
			outputChannel.appendLine("Running optimizeAndCopy...");

			// if not a directory
			if(!isDirectory(context.path)) {
				var optimizeResult = optimizeSVG(context.path, true);
				showMessage(optimizeResult.message, !optimizeResult.success);
			}
			else {// is a directory
				var svgArray = getAllSVGs(context.path);
				for(let i = 0; i < svgArray.length; i++) {
					let optimizeResult = optimizeSVG(svgArray[i], true, context.path);
					outputChannel.appendLine(svgArray[i] + "  =>  " + optimizeResult.outPath);
				}
				showMessage("Optimized and copied " + svgArray.length + " files", false);
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine("optimizeAndCopy error:");
			outputChannel.appendLine(err);
		}
		outputChannel.appendLine('');
	}));

	outputChannel.appendLine("SVG Fairy is now active!");
}

// This method is called when your extension is deactivated
function deactivate() {}

/**
 * Recursively find all nested SVG files in a directory
 * @param {string} directoryPath - the 
 * @param {Array<string>} fileArray - 
 * @returns 
 */
function getAllSVGs(directoryPath, fileArray) {
	try {
		if(directoryPath.startsWith('/')) {
			directoryPath = directoryPath.substring(1);
		}

		var files = fs.readdirSync(directoryPath);
		fileArray = fileArray || [];

		for(let i = 0; i < files.length; i++) {
			let file = directoryPath + '/' + files[i];
			if (fs.statSync(file).isDirectory()) {
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
 * @param {string} path - the path of the file
 * @returns {boolean}
 */
function isDirectory(path) {
	try {
		// if path starts with leading '/', remove
		if(path.startsWith('/')) {
			path = path.substring(1);
		}
		return fs.lstatSync(path).isDirectory();
	}catch(err) {
		// write error to output
		outputChannel.appendLine("isDirectory() error:");
		outputChannel.appendLine(err);
	}
	return false;
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
 */
/**
 * @param {string} path - the path of the SVG
 * @param {boolean} copy - if the output file should be copied to a new directory
 * @param {string} parentDirectory - the parent directory for the "optimized" directory
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

		// if path starts with leading '/', remove
		if(path.startsWith('/')) {
			path = path.substring(1);
		}

		// read SVG
		var data = fs.readFileSync(path, 'utf8');
		var svgString = data.toString();

		// optimize
		var result = optimize(svgString, {
			path: path,
			multipass: true
		});
		const optimizedSvgString = result.data;

		let outPath = path;

		// if copy enabled, copy optimized SVG to new directory
		if(copy) {

			// TODO: make optimized folder a variable
			let optimizedDirectory = "optimized";

			let pathArr = path.split('/');

			// if parentDirectory specified
			if(typeof parentDirectory !== "undefined" && parentDirectory != "") {
				if(parentDirectory.startsWith('/')) {
					parentDirectory = parentDirectory.substring(1);
				}
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
		if(svgString.length > optimizedSvgString.length) {
			var changePercent = Math.trunc(((svgString.length - optimizedSvgString.length) / svgString.length) * 100);
			message = svgFile + " was reduced by " + changePercent + "%";
		//}else if(svgString.length < optimizedSvgString.length) {
		//	message = svgFile + " increased by XX%";
		}else {
			message = svgFile + " was optimized, but had no filesize changes";
		}

		return {
			"success": true,
			"message": message,
			"outPath": outPath
		};
	}catch(err) {
		// write error to output
		outputChannel.appendLine("optimize() error:");
		outputChannel.appendLine(err);

		return {
			"success": false,
			"message": "Error optimizing SVG. See the output for more information."
		};
	}
}


module.exports = {
	activate,
	deactivate
}
