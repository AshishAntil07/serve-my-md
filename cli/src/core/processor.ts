import { appState, routeState } from "@/lib/context.js";
import { getIdentifier, slugifyText, traverseRecursive } from "@/utils/index.js";
import { type SearchIndexPage, type Route, DataAttributes } from "@shared/index.js";
import type Token from "markdown-it/lib/token.mjs";
import { getPath, getRouteFromPath } from "./index.js";
import fs from "fs/promises";

export async function parseMD(
  filepath: string,
): Promise<{ searchIndex: SearchIndexPage; route: Route }> {
  const state = appState.getState();

  const path = getPath(filepath);

  const tokens = state.mdParser.parse(await fs.readFile(filepath, "utf-8"), {});

  const { tokens: processedTokens, searchIndex } = processTokens(tokens);

  const content = state.mdParser.renderer.render(processedTokens, {}, {});

  return {
    route: {
      path,
      content,
      identifier: getIdentifier(), //? a randomass string which is guaranteed to be unique
    },
    searchIndex,
  };
}

enum Concern {
  Keyword,
  Heading,
  None,
}

interface ProcessorState {
  searchIndex: SearchIndexPage;
  concern: Concern;
  keywordDepth: number;
  isKeyword: boolean;
  isHeading: boolean;
  tokens: Token[];
  currentTokenIndex?: number;
}

const processors: Record<
  Token["type"],
  (token: Token, state: ProcessorState) => void
> = {
  text: processText,
  heading_open: processHeadingOpen,
  link_open: processLinkOpen,
  code_inline: processCodeInline,
  em_open: processKeywordOpen,
  strong_open: processKeywordOpen,
  em_close: processKeywordClose,
  strong_close: processKeywordClose,
  image: (() => {
    const state = appState.getState();
    const publicAssets: Set<string> = new Set();

    if (state.finalConfig.publicPath) {
      traverseRecursive(state.finalConfig.publicPath, async (item) => {
        publicAssets.add(item.slice(state.finalConfig.publicPath!.length));
      });
    }

    return (token, _) => processImage(token, publicAssets);
  })(),
  inline: (token, state) => {
    if (token.children && token.children.length)
      processTokens(token.children, state.searchIndex);
  },
};

/**
 * @param initialSearchIndex Only used for recursive calls, to pass in the search index that is being built up.
 */
function processTokens(
  tokens: Token[],
  initialSearchIndex?: SearchIndexPage,
): {
  tokens: Token[];
  searchIndex: SearchIndexPage;
} {
  const searchIndex: SearchIndexPage = initialSearchIndex || {
    route: "",
    title: "",
    sections: [
      {
        title: "",
        anchor: "",
        preview: "",
        keywords: [],
      },
    ],
  };

  const processorState: ProcessorState = {
    searchIndex,
    tokens,
    isKeyword: false,
    isHeading: false,
    keywordDepth: 0,
    concern: Concern.None,
  };

  function processor(tokens: Token[]) {
    processorState.isKeyword = processorState.concern === Concern.Keyword;
    processorState.isHeading = processorState.concern === Concern.Heading;

    processorState.keywordDepth = 0;

    for (
      processorState.currentTokenIndex = 0;
      processorState.currentTokenIndex < tokens.length;
      processorState.currentTokenIndex++
    ) {
      const token = tokens[processorState.currentTokenIndex];

      processors[token.type]?.(token, processorState);
    }
  }

  processor(tokens);

  return { tokens, searchIndex };
}

function processText(token: Token, state: ProcessorState) {
  if (state.isHeading) {
    state.searchIndex.sections[state.searchIndex.sections.length - 1].title +=
      token.content;
    return;
  }
  if (state.isKeyword) {
    const lastSection =
      state.searchIndex.sections[state.searchIndex.sections.length - 1];
    token.content
      .split(" ")
      .forEach((word) => word && lastSection.keywords.push(word));
  }
}

function processHeadingOpen(token: Token, state: ProcessorState) {
  const headingToken = state.tokens[++state.currentTokenIndex!];

  if (headingToken && headingToken.type === "inline") {
    const headingText = headingToken.content;
    const slugifiedHeading = slugifyText(headingText);
    token.attrSet("id", slugifiedHeading);

    state.searchIndex.sections.push({
      title: "", //? will be populated automatically by following recursive call.
      anchor: slugifiedHeading,
      preview: "",
      keywords: [],
    });
    processTokens(headingToken.children!, state.searchIndex);
  }
}

function processLinkOpen(token: Token, _: ProcessorState) {
  const hrefAttr = token.attrGet("href");
  const rState = routeState.getState();

  if (
    hrefAttr &&
    hrefAttr.endsWith(".md") &&
    !hrefAttr.startsWith("http://") &&
    !hrefAttr.startsWith("https://")
  ) {
    if (!rState.files.includes(hrefAttr)) {
      token.attrPush([DataAttributes.DATA_INVALID_REFERENCE, hrefAttr]);
    }

    const newHref = getRouteFromPath(hrefAttr);
    token.attrSet("href", newHref);
  }
}

function processCodeInline(token: Token, state: ProcessorState) {
  const codeContent = token.content;
  if (!codeContent) return;
  const lastSection =
    state.searchIndex.sections[state.searchIndex.sections.length - 1];
  if (state.isHeading) {
    lastSection.title += codeContent;
    return;
  }
  codeContent
    .split(" ")
    .forEach((word) => word && lastSection.keywords.push(word));
}

function processKeywordOpen(_: Token, state: ProcessorState) {
  state.concern =
    state.concern === Concern.None ? Concern.Keyword : state.concern;
  state.keywordDepth++;
}

function processKeywordClose(_: Token, state: ProcessorState) {
  if (!--state.keywordDepth)
    state.concern =
      state.concern === Concern.Keyword ? Concern.None : state.concern;
}

function processImage(token: Token, publicAssets: Set<string>) {
  const srcAttr = token.attrGet("src");

  if (!srcAttr || !publicAssets.has(srcAttr)) {
    token.attrPush([DataAttributes.DATA_INVALID_SOURCE, srcAttr || "null"])
  }
}
