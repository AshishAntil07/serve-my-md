import { cleanName, makeRoutesOfNestedPaths, makeRoutesOfNestedPathsRaw, ogToHtml, slugify, trimIndexFromPath } from "@/utils/index.js";
import { assert, describe, expect, test } from "vitest";
import testcases from "../fixtures/cases/utils.unit.json" with { type: "json" };
import { deepStrictEqual, strictEqual } from "assert";

const tests = [
  {
    cases: testcases.slugify,
    func: slugify,
  },
  {
    cases: testcases.trimIndexFromPath,
    func: trimIndexFromPath,
  },
  {
    cases: testcases.ogToHtml,
    func: ogToHtml,
  },
  {
    cases: testcases.makeRoutesOfNestedPaths,
    func: makeRoutesOfNestedPaths,
  },
  {
    cases: testcases.cleanName,
    func: cleanName
  },
  {
    cases: testcases.makeRoutesOfNestedPathsRaw,
    func: makeRoutesOfNestedPathsRaw
  }
];

describe("@/utils", () => {
  for(const { cases, func } of tests)
    test(func.name, () => {
      for (const { input, output } of cases) {
        const result = func(input as any);
        expect(result).toStrictEqual(output);
      }
    });
});
