import { getState } from "@/lib/context.js";
import { getIdentifier, slugifyText } from "@/utils/index.js";
import type { SearchIndexPage, Route } from "@shared/index.js";
import type Token from "markdown-it/lib/token.mjs";
import { getPath, getRouteFromPath } from "./index.js";
import fs from "fs/promises";

export async function parseMD(
  filepath: string,
): Promise<{ searchIndex: SearchIndexPage; route: Route }> {
  const state = getState();

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
    state.processor(headingToken.children!, Concern.Heading);
  }
}

//todo: have multiple processors for each type of tokens, pass in every token, but selectively execute the code
//todo: inside of the processor, also have the processor state for all of these things, the search index, concern
//todo: keywordDepth, etc every shit lives in there.
function processTokens(tokens: Token[]): {
  tokens: Token[];
  searchIndex: SearchIndexPage;
} {
  const searchIndex: SearchIndexPage = {
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

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      switch (token.type) {
        case "inline":
          if (token.children && token.children.length)
            processor(token.children);
          break;
        case "text":
          break;
        case "heading_open":
          break;
        case "link_open":
          const hrefAttr = token.attrGet("href");

          //todo: update this link validation(this is left), also the shit that the link actually points to the raw markdown file,
          //todo: and here it's made to point to the actual route that the markdown file will eventually emit(ts is solved).
          //todo: Also make sure that there exists a reusable function that works like cleanNestedPaths but for links (ts also solved).
          if (
            hrefAttr &&
            hrefAttr.endsWith(".md") &&
            !hrefAttr.startsWith("http://") &&
            !hrefAttr.startsWith("https://")
          ) {
            const newHref = getRouteFromPath(hrefAttr);
            token.attrSet("href", newHref);
          }
          break;

        case "image":
          const srcAttr = token.attrGet("src");

          //todo: validate the image link if it belongs to a path in public folder.

          break;
        case "code_inline":
          const codeContent = token.content;
          if (!codeContent) {
            break;
          }
          const lastSection =
            searchIndex.sections[searchIndex.sections.length - 1];
          if (processorState.isHeading) {
            lastSection.title += codeContent;
            break;
          }
          codeContent
            .split(" ")
            .forEach((word) => word && lastSection.keywords.push(word));
          break;
        case "em_open":
        case "strong_open":
          processorState.concern =
            processorState.concern === Concern.None
              ? Concern.Keyword
              : processorState.concern;
          processorState.keywordDepth++;
          break;
        case "em_close":
        case "strong_close":
          processorState.keywordDepth--;
          if (!processorState.keywordDepth)
            processorState.concern =
              processorState.concern === Concern.Keyword
                ? Concern.None
                : processorState.concern;
          break;
        default:
          break;
      }
    }
  }

  processor(tokens);

  return { tokens, searchIndex };
}
