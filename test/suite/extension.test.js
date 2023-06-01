const assert = require('assert');
const vscode = require('vscode');
const helpers = require('../../helpers.js');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	// TODO: needs update for localization
	test('getMessage', () => {
		let test0 = helpers.getMessage();
		assert.strictEqual("Could not fetch the message for this action", test0);

		let test1 = helpers.getMessage("ACTION_COMPLETE");
		assert.strictEqual("Done!", test1);

		let test2 = helpers.getMessage("ERROR");
		assert.strictEqual("Error: {0}", test2);

		let test3 = helpers.getMessage("ERROR", null);
		assert.strictEqual("Error: {0}", test3);

		let test4 = helpers.getMessage("ERROR", "1234");
		assert.strictEqual("Error: 1", test4);

		let test5 = helpers.getMessage("ERROR", ["test"]);
		assert.strictEqual("Error: test", test5);
	});

	test('isDirectory', () => {
		let test0 = helpers.isDirectory();
		assert.strictEqual(false, test0);

		let test1 = helpers.isDirectory(__dirname);
		assert.strictEqual(true, test1);
	});

	test('isSVG', () => {
		let test0 = helpers.isSVG();
		assert.strictEqual(false, test0);

		let test1 = helpers.isSVG('');
		assert.strictEqual(false, test1);

		let test2 = helpers.isSVG("test.svg");
		assert.strictEqual(true, test2);

		let test3 = helpers.isSVG("test1/test2/test3");
		assert.strictEqual(false, test3);

		let test4 = helpers.isSVG("test.");
		assert.strictEqual(false, test4);

		let test5 = helpers.isSVG("test.png");
		assert.strictEqual(false, test5);
	});

	test('getFilename', () => {
		let test0 = helpers.getFilename();
		assert.strictEqual(null, test0);

		let test1 = helpers.getFilename("test.svg");
		assert.strictEqual("test", test1);

		let test2 = helpers.getFilename("test.svg", true);
		assert.strictEqual("test.svg", test2);

		let test3 = helpers.getFilename("test.svg", false);
		assert.strictEqual("test", test3);

		let test4 = helpers.getFilename("hello/world/test.svg", true);
		assert.strictEqual("test.svg", test4);
	});

	test('getCSSFilename', () => {
		let test0 = helpers.getCSSFilename();
		assert.strictEqual(null, test0);

		let currentDir = __dirname.replace(/\\/g, '/');
		let test1 = helpers.getCSSFilename(currentDir);
		assert.strictEqual(currentDir + "/suite.css", test1);
	});

	test('sanitizePath', () => {
		let test0 = helpers.sanitizePath();
		assert.strictEqual(null, test0);

		let test1 = helpers.sanitizePath("test");
		assert.strictEqual("test", test1);

		let test2 = helpers.sanitizePath("/test");
		assert.strictEqual("test", test2);

		let test3 = helpers.sanitizePath("/test/");
		assert.strictEqual("test/", test3);
	});

	test('sanitizeName', () => {
		let test0 = helpers.sanitizeName();
		assert.strictEqual(null, test0);

		let test1 = helpers.sanitizeName("test");
		assert.strictEqual("test", test1);

		let test2 = helpers.sanitizeName("test!");
		assert.strictEqual("test", test2);

		let test3 = helpers.sanitizeName("test!@#$%^&*()test");
		assert.strictEqual("test-test", test3);

		let test4 = helpers.sanitizeName("test&test");
		assert.strictEqual("test-test", test4);
	});

	test('getAllSVGs', () => {
		let test0 = helpers.getAllSVGs();
		assert.strictEqual(0, test0.length);

		let currentDir = __dirname.replace(/\\/g, '/');
		let test1 = helpers.getAllSVGs(currentDir);
		assert.strictEqual(3, test1.length);

		let currentFile = currentDir + "/extension.test.js";
		let test2 = helpers.getAllSVGs(currentFile);
		assert.strictEqual(0, test2.length);
	});

	test('getOptimizedDirectory', () => {
		let test0 = helpers.getOptimizedDirectory();
		assert.strictEqual(null, test0);

		let currentDir = __dirname.replace(/\\/g, '/');
		let optimizeDirectory = vscode.workspace.getConfiguration("svg-fairy").get("optimizeDirectory");

		// this will create the "optimized/" directory under suite/
		let test1 = helpers.getOptimizedDirectory(currentDir);
		assert.strictEqual(currentDir + '/' + optimizeDirectory, test1);

		let currentFile = currentDir + "/extension.test.js";
		let test2 = helpers.getOptimizedDirectory(currentFile, true);
		assert.strictEqual(currentDir + '/' + optimizeDirectory + "/extension.test.js", test2);
	});

	test('getSVGString', () => {
		let test0 = helpers.getSVGString();
		assert.strictEqual(null, test0);

		let currentDir = __dirname.replace(/\\/g, '/');
		let currentFile = currentDir + "/circle_optimized.svg";

		let test1 = helpers.getSVGString(currentFile);
		assert.strictEqual('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff0" stroke="green" stroke-width="4"/></svg>', test1);
	});

	test('optimizeSVG', () => {
		let test0 = helpers.optimizeSVG();
		assert.strictEqual(null, test0);

		let currentDir = __dirname.replace(/\\/g, '/');
		let badPath = currentDir + "/bad.txt";
		let inPath = currentDir + "/circle.svg";
		let outPath = currentDir + "/circle_test.svg";

		let test1 = helpers.optimizeSVG(badPath);
		assert.strictEqual(false, test1.success);

		let test2 = helpers.optimizeSVG(inPath, outPath);
		assert.strictEqual(true, test2.success);
	});

	test('encodeSVGToCSS', () => {
		let test0 = helpers.encodeSVGToCSS();
		assert.strictEqual(null, test0);

		let currentDir = __dirname.replace(/\\/g, '/');
		let currentFile = currentDir + "/circle_optimized.svg";

		let test1 = helpers.encodeSVGToCSS(currentFile);
		assert.strictEqual("circle-optimized", test1.className);
		assert.strictEqual(`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0' stroke='green' stroke-width='4'/%3E%3C/svg%3E");`, test1.cssString);
	});

	test('getCSSString', () => {
		let test0 = helpers.getCSSString();
		assert.strictEqual(null, test0);

		let test1 = helpers.getCSSString("circle-optimized", `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0' stroke='green' stroke-width='4'/%3E%3C/svg%3E");`);
		assert.strictEqual(`.circle-optimized {\n\tbackground-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0' stroke='green' stroke-width='4'/%3E%3C/svg%3E");\n}`, test1);
	});

	test('exportCSSFile', () => {
		let test0 = helpers.exportCSSFile();
		assert.strictEqual(false, test0.success);

		let encodedSVGToCSSArr = [{
			className: "circle-optimized",
			cssString: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23ff0' stroke='green' stroke-width='4'/%3E%3C/svg%3E");`
		}];
		let currentDir = __dirname.replace(/\\/g, '/');
		let outPath = currentDir + "/circle_optimized.css";

		let test1 = helpers.exportCSSFile(encodedSVGToCSSArr, outPath);
		assert.strictEqual(true, test1.success);
	});
});
