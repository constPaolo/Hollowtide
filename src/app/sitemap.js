import { projects } from '@/data/projects';

const SITE_URL = 'https://hollowtide.paolomeccariello.dev';

export default function sitemap() {
  const pages = ['', '/work', '/studio', '/contact', ...projects.map(p => `/work/${p.slug}`)];
  return pages.map(path => ({ url: `${SITE_URL}${path}`, lastModified: new Date() }));
}
