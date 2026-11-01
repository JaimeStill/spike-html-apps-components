// JSON formatted from its own tokens: the text is walked once, token by token, and each token is
// emitted exactly as written, with two-space indentation between them. Nothing is parsed into a
// value and printed again, so the keys keep their order, duplicates included, numbers keep their
// literals, and strings keep their escapes; only the whitespace between tokens changes. A
// container deeper than MAX_DEPTH is kept as written, whole, so no indent grows past MAX_DEPTH's,
// and the output's length stays linear in the text's however deep it nests.

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
 * The deepest container `formatJson` indents: the top-level object or array is depth 1, and a
 * container that would open at depth `MAX_DEPTH + 1` is kept as written, its brackets, its tokens,
 * and the whitespace between them, on the line where it opens.
 */
export const MAX_DEPTH = 64;

/**
 * Valid JSON text, re-indented: each member or element on its own line, two spaces an indent per
 * depth, `": "` after each key, and an empty object or array as `{}` or `[]`. Every
 * token, a string with its escapes, a number, `true`, `false`, or `null`, and each punctuation
 * mark, appears as the text wrote it and in its order; whitespace outside strings is the only
 * thing that changes. The text must be valid JSON, as `JSON.parse` accepts it: the walk reads
 * tokens without checking their grammar, so it never decides whether the text is valid, and its
 * output for text that isn't is unspecified. Containers to `MAX_DEPTH` deep are indented; one that
 * would open deeper is kept as written, from its opening bracket to its matching closing one, on the
 * line where it opens, and formatting resumes after it. Each token in the outer `MAX_DEPTH` levels
 * adds at most a line break and an indent of `2 * MAX_DEPTH` spaces, so the output's length is
 * linear in the text's, at any depth; only text whose output passes the longest string throws, a
 * RangeError.
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
  // From a string's opening quote, the index of its closing one: the first quote no backslash
  // escapes, or the text's length.
  const stringEnd = (from: number): number => {
    let end = from + 1;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === 0x5c) end += 2;
      else if (inner === 0x22) break;
      else end++;
    }
    return end;
  };
  // From a container's opening bracket, the index past its matching closing one, strings skipped
  // whole so a bracket inside one never counts.
  const containerEnd = (from: number): number => {
    let open = 0;
    let end = from;
    while (end < length) {
      const inner = text.charCodeAt(end);
      if (inner === 0x22) end = stringEnd(end);
      else if (inner === 0x7b || inner === 0x5b) open++;
      else if ((inner === 0x7d || inner === 0x5d) && --open === 0) return end + 1;
      end++;
    }
    return length;
  };
  while ((at = skip(at)) < length) {
    const code = text.charCodeAt(at);
    switch (code) {
      case 0x7b: // {
      case 0x5b: {
        // [
        if (depth === MAX_DEPTH) {
          // Too deep to indent: the container as written, whole.
          const end = containerEnd(at);
          out.push(text.slice(at, end));
          at = end;
          break;
        }
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
        // " : a string, as written.
        const end = stringEnd(at);
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
