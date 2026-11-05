export type RouteContent = {
  /** station ids (see data/dictionaries/stations.json); URL is /route/<from>-<to>/ */
  from: string;
  to: string;
  /** Original, route-specific introduction (2+ paragraphs). */
  intro: string[];
  /** Practical, route-specific tips. */
  tips: string[];
  /** Hand-written Q&A in addition to the data-driven FAQs generated on the page. */
  faqs?: { q: string; a: string }[];
};
