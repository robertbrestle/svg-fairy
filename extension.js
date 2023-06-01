const vscode = require("vscode");
const helpers = require("./helpers.js");

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
			outputChannel.appendLine(helpers.getMessage("START_OPTIMIZE_IN_PLACE"));

			let path = helpers.sanitizePath(context.path);

			// if not a directory
			if(!helpers.isDirectory(path)) {

				// exit if not an SVG
				if(!helpers.isSVG(path)) {
					let filename = helpers.getFilename(path, true);
					let message = helpers.getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				let optimizedResult = helpers.optimizeSVG(path);
				addResultChannelMessage(path, optimizedResult.changePercent, !optimizedResult.success, optimizedResult.exception);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = helpers.getAllSVGs(path);
				let changePercentArr = [];

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = helpers.getFilename(path, false);
					let message = helpers.getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				// optimize SVGs
				for(let i = 0; i < svgPathArr.length; i++) {
					let optimizedResult = helpers.optimizeSVG(svgPathArr[i]);
					changePercentArr.push(optimizedResult.changePercent);
					addResultChannelMessage(svgPathArr[i], optimizedResult.changePercent, !optimizedResult.success, optimizedResult.exception);
				}

				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);
				
				showMessage(helpers.getMessage("SUCCESS_OPTIMIZE_IN_PLACE", [svgPathArr.length, changeAverage]));
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(helpers.getMessage("ERROR_OPTIMIZE_IN_PLACE"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(helpers.getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	// Optimize and Copy
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.optimizeAndCopy", (context) => {
		try {
			outputChannel.appendLine(helpers.getMessage("START_OPTIMIZE_COPY"));

			let path = helpers.sanitizePath(context.path);

			// if not a directory
			if(!helpers.isDirectory(path)) {
				
				// exit if not an SVG
				if(!helpers.isSVG(path)) {
					let filename = helpers.getFilename(path, true);
					let message = helpers.getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				let fullOptimizedDirectory = helpers.getOptimizedDirectory(path, true);
				let optimizedResult = helpers.optimizeSVG(path, fullOptimizedDirectory);
				addResultChannelMessage(fullOptimizedDirectory, optimizedResult.changePercent, !optimizedResult.success, optimizedResult.exception);
				showMessage(optimizedResult.message, !optimizedResult.success);
			}
			else {// is a directory
				let svgPathArr = helpers.getAllSVGs(path);
				let changePercentArr = [];

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = helpers.getFilename(path, false);
					let message = helpers.getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				let optimizedDirectory = helpers.getOptimizedDirectory(path, false);
				// optimize SVGs
				for(let i = 0; i < svgPathArr.length; i++) {
					let fullOptimizedDirectory = optimizedDirectory + '/' + helpers.getFilename(svgPathArr[i], true);
					let optimizedResult = helpers.optimizeSVG(svgPathArr[i], fullOptimizedDirectory);
					changePercentArr.push(optimizedResult.changePercent);
					addResultChannelMessage(fullOptimizedDirectory, optimizedResult.changePercent, !optimizedResult.success, optimizedResult.exception);
				}
				// calculate average
				let changeAverage = 0;
				for(let i = 0; i < changePercentArr.length; i++) {
					changeAverage += changePercentArr[i];
				}
				changeAverage /= changePercentArr.length;
				changeAverage = Math.trunc(changeAverage);

				showMessage(helpers.getMessage("SUCCESS_OPTIMIZE_COPY", [svgPathArr.length, changeAverage]));
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(helpers.getMessage("ERROR_OPTIMIZE_COPY"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(helpers.getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	// Export SVG CSS
	context.subscriptions.push(vscode.commands.registerCommand("svg-fairy.exportSVGCSS", (context) => {
		try {
			outputChannel.appendLine(helpers.getMessage("START_EXPORT_SVG_CSS"));

			let path = helpers.sanitizePath(context.path);

			// if not a directory
			if(!helpers.isDirectory(path)) {

				// exit if not an SVG
				if(!helpers.isSVG(path)) {
					let filename = helpers.getFilename(path, true);
					let message = helpers.getMessage("ERROR_FILE_NOT_SVG", [filename]);
					throw message;
				}

				// encode SVG to CSS
				let encodeResult = helpers.encodeSVGToCSS(path);
				outputChannel.appendLine(helpers.getMessage("SUCCESS_ENCODE_SVG_CSS", [path]));

				// build CSS export path
				let cssPath = helpers.getCSSFilename(path);

				// build and save file
				let exportResult = helpers.exportCSSFile([encodeResult], cssPath);
				if(exportResult.success === true) {
					showMessage(helpers.getMessage("SUCCESS_EXPORT_SVG_CSS", [helpers.getFilename(cssPath, true)]));
				}else {
					throw exportResult.message;
				}
			}
			else {// is a directory
				let svgPathArr = helpers.getAllSVGs(path);

				// if no SVGs, return error
				if(svgPathArr.length == 0) {
					let dirname = helpers.getFilename(path, false);
					let message = helpers.getMessage("ERROR_NO_SVG_FOUND", [dirname]);
					throw message;
				}

				let encodeResultArr = [];
				for(let i = 0; i < svgPathArr.length; i++) {
					encodeResultArr.push(helpers.encodeSVGToCSS(svgPathArr[i]));
					outputChannel.appendLine(helpers.getMessage("SUCCESS_ENCODE_SVG_CSS", [svgPathArr[i]]));
				}

				// build CSS export path
				let cssPath = helpers.getCSSFilename(path);

				// create single file
				let exportResult = helpers.exportCSSFile(encodeResultArr, cssPath);
				if(exportResult.success === true) {
					showMessage(helpers.getMessage("SUCCESS_EXPORT_SVG_CSS", [helpers.getFilename(cssPath, true)]));
				}else {
					throw exportResult.message;
				}
			}
		}catch(err) {
			// write error to output
			outputChannel.appendLine(helpers.getMessage("ERROR_EXPORT_SVG_CSS"));
			outputChannel.appendLine(err);
			// show error message toast
			showMessage(err, true);
		}
		outputChannel.appendLine(helpers.getMessage("ACTION_COMPLETE"));
		outputChannel.appendLine('');
	}));

	outputChannel.appendLine(helpers.getMessage("ACTIVATE_EXTENSION"));
}

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}


/**
 * Format SVG optimization and write to output channel.
 * @param {string} path - the file path
 * @param {number} changePercent - the file change percentage
 * @param {boolean} isError - whether to display as an error
 * @param {string} exception - the error from an exception
 */
function addResultChannelMessage(path, changePercent, isError, exception) {
	if(!isError) {
		outputChannel.appendLine(helpers.getMessage("SUCCESS_SVG_OPTIMIZATION", [Math.trunc(changePercent), path]));
	}else {
		outputChannel.appendLine(helpers.getMessage("ERROR", [path]));
		if(typeof exception !== "undefined") {
			outputChannel.appendLine(exception);
		}
	}
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