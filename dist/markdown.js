// Markdown to a Lit template: marked's lexer reads the source into tokens, and each token becomes
// a plain native element bound by Lit, so every text value is escaped by Lit and the module needs
// no sanitizer and never renders HTML from a string. The foundation's elements sheet styles what it
// emits: on the page through page.css, and in a shadow root that adopts the sheet, as each
// component's does.
import { getDefaults, Lexer } from "marked";
import { html, nothing } from "lit";
import { styleMap } from "lit/directives/style-map.js";
/**
 * The source as a template: headings, paragraphs, emphasis, strong, code spans, fenced and
 * indented code, ordered and unordered lists to any depth, task items, blockquotes, rules, links,
 * GFM tables and strikethrough, and line breaks. Raw HTML, block or inline, shows as its own text;
 * an image shows its alt text; a link is an anchor only to an http, https, or mailto URL or a
 * relative one. Partial source, an unclosed fence or a list still growing, renders what has
 * arrived, and rendering a longer source into the same container updates its DOM in place.
 */
export function markdown(source) {
    // Each call lexes on a fresh copy of marked's defaults, GFM on, so no marked.use() or
    // setOptions() elsewhere on the page reaches this renderer.
    const tokens = Lexer.lex(source, { ...getDefaults(), gfm: true, breaks: false });
    return html `${blocks(tokens)}`;
}
/** Block tokens as their elements. */
function blocks(tokens) {
    return tokens.map(block);
}
function block(token) {
    switch (token.type) {
        case "heading":
            return heading(token);
        case "paragraph":
            return html `<p>${inline(token.tokens)}</p>`;
        case "code":
            // Fenced or indented alike; an unclosed fence holds the source up to its end.
            return html `<pre><code>${token.text}</code></pre>`;
        case "blockquote":
            return html `<blockquote>${blocks(token.tokens)}</blockquote>`;
        case "list":
            return list(token);
        case "table":
            return table(token);
        case "hr":
            return html `<hr />`;
        case "html":
            // A block of raw HTML is text: it shows as written.
            return html `<p>${token.text.trimEnd()}</p>`;
        case "text": {
            // A tight list item's text: inline tokens of its own, or literal text.
            const text = token;
            return text.tokens ? inline(text.tokens) : decode(text.text);
        }
        case "checkbox":
            return checkbox(token);
        // A space separates blocks, and a link definition has already been applied to its links.
        case "space":
        case "def":
            return nothing;
        default:
            return generic(token);
    }
}
function heading({ depth, tokens }) {
    const content = inline(tokens);
    switch (depth) {
        case 1:
            return html `<h1>${content}</h1>`;
        case 2:
            return html `<h2>${content}</h2>`;
        case 3:
            return html `<h3>${content}</h3>`;
        case 4:
            return html `<h4>${content}</h4>`;
        case 5:
            return html `<h5>${content}</h5>`;
        default:
            return html `<h6>${content}</h6>`;
    }
}
function list({ ordered, start, items }) {
    const content = items.map((item) => html `<li>${blocks(item.tokens)}</li>`);
    if (!ordered)
        return html `<ul>${content}</ul>`;
    // An ordered list keeps the number its source starts at; start="" is an unordered list's.
    return html `<ol start=${start === "" || start === 1 ? nothing : start}>${content}</ol>`;
}
/** A task item's box: shown, never toggled, since the source holds its state. */
function checkbox({ checked }) {
    return html `<input type="checkbox" disabled ?checked=${checked} /> `;
}
function table({ header, rows }) {
    // A column's alignment is the cell's own style, since the elements sheet aligns cells to start,
    // which an align attribute, a presentational hint, can't override; a cell with none has no style.
    const align = ({ align }) => align === null ? nothing : styleMap({ "text-align": align });
    // The templates hold no whitespace between the elements, which a table would carry as text.
    const th = (cell) => html `<th style=${align(cell)}>${inline(cell.tokens)}</th>`;
    const td = (cell) => html `<td style=${align(cell)}>${inline(cell.tokens)}</td>`;
    const body = rows.map((row) => html `<tr>${row.map(td)}</tr>`);
    return html `<table><thead><tr>${header.map(th)}</tr></thead>${rows.length === 0 ? nothing : html `<tbody>${body}</tbody>`}</table>`;
}
/** Inline tokens as their elements and text. */
function inline(tokens) {
    return tokens.map(span);
}
function span(token) {
    switch (token.type) {
        case "text": {
            const text = token;
            if (text.tokens)
                return inline(text.tokens);
            // Inside a raw block the lexer leaves the text as written; otherwise its character
            // references are still to resolve.
            return text.escaped ? text.text : decode(text.text);
        }
        case "escape":
            return token.text;
        case "strong":
            return html `<strong>${inline(token.tokens)}</strong>`;
        case "em":
            return html `<em>${inline(token.tokens)}</em>`;
        case "del":
            return html `<del>${inline(token.tokens)}</del>`;
        case "codespan":
            return html `<code>${token.text}</code>`;
        case "br":
            return html `<br />`;
        case "link":
            return link(token);
        case "image":
            // An image is its alt text: the renderer loads nothing the source names.
            return plain(token.tokens);
        case "html":
            // Raw inline HTML is text: it shows as written.
            return token.text;
        case "checkbox":
            return checkbox(token);
        default:
            return generic(token);
    }
}
/** A token no case names, which only an extension emits: its children, or its source. */
function generic(token) {
    return "tokens" in token && token.tokens ? inline(token.tokens) : token.raw;
}
function link({ href, title, tokens, text, autolink }) {
    // An autolink's destination and text are literal; any other's have references to resolve.
    const url = autolink ? href : decode(href);
    const content = autolink ? text : inline(tokens);
    if (!safe(url))
        return content;
    // No target: the link opens where its reader's own click sends it. noreferrer, which implies
    // noopener, keeps the page's URL from a destination that text, a model's or a user's, named.
    return html `<a rel="noreferrer" href=${url} title=${title ? decode(title) : nothing}
    >${content}</a
  >`;
}
/** The schemes a link may name; a relative URL takes the page's. */
const schemes = new Set(["http:", "https:", "mailto:"]);
/**
 * Whether a link's destination is http, https, mailto, or relative. The URL parser reads it as an
 * anchor's href would be read, trimming spaces and controls, dropping tabs and newlines, and
 * folding case, so `JAVASCRIPT:`, ` javascript:`, and `java\tscript:` are the scheme they spell.
 * A relative URL resolves against the placeholder base to its https:, and one the parser refuses
 * is no link.
 */
function safe(url) {
    try {
        return schemes.has(new URL(url, "https://base.invalid/").protocol);
    }
    catch {
        return false;
    }
}
/** The tokens' text with no markup: an image's alt text. */
function plain(tokens) {
    return tokens
        .map((token) => {
        switch (token.type) {
            case "text": {
                const text = token;
                if (text.tokens)
                    return plain(text.tokens);
                return text.escaped ? text.text : decode(text.text);
            }
            case "escape":
            case "codespan":
            case "html":
                return token.text;
            case "br":
                return "";
            default:
                return "tokens" in token && token.tokens ? plain(token.tokens) : "";
        }
    })
        .join("");
}
// The lexer leaves named character references in text, link destinations, and titles for its own
// renderer's HTML to resolve, and writes a bare & as &amp; beside a numeric one. The HTML parser
// resolves them here, in a text area's RCDATA, where no markup is parsed, of a document with no
// browsing context, which loads and runs nothing.
let decoder;
/** The text with its character references resolved, as an HTML parser resolves them. */
function decode(text) {
    if (!text.includes("&"))
        return text;
    decoder ??= document.implementation.createHTMLDocument("").createElement("textarea");
    decoder.innerHTML = text;
    return decoder.value;
}
