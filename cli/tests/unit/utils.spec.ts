import { ogToHtml, slugify, trimIndexFromPath } from "@/utils/index.js";
import { assert, describe, test } from "vitest";
import testcases from "../fixtures/cases/utils.unit.json" with { type: "json" };
import type { OpenGraph } from "@/types/og.js";

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
];

describe("@/utils", () => {
  for(const { cases, func } of tests)
    test(func.name, () => {
      for (const { input, output } of cases) {
        const result = func(input as string & OpenGraph);
        assert(result === output, `Failed on input: ${JSON.stringify(input)}\nReceived: ${JSON.stringify(result)}\nExpected: ${JSON.stringify(output)}`);
      }
    });
});
