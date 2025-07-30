// Dynamic sitemap generator
import { databases } from '../appwriteConfig';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const BOOKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_BOOKS_ID;
const AUTHORS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_AUTHORS_ID;
const GENRES_COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_GENRES_ID;

export const generateSitemap = async () => {
    try {
        // Fetch all data
        const [booksResponse, authorsResponse, genresResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, BOOKS_COLLECTION_ID, [Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, AUTHORS_COLLECTION_ID, [Query.limit(100)]),
            databases.listDocuments(DATABASE_ID, GENRES_COLLECTION_ID, [Query.limit(100)])
        ]);

        const books = booksResponse.documents;
        const authors = authorsResponse.documents;
        const genres = genresResponse.documents;

        // Generate sitemap XML
        let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0">

  <!-- Homepage -->
  <url>
    <loc>https://zamonbooks.uz/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <mobile:mobile/>
  </url>

  <!-- Static Pages -->
  <url>
    <loc>https://zamonbooks.uz/search</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>

`;

        // Add books
        books.forEach(book => {
            const bookUrl = book.slug ? `/kitob/${book.slug}` : `/book/${book.$id}`;
            sitemap += `  <url>
    <loc>https://zamonbooks.uz${bookUrl}</loc>
    <lastmod>${new Date(book.$updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>`;
            
            if (book.imageUrl) {
                sitemap += `
    <image:image>
      <image:loc>${book.imageUrl}</image:loc>
      <image:title>${book.title}</image:title>
      <image:caption>${book.description || book.title}</image:caption>
    </image:image>`;
            }
            
            sitemap += `
  </url>
`;
        });

        // Add authors
        authors.forEach(author => {
            const authorUrl = author.slug ? `/muallif/${author.slug}` : `/author/${author.$id}`;
            sitemap += `  <url>
    <loc>https://zamonbooks.uz${authorUrl}</loc>
    <lastmod>${new Date(author.$updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        });

        // Add genres
        genres.forEach(genre => {
            const genreUrl = genre.slug ? `/janr/${genre.slug}` : `/genre/${genre.$id}`;
            sitemap += `  <url>
    <loc>https://zamonbooks.uz${genreUrl}</loc>
    <lastmod>${new Date(genre.$updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        });

        sitemap += `</urlset>`;

        return sitemap;
    } catch (error) {
        console.error('Sitemap generation error:', error);
        return null;
    }
};