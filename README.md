# png-test-snapshotter

A test utility for creating and diffing PNG snapshots. The snapshotter will create a visual representation of any differences between expected result and actual input.

## Install

This utility is [available as a package](https://npmjs.com/package/png-test-snapshotter) on the public [NPM registry](https://npmjs.com). Install it using your package manager of choice (npm, pnpm, bun, etc.). Example using npm:

```shell
npm install --save-dev png-test-snapshotter
```

## Example usage

```js
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import createPNGSnapshotter from "png-test-snapshotter";

import generateImage from "./generate-image.js";

let assertSnapshot;
before(async () => {
    assertSnapshot = await createPNGSnapshotter(new URL(import.meta.url));
});

after(() => {
    assertSnapshot.assertNoUnmatchedSnapshots();
});

test("image generation works as expected", async (t) => {
    const image = generateImage(...);
    await assertSnapshot(
        t.name,
        image,
    );
});
```

## API

### Main entrypoint: `createPNGSnapshotter(parentURL: URL, options)`

This is the module's default export. It expects the first argument passed in to be the URL of the test suite that will be using the snapshotter. This will in most cases be `new URL(import.meta.url)`.

An optional second argument can be provided, which when provided can contain the following fields:
* `snapshotsLocation: URL`: The location of the snapshots to evaluate. Defaults to a directory named `"__snapshots__"` with the same parent as the test suite (`parentURL`).
* `diffsLocation: URL`: The desired output location for any visual difference representation generated as the result of a failed match. Defaults to the OS' temporary directory.
* `failOnUnmatchedSnapshots: boolean`: Whether to raise an exception during cleanup (see below) if there are any unmatched snapshots in `snapshotDirname`. Defaults to `false` if node was invoked with the `--test-only` command-line option, `true` otherwise.
* `updateSnapshots: boolean`: When `true` the snapshotter will skip the matching process and instead write the input to the corresponding snapshot file. Defaults to `true` if node was invoked with the `--test-update-snapshots` command-line option, `false` otherwise.

The return value is the snapshotter function which will be used to create snapshots and assert no differences in future runs:

`snapshotter(testName: string, png: Buffer)`

The first argument should be set to the test name. The second argument is a Buffer containing the PNG. This function will raise an exception if the provided PNG differs from an existing snapshot. The assertion message will contain the location of the diff which can be viewed for a visual representation of the difference.

The snapshotter also has an opt-in cleanup step that can be run at the end of a test suite to ensure there are no unmatched snapshots remaining in the snapshot directory:

`snapshotter.assertNoUnmatchedSnapshots()`

This will do nothing if `failOnUnmatchedSnapshots` is `false`. This cleanup step is implicitly invoked if you use explicit resource management to create the snapshotter:

```js
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import createPNGSnapshotter from "png-test-snapshotter";

import generateImage from "./generate-image.js";

test("image generation works as expected", async (t) => {
    using assertSnapshot = await createPNGSnapshotter(new URL(import.meta.url));
    const image = generateImage(...);
    await assertSnapshot(
        t.name,
        image,
    );
    // assertSnapshot.assertNoUnmatchedSnapshots() will be invoked automatically when this block is exited
});
```

This could help you write terser code if you only have a single test that needs to use the snapshotter. If you want to use this syntax but need to create multiple instances of the snapshotter you will probably want to opt out of the cleanup step by setting `failOnUnmatchedSnapshots` to `false`.

Please see the accompanying TypeScript declaration file for more exact type information.
