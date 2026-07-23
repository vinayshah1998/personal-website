import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  excerpt: string;
  content: string;
  readingTime: number;
}

const postsDirectory = path.join(process.cwd(), 'src/app/blog/posts');

export function getAllPosts(): BlogPost[] {
  // Get all markdown files in the posts directory
  const fileNames = fs.readdirSync(postsDirectory);
  const allPosts = fileNames
    .filter((fileName) => fileName.endsWith('.md'))
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, '');
      return getPostBySlug(slug);
    })
    .filter((post): post is BlogPost => post !== null);

  // ISO calendar dates sort correctly without introducing timezone shifts.
  return allPosts.sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(postsDirectory, `${slug}.md`);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);
    const normalizedContent = content.replace(/^\s*#\s+[^\r\n]+\r?\n+/, '');

    // Extract excerpt (first 200 characters of content)
    const excerpt =
      normalizedContent.slice(0, 200).replace(/[#*`]/g, '').trim() + '...';
    const wordCount = normalizedContent.trim().split(/\s+/).length;

    return {
      slug,
      title: data.title || '',
      date: data.date || '',
      tags: data.tags || [],
      excerpt: data.excerpt || excerpt,
      content: normalizedContent,
      readingTime: Math.max(1, Math.ceil(wordCount / 220)),
    };
  } catch {
    return null;
  }
}

export function formatBlogDate(date: string) {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function getAllTags(): string[] {
  const posts = getAllPosts();
  const tags = new Set<string>();

  posts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag));
  });

  return Array.from(tags).sort();
}
