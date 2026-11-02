/**
 * The deepest container `formatJson` indents: the top-level object or array is depth 1, and a
 * container that would open at depth `MAX_DEPTH + 1` is kept as written, its brackets, its tokens,
 * and the whitespace between them, on the line where it opens.
 */
export declare const MAX_DEPTH = 64;
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
export declare function formatJson(text: string): string;
