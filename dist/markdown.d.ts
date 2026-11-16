import { type TemplateResult } from "lit";
/**
 * The source as a template: headings, paragraphs, emphasis, strong, code spans, fenced and
 * indented code, ordered and unordered lists to any depth, task items, blockquotes, rules, links,
 * GFM tables and strikethrough, and line breaks. Raw HTML, block or inline, shows as its own text;
 * an image shows its alt text; a link is an anchor only to an http, https, or mailto URL or a
 * relative one. Partial source, an unclosed fence or a list still growing, renders what has
 * arrived, and rendering a longer source into the same container updates its DOM in place.
 */
export declare function markdown(source: string): TemplateResult;
