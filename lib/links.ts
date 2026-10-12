// Search links for finding a founder when ProductHunt hides the name. They are searches, never claims:
// we do not scrape, do not guess names, and do not say who the person is.
export function reachLinks(p: { name: string; founder: { name: string } | null; websiteLink: string | null }) {
  const query = p.founder ? `${p.founder.name} ${p.name}` : `${p.name} founder`;
  const q = encodeURIComponent(query);
  return {
    linkedin: `https://www.linkedin.com/search/results/people/?keywords=${q}`,
    x: `https://x.com/search?q=${q}&f=user`,
    site: p.websiteLink, // a ProductHunt redirect to the product's own site; null if missing
  };
}
