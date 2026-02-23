// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as diff from "diff";
import * as fs from "fs";

/**
 * Reads two files from pathA and pathB and generates a unified diff patch using the 'diff' package.
 * @param pathA Path to the "old" file (left side of diff).
 * @param pathB Path to the "new" file (right side of diff).
 * @param options Optional diff options (e.g. context lines).
 * @returns Promise resolving to the patch string in unified diff format.
 */
export async function createPatch(
  patchName: string,
  pathA: string,
  pathB: string,
): Promise<string> {
  const [contentA, contentB] = await Promise.all([
    fs.promises.readFile(pathA, "utf8"),
    fs.promises.readFile(pathB, "utf8"),
  ]);

  return diff.createPatch(
    patchName,
    contentA,
    contentB,
  );
}
