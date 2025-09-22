// Firebase Seed Data - Collections yaratish
// Bu kodni Firebase console'ning browser console'ida ishlatish mumkin

// Yoki loyihada ishlatish uchun:
import { db } from './src/firebaseConfig.js';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// Sample data
const seedData = {
  
  // 1. Genres Collection
  genres: [
    {
      id: 'genre_001',
      name: 'Tarixiy roman',
      description: 'Tarixiy voqealar asosida yozilgan badiiy asarlar',
      slug: 'tarixiy-roman',
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-historical.jpg',
      booksCount: 0,
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'genre_002', 
      name: 'Zamonaviy adabiyot',
      description: 'Hozirgi zamon muammolarini aks ettiruvchi asarlar',
      slug: 'zamonaviy-adabiyot',
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-modern.jpg',
      booksCount: 0,
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'genre_003',
      name: 'Ilmiy-ommabop',
      description: 'Ilmiy ma\'lumotlarni oddiy tilda bayon qiluvchi kitoblar',
      slug: 'ilmiy-ommabop',
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/genre-science.jpg',
      booksCount: 0,
      featured: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ],

  // 2. Authors Collection  
  authors: [
    {
      id: 'author_001',
      name: 'Abdulla Qodiriy',
      biography: 'O\'zbek adabiyotining buyuk vakili, tarixiy roman janrining asoschisi',
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/author-qodiriy.jpg',
      birthYear: 1894,
      deathYear: 1938,
      nationality: 'O\'zbek',
      slug: 'abdulla-qodiriy',
      booksCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'author_002',
      name: 'Oybek',
      biography: 'O\'zbek sovet adabiyotining yirik vakili, shoir va yozuvchi',
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/author-oybek.jpg',
      birthYear: 1905,
      deathYear: 1968,
      nationality: 'O\'zbek',
      slug: 'oybek',
      booksCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ],

  // 3. Books Collection
  books: [
    {
      id: 'book_001',
      title: 'O\'tkan kunlar',
      description: 'XIX asr oxiri va XX asr boshlarida O\'zbekistonda sodir bo\'lgan ijtimoiy-siyosiy voqealarni aks ettiruvchi tarixiy roman',
      price: 45000,
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-otkan-kunlar.jpg',
      authorId: 'author_001',
      authorName: 'Abdulla Qodiriy',
      genreId: 'genre_001', 
      genreName: 'Tarixiy roman',
      stock: 25,
      stockStatus: 'available',
      isbn: '978-9943-01-234-5',
      publishedYear: 1925,
      language: 'uz',
      pages: 320,
      slug: 'otkan-kunlar-abdulla-qodiriy',
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'book_002',
      title: 'Mehrobdan chayon',
      description: 'Abdulla Qodiriyning yana bir mashhur asari',
      price: 38000,
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-mehrobdan-chayon.jpg',
      authorId: 'author_001',
      authorName: 'Abdulla Qodiriy',
      genreId: 'genre_001',
      genreName: 'Tarixiy roman', 
      stock: 15,
      stockStatus: 'low_stock',
      isbn: '978-9943-01-235-2',
      publishedYear: 1928,
      language: 'uz',
      pages: 280,
      slug: 'mehrobdan-chayon-abdulla-qodiriy',
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    },
    {
      id: 'book_003',
      title: 'Navoiy',
      description: 'Alisher Navoiy haqidagi tarixiy roman',
      price: 52000,
      imageUrl: 'https://res.cloudinary.com/dcn4maral/image/upload/v1753237051/book-navoiy.jpg',
      authorId: 'author_002',
      authorName: 'Oybek',
      genreId: 'genre_001',
      genreName: 'Tarixiy roman',
      stock: 30,
      stockStatus: 'available',
      isbn: '978-9943-01-236-9',
      publishedYear: 1945,
      language: 'uz', 
      pages: 450,
      slug: 'navoiy-oybek',
      featured: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }
  ]
};

// Seed function - ma'lumotlarni Firebase'ga yuklash
async function seedFirestore() {
  try {
    console.log('🌱 Seeding Firestore database...');
    
    // 1. Genres yaratish
    console.log('📚 Creating genres...');
    for (const genre of seedData.genres) {
      const { id, ...genreData } = genre;
      await setDoc(doc(db, 'genres', id), genreData);
      console.log(`✅ Genre created: ${genre.name}`);
    }
    
    // 2. Authors yaratish  
    console.log('👨‍💼 Creating authors...');
    for (const author of seedData.authors) {
      const { id, ...authorData } = author;
      await setDoc(doc(db, 'authors', id), authorData);
      console.log(`✅ Author created: ${author.name}`);
    }
    
    // 3. Books yaratish
    console.log('📖 Creating books...');
    for (const book of seedData.books) {
      const { id, ...bookData } = book;
      await setDoc(doc(db, 'books', id), bookData);
      console.log(`✅ Book created: ${book.title}`);
    }
    
    console.log('🎉 Seeding completed successfully!');
    console.log(`📊 Created: ${seedData.genres.length} genres, ${seedData.authors.length} authors, ${seedData.books.length} books`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

// Export qilish
export { seedFirestore, seedData };

// Development uchun global qilish
if (typeof window !== 'undefined') {
  window.seedFirestore = seedFirestore;
  window.seedData = seedData;
}