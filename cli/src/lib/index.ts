import MarkdownIt from "markdown-it";
import Prism from "prismjs";
import defaultSmmConfig from "../smm.config.json" with { type: "json" };
import { options } from "../lib/commander.js";
import { readConfig } from "../utils/index.js";
import Logger from "./logger.js";

const md = new MarkdownIt({
  ...defaultSmmConfig,
  ...readConfig(options.directory),
  highlight: function (str, lang) {
    if(lang && Prism.languages[lang])
      return Prism.highlight(str, Prism.languages[lang], lang);
    return '';
  }
});

md.linkify.set({ fuzzyEmail: false });

export {
  md as mdParser,
  Logger as logger
}