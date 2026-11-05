/** Paragraph strings support inline links: [text](/internal/path/) or [text](https://…). */
export type Block =
  | string
  | { ul: string[] }
  | { ol: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { note: string };

export type Guide = {
  slug: string;
  title: string;
  /** one-line summary for cards */
  short: string;
  description: string;
  /** last content review (YYYY-MM-DD) */
  updated: string;
  sections: { h: string; blocks: Block[] }[];
};
