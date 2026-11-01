// JSON formatted from its own tokens: the text is walked once, token by token, and each token is
// emitted exactly as written, with two-space indentation between them. Nothing is parsed into a
// value and printed again, so the keys keep their order, duplicates included, numbers keep their
// literals, and strings keep their escapes; only the whitespace between tokens changes.

// The indent of a depth, two spaces a level.
function indent(depth: number): string {
  return "  ".repeat(depth);
}

// JSON's whitespace between tokens: space, tab, line feed, and carriage return.
function isSpace(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}

// Where a number or a literal ends: whitespace, or the punctuation that may follow a value.
function endsValue(code: number): boolean {
  return isSpace(code) || code === 0x2c || code === 0x3a || code === 0x5d || code === 0x7d;
}

/**
 * Valid JSON text, re-indented: each member or element on its own line, two spaces an indent per
 * depth, `": "` after each key, and an empty object or array as `{}` or `[]`. Every
 * token, a string with its escapes, a number, `true`, `false`, or `null`, and each punctuation
 * mark, appears as the text wrote it and in its order; whitespace outside strings is the only
 * thing that changes. The text must be valid JSON, as `JSON.parse` accepts it: the walk reads
 * tokens without checking their grammar, so it never decides whether the text is valid, and its
 * output for text that isn't is unspecified. Its indents grow with the square of the depth, so
 * text nested some ten thousand deep throws a RangeError, its output past the longest string.
 */
export function formatJson(text: string): string {
  const out: string[] = [];
  const length = text.length;
  let depth = 0;
  let at = 0;
  // Past whitespace from `from`, the index of the next token, or the text's length.
  const skip = (from: number): number => {
    while (from < length && isSpace(text.charCodeAt(from))) from++;
    return from;
  };
  while ((at = skip(at)) < length) {
    const code = text.charCodeAt(at);
    switch (code) {
      case 0x7b: // {
      case 0x5b: {
        // [
        const next = skip(at + 1);
        const close = code === 0x7b ? 0x7d : 0x5d;
        if (text.charCodeAt(next) === close) {
          out.push(code === 0x7b ? "{}" : "[]");
          at = next + 1;
        } else {
          depth++;
          out.push(text[at], "\n", indent(depth));
          at++;
        }
        break;
      }
      case 0x7d: // }
      case 0x5d: // ]
        depth--;
        out.push("\n", indent(depth), text[at]);
        at++;
        break;
      case 0x2c: // ,
        out.push(",\n", indent(depth));
        at++;
        break;
      case 0x3a: // :
        out.push(": ");
        at++;
        break;
      case 0x22: {
        // " : a string runs to the first quote no backslash escapes.
        let end = at + 1;
        while (end < length) {
          const inner = text.charCodeAt(end);
          if (inner === 0x5c) end += 2;
          else if (inner === 0x22) break;
          else end++;
        }
        out.push(text.slice(at, end + 1));
        at = end + 1;
        break;
      }
      default: {
        // A number, true, false, or null, as written.
        let end = at + 1;
        while (end < length && !endsValue(text.charCodeAt(end))) end++;
        out.push(text.slice(at, end));
        at = end;
      }
    }
  }
  return out.join("");
}
