import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/**
 * @typedef {{
 *     (testName: string, expected: Buffer): Promise<void>;
 *     assertNoUnmatchedSnapshots(): void;
 *     [Symbol.dispose](): void;
 * }} PNGSnapshotter
 * @export {PNGSnapshotter}
 */

/**
 * @param {URL} parentURL
 * @param {Object} [options]
 * @param {boolean} [options.failOnUnmatchedSnapshots]
 * @param {URL} [options.snapshotsLocation]
 * @param {boolean} [options.updateSnapshots]
 * @return {Promise<PNGSnapshotter>}
 */
export default async function createPNGSnapshotter(
	parentURL,
	{
		failOnUnmatchedSnapshots = !process.execArgv.includes("--test-only"),
		snapshotsLocation = new URL("__snapshots__/", parentURL),
		updateSnapshots = process.execArgv.includes("--test-update-snapshots"),
	} = {},
) {
	await fs.mkdir(snapshotsLocation, { recursive: true });
	/** @type {Set<string>} */
	const files = new Set();
	for (const file of await fs.readdir(snapshotsLocation)) {
		if (file.endsWith(".png")) {
			files.add(file);
		}
	}
	const safeSuiteFilename = path.basename(parentURL.pathname).replaceAll(".", "_");
	/** @type {Map<string, number>} */
	const testCounter = new Map();
	/**
	 * @param {string} testName
	 * @param {Buffer} png
	 */
	async function match(testName, png) {
		// 1-based index because that reads more naturally in file names
		const snapshotIndex = testCounter.get(testName) ?? 1;
		const snapshotFilename = `${safeSuiteFilename}_${testName.replaceAll(
			/[^a-zA-Z0-9\[\]()-]/g,
			"_",
		)}_${snapshotIndex}.png`;
		testCounter.set(testName, snapshotIndex + 1);
		const found = files.delete(snapshotFilename);
		if (found && !updateSnapshots) {
			const actual = PNG.sync.read(png);
			const { data, width, height } = actual;
			const diff = new PNG({ width, height });
			const expected = PNG.sync.read(
				await fs.readFile(new URL(snapshotFilename, snapshotsLocation)),
			);
			if (width !== expected.width || height !== expected.height) {
				const actualFilename = path.join(
					os.tmpdir(),
					`actual_${snapshotFilename}`,
				);
				await fs.writeFile(actualFilename, PNG.sync.write(actual));
				assert.fail(
					`Size mismatch (actual ${width}x${height}px vs expected ${expected.width}x${expected.height}px). Actual written to ${actualFilename} for reference.`,
				);
			}
			const pixels = pixelmatch(data, expected.data, diff.data, width, height);
			if (pixels > 0) {
				const comparison = new PNG({ width: width * 3, height });
				PNG.bitblt(expected, comparison, 0, 0, width, height, 0, 0);
				PNG.bitblt(diff, comparison, 0, 0, width, height, width, 0);
				PNG.bitblt(actual, comparison, 0, 0, width, height, width * 2, 0);
				const comparisonFileName = path.join(
					os.tmpdir(),
					`expected-diff-actual_${snapshotFilename}`,
				);
				await fs.writeFile(comparisonFileName, PNG.sync.write(comparison));
				assert.fail(
					`Found ${pixels} mismatched pixels. See ${comparisonFileName} for a visual difference.`,
				);
			}
		} else {
			await fs.writeFile(new URL(snapshotFilename, snapshotsLocation), png);
		}
	}
	match.assertNoUnmatchedSnapshots = () => {
		assert(
			!failOnUnmatchedSnapshots || files.size === 0,
			`Found ${files.size} unmatched snapshots:\n* ${[...files].join("\n* ")}`,
		);
	};
	match[Symbol.dispose] = match.assertNoUnmatchedSnapshots;
	return match;
}
