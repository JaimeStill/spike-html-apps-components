// A static fixture of document listings in go-web-service's wire shape at commit 15e0bc3, for the
// demo and the browser tier's components cases.
// From spike-html-packages-components (4c0a5d8): demo/documents.js.

/**
 * go-web-sdk's paginated read: `page` is omitted under a cursor, `total` when the read didn't
 * count, and `next` when the read can't continue by cursor.
 *
 * @template T
 * @typedef {{
 *   items: T[];
 *   page?: number;
 *   size: number;
 *   total?: number;
 *   more: boolean;
 *   next?: string;
 * }} Page
 */

/**
 * A directory as a listing presents it; only the single-directory read adds `path`.
 *
 * @typedef {{
 *   id: string;
 *   parent_id: string | null;
 *   name: string;
 *   path?: string;
 *   status: "active" | "deleting";
 *   version: number;
 *   created_at: string;
 *   updated_at: string;
 * }} Directory
 */

/**
 * A file; `size` is null until its write completes.
 *
 * @typedef {{
 *   id: string;
 *   directory_id: string;
 *   name: string;
 *   status: "pending" | "available" | "deleting";
 *   size: number | null;
 *   content_type: string;
 *   version: number;
 *   created_at: string;
 *   updated_at: string;
 * }} File
 */

/** The document root's id: every directory below lists under it. */
const root = "01a06121-cc00-78d5-82fe-91ab0d2477c3";

/**
 * The second page of the root's directories by number, sorted by name: page 2 of 3.
 *
 * @type {Page<Directory>}
 */
export const directories = {
  items: [
    {
      id: "01a066c2-d640-79f6-9e40-5e84b8bd80a9",
      parent_id: root,
      name: "designs",
      status: "active",
      version: 4,
      created_at: "2026-09-03T10:14:00Z",
      updated_at: "2026-10-12T16:41:07.219Z",
    },
    {
      id: "01a066c4-35d0-7ae0-bd6d-213a95454f44",
      parent_id: root,
      name: "invoices",
      status: "active",
      version: 1,
      created_at: "2026-09-03T10:15:30Z",
      updated_at: "2026-09-03T10:15:30Z",
    },
    {
      id: "01a06cba-1ab8-7346-9611-eacebc9b6adc",
      parent_id: root,
      name: "legal",
      status: "active",
      version: 2,
      created_at: "2026-09-04T14:02:11Z",
      updated_at: "2026-10-14T09:12:44.507Z",
    },
  ],
  page: 2,
  size: 3,
  total: 8,
  more: true,
  next: "eyJuYW1lIjoibGVnYWwifQ",
};

/**
 * The first page of the designs directory's files: one still pending, so its size is null.
 *
 * @type {Page<File>}
 */
export const files = {
  items: [
    {
      id: "01a0805a-59c0-790b-b759-1e6347fae3c2",
      directory_id: "01a066c2-d640-79f6-9e40-5e84b8bd80a9",
      name: "brand-guide.pdf",
      status: "available",
      size: 2418176,
      content_type: "application/pdf",
      version: 1,
      created_at: "2026-09-08T09:30:00Z",
      updated_at: "2026-09-08T09:30:02.884Z",
    },
    {
      id: "01a08af9-7780-7748-90f4-dcb1cfe8ecae",
      directory_id: "01a066c2-d640-79f6-9e40-5e84b8bd80a9",
      name: "notes.md",
      status: "available",
      size: 18432,
      content_type: "text/markdown",
      version: 3,
      created_at: "2026-09-10T11:00:00Z",
      updated_at: "2026-10-16T18:05:51.032Z",
    },
    {
      id: "01a13e70-a888-7684-ada5-f916b43dde6a",
      directory_id: "01a066c2-d640-79f6-9e40-5e84b8bd80a9",
      name: "storefront.png",
      status: "pending",
      size: null,
      content_type: "image/png",
      version: 1,
      created_at: "2026-10-15T07:22:13Z",
      updated_at: "2026-10-15T07:22:13Z",
    },
  ],
  page: 1,
  size: 3,
  total: 5,
  more: true,
  next: "eyJuYW1lIjoic3RvcmVmcm9udC5wbmcifQ",
};

/**
 * The legal directory's files continued by cursor (`cursor=<next>` in place of `page`): a
 * continued page has no `page`, and this read didn't count, so it has no `total` either.
 *
 * @type {Page<File>}
 */
export const continued = {
  items: [
    {
      id: "01a13e71-fc60-7932-aa92-c43392d8e7f9",
      directory_id: "01a06cba-1ab8-7346-9611-eacebc9b6adc",
      name: "nda-2026.pdf",
      status: "available",
      size: 96412,
      content_type: "application/pdf",
      version: 1,
      created_at: "2026-10-15T07:23:40Z",
      updated_at: "2026-10-15T07:23:41.115Z",
    },
    {
      id: "01a13e73-3cb0-7bbc-87f0-910990762f62",
      directory_id: "01a06cba-1ab8-7346-9611-eacebc9b6adc",
      name: "retainer.docx",
      status: "available",
      size: 41230,
      content_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      version: 2,
      created_at: "2026-10-15T07:25:02Z",
      updated_at: "2026-10-16T08:00:19.650Z",
    },
    {
      id: "01a145e4-4818-7058-aa47-61d7ecb1792f",
      directory_id: "01a06cba-1ab8-7346-9611-eacebc9b6adc",
      name: "terms.md",
      status: "available",
      size: 7204,
      content_type: "text/markdown",
      version: 1,
      created_at: "2026-10-16T18:05:51Z",
      updated_at: "2026-10-16T18:05:51Z",
    },
  ],
  size: 3,
  more: true,
  next: "eyJuYW1lIjoidGVybXMubWQifQ",
};

/** The page sizes every composition offers. */
export const pageSizes = [3, 6, 12];
