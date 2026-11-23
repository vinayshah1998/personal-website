import type { Metadata } from 'next';

export const SITE = 'vinay shah';
export const DESCRIPTION =
  'software engineer. I build across the stack: iOS apps, Chrome extensions, and AI agents. Also running, bread, and the occasional mountain.';

/**
 * A page's title, description, and link preview. Next replaces the layout's openGraph and twitter objects
 * wholesale when a page sets them, so the shared fields are repeated here, including the preview image: Next serves
 * src/app/opengraph-image.png and twitter-image.png at these paths, but only adds them itself where no page sets openGraph.
 */
const ALT = 'vinay shah, in white pixel type over dithered violet ink on a dark night ground';
const image = (url: string) => ({ url, width: 1200, height: 630, type: 'image/png', alt: ALT });

export function pageMeta(
  path: string,
  title: string | null,
  description = DESCRIPTION,
  article?: { publishedTime: string; tags: string[] },
): Metadata {
  const full = title ? `${title} - ${SITE}` : SITE;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    openGraph: {
      title: full,
      description,
      url: path,
      siteName: SITE,
      locale: 'en_US',
      images: [image('/opengraph-image.png')],
      ...(article ? { type: 'article', ...article } : { type: 'website' }),
    },
    twitter: { card: 'summary_large_image', title: full, description, creator: '@vinayshah1998', images: [image('/twitter-image.png')] },
  };
}
