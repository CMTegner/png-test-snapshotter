import { strict as assert, AssertionError } from "node:assert";
import fs from "node:fs/promises";
import { test } from "node:test";

import createSnapshotter from "./index.js";

test("writes snapshots for new comparisons", async (t) => {
	const snapshotsLocation = new URL("__screenshots__/", import.meta.url);
	const assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
		failOnUnmatchedSnapshots: true,
		snapshotsLocation,
		updateSnapshots: false,
	});
	try {
		await assertSnapshot(
			t.name,
			await fs.readFile(
				new URL("./__fixtures__/original.png", import.meta.url),
			),
		);
		const snapshots = await fs.readdir(snapshotsLocation);
		assert.equal(snapshots.length, 1);
		assert.equal(
			snapshots[0],
			"test_js_writes_snapshots_for_new_comparisons_1.png",
		);
		assertSnapshot.assertNoUnmatchedSnapshots();
	} finally {
		await fs.rm(snapshotsLocation, {
			force: true,
			recursive: true,
		});
	}
});

test("does not err on snapshot match", async (t) => {
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.writeFile(
			new URL("__snapshots__/blank.txt", import.meta.url),
			"this page intentionally left blank",
		);
		await fs.cp(
			new URL("__fixtures__/original.png", import.meta.url),
			new URL(
				"__snapshots__/different_test_js_does_not_err_on_snapshot_match_1.png",
				import.meta.url,
			),
		);
		await fs.cp(
			new URL("__fixtures__/original.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_does_not_err_on_snapshot_match_1.png",
				import.meta.url,
			),
		);
		const assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			failOnUnmatchedSnapshots: true,
			updateSnapshots: false,
		});
		await assertSnapshot(
			t.name,
			await fs.readFile(
				new URL("./__fixtures__/original.png", import.meta.url),
			),
		);
		assertSnapshot.assertNoUnmatchedSnapshots();
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
	}
});

test("errs on snapshot content mismatch", async (t) => {
	const diffsLocation = new URL("__diffs__/", import.meta.url);
	let assertSnapshot;
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.cp(
			new URL("__fixtures__/fake.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_snapshot_content_mismatch_1.png",
				import.meta.url,
			),
		);
		await fs.cp(
			new URL("__fixtures__/diff.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_snapshot_content_mismatch_2.png",
				import.meta.url,
			),
		);
		assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			diffsLocation,
			failOnUnmatchedSnapshots: true,
			updateSnapshots: false,
		});
		await assertSnapshot(
			t.name,
			await fs.readFile(new URL("__fixtures__/original.png", import.meta.url)),
		);
	} catch (error) {
		assert(error instanceof AssertionError);
		const pattern =
			/Found 4750 mismatched pixels\. See (.*) for a visual difference\./;
		const match = pattern.exec(error.message);
		assert(match);
		assert.equal(
			new URL(match[1]).toString(),
			`${diffsLocation}expected-diff-actual_test_js_errs_on_snapshot_content_mismatch_1.png`,
		);
		assert(assertSnapshot);
		await assertSnapshot(t.name, await fs.readFile(new URL(match[1])));
		assertSnapshot.assertNoUnmatchedSnapshots();
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
		await fs.rm(diffsLocation, {
			force: true,
			recursive: true,
		});
	}
});

test("errs on snapshot size mismatch", async (t) => {
	let assertSnapshot;
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.cp(
			new URL("__fixtures__/fake.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_snapshot_size_mismatch_1.png",
				import.meta.url,
			),
		);
		await fs.cp(
			new URL("__fixtures__/diff.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_snapshot_size_mismatch_2.png",
				import.meta.url,
			),
		);
		assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			updateSnapshots: false,
			failOnUnmatchedSnapshots: true,
		});
		await assertSnapshot(
			t.name,
			await fs.readFile(new URL("__fixtures__/diff.png", import.meta.url)),
		);
	} catch (error) {
		assert(error instanceof AssertionError);
		const pattern =
			/Size mismatch \(actual 1920x229px vs expected 640x229px\)\. Actual written to (.*) for reference\./;
		const match = pattern.exec(error.message);
		assert(match);
		assert(assertSnapshot);
		await assertSnapshot(t.name, await fs.readFile(new URL(match[1])));
		assertSnapshot.assertNoUnmatchedSnapshots();
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
	}
});

test("updates outdated snapshots when updateSnapshots is true", async (t) => {
	let assertSnapshot;
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.cp(
			new URL("__fixtures__/fake.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_updates_outdated_snapshots_when_updateSnapshots_is_true_1.png",
				import.meta.url,
			),
		);
		await fs.cp(
			new URL("__fixtures__/original.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_updates_outdated_snapshots_when_updateSnapshots_is_true_2.png",
				import.meta.url,
			),
		);
		assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			failOnUnmatchedSnapshots: true,
			updateSnapshots: true,
		});
		await assertSnapshot(
			t.name,
			await fs.readFile(new URL("__fixtures__/original.png", import.meta.url)),
		);
		await assertSnapshot(
			t.name,
			await fs.readFile(
				new URL(
					"__snapshots__/test_js_updates_outdated_snapshots_when_updateSnapshots_is_true_1.png",
					import.meta.url,
				),
			),
		);
		assertSnapshot.assertNoUnmatchedSnapshots();
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
	}
});

test("errs on unmatched snapshots when failOnUnmatchedSnapshots is true", async (t) => {
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.cp(
			new URL("__fixtures__/original.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_unmatched_snapshots_when_failOnUnmatchedSnapshots_is_true_1.png",
				import.meta.url,
			),
		);
		const assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			failOnUnmatchedSnapshots: true,
			updateSnapshots: false,
		});
		assert.throws(
			assertSnapshot.assertNoUnmatchedSnapshots,
			"AssertionError: Found 1 unmatched snapshots:\n* test_js_does_not_err_on_matching_images_1.png",
		);
		assert.throws(
			assertSnapshot[Symbol.dispose],
			"AssertionError: Found 1 unmatched snapshots:\n* test_js_does_not_err_on_matching_images_1.png",
		);
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
	}
});

test("does not err on unmatched snapshots when failOnUnmatchedSnapshots is false", async (t) => {
	try {
		await fs.mkdir(new URL("__snapshots__", import.meta.url));
		await fs.cp(
			new URL("__fixtures__/original.png", import.meta.url),
			new URL(
				"__snapshots__/test_js_errs_on_unmatched_snapshots_when_failOnUnmatchedSnapshots_is_true_1.png",
				import.meta.url,
			),
		);
		const assertSnapshot = await createSnapshotter(new URL(import.meta.url), {
			failOnUnmatchedSnapshots: false,
			updateSnapshots: false,
		});
		assertSnapshot.assertNoUnmatchedSnapshots();
		assertSnapshot[Symbol.dispose]();
	} finally {
		await fs.rm(new URL("__snapshots__", import.meta.url), {
			force: true,
			recursive: true,
		});
	}
});

test("errs if `diffsLocation` is not a directory", async (t) => {
	const diffsLocation = new URL("__diffs__", import.meta.url);
	try {
		await createSnapshotter(new URL(import.meta.url), {
			diffsLocation,
		});
	} catch (error) {
		assert(error instanceof AssertionError);
		assert.equal(
			error.message,
			`Invalid \`diffsLocation\`. Expected the location to be a directory, got "${diffsLocation}". (Tip: Ensure that the location has a trailing slash)`,
		);
	}
});

test("errs if `snapshotsLocation` is not a directory", async (t) => {
	const snapshotsLocation = new URL("__screenshots__", import.meta.url);
	try {
		await createSnapshotter(new URL(import.meta.url), {
			snapshotsLocation,
		});
	} catch (error) {
		assert(error instanceof AssertionError);
		assert.equal(
			error.message,
			`Invalid \`snapshotsLocation\`. Expected the location to be a directory, got "${snapshotsLocation}". (Tip: Ensure that the location has a trailing slash)`,
		);
	}
});
