// Firebase Enhanced Setup and Sample Data Script
// Bu script Firebase loyihasini to'liq sozlash va professional sample data qo'shish uchun

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  serverTimestamp,
  writeBatch 
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import dotenv from 'dotenv';
dotenv.config();

// Firebase config - .env faylidan olinadi
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Firebase app'ni initialize qilish
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enhanced sample data with proper structure

// Authors data (first, so we can reference them)
const sampleAuthors = [
  {
    name: "Abdulla Qodiriy",
    biography: "O'zbek adabiyotining asoschisi, taniqli yozuvchi va dramaturg. O'zbek milliy adabiyotining shakllanishida katta hissa qo'shgan.",
    birthYear: 1894,
    deathYear: 1938,
    nationality: "O'zbek",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_400,f_auto,q_auto/v1/authors/qodiriy.jpg",
    slug: "abdulla-qodiriy",
    isActive: true,
    isFeatured: true,
    bookCount: 0,
    totalSales: 0,
    popularityScore: 95
  },
  {
    name: "Cho'lpon",
    biography: "O'zbek she'riyatining yirik vakili, zamonaviy o'zbek adabiyotining asoschileridan biri.",
    birthYear: 1897,
    deathYear: 1938,
    nationality: "O'zbek",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_400,f_auto,q_auto/v1/authors/cholpon.jpg",
    slug: "cholpon",
    isActive: true,
    isFeatured: true,
    bookCount: 0,
    totalSales: 0,
    popularityScore: 88
  },
  {
    name: "Oybek",
    biography: "O'zbek adabiyotining klassigi, taniqli yozuvchi va shoir.",
    birthYear: 1905,
    deathYear: 1968,
    nationality: "O'zbek",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_400,f_auto,q_auto/v1/authors/oybek.jpg",
    slug: "oybek",
    isActive: true,
    isFeatured: true,
    bookCount: 0,
    totalSales: 0,
    popularityScore: 92
  },
  {
    name: "Gafur Gulom",
    biography: "O'zbek adabiyotining yirik vakili, shoir va yozuvchi.",
    birthYear: 1903,
    deathYear: 1966,
    nationality: "O'zbek",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_400,f_auto,q_auto/v1/authors/gafur-gulom.jpg",
    slug: "gafur-gulom",
    isActive: true,
    isFeatured: false,
    bookCount: 0,
    totalSales: 0,
    popularityScore: 85
  },
  {
    name: "Hamid Olimjon",
    biography: "O'zbek she'riyatining taniqli vakili, lirik shoir.",
    birthYear: 1909,
    deathYear: 1944,
    nationality: "O'zbek",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_400,f_auto,q_auto/v1/authors/hamid-olimjon.jpg",
    slug: "hamid-olimjon",
    isActive: true,
    isFeatured: false,
    bookCount: 0,
    totalSales: 0,
    popularityScore: 80
  }
];

// Genres data
const sampleGenres = [
  {
    name: "Badiiy adabiyot",
    description: "Roman, hikoya va boshqa badiiy asarlar. Hayotning turli jabhalarini aks ettiruvchi adabiy asarlar.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/badiiy-adabiyot.jpg",
    slug: "badiiy-adabiyot",
    isActive: true,
    bookCount: 0,
    popularityScore: 95,
    sortOrder: 1
  },
  {
    name: "She'riyat",
    description: "She'r to'plamlari va lirik asarlar. O'zbek she'riyatining eng sara namunalari.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/sheriyat.jpg",
    slug: "sheriyat",
    isActive: true,
    bookCount: 0,
    popularityScore: 88,
    sortOrder: 2
  },
  {
    name: "Diniy adabiyot",
    description: "Islomiy va ma'naviy kitoblar. Din va ma'naviyat haqidagi asarlar.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/diniy-adabiyot.jpg",
    slug: "diniy-adabiyot",
    isActive: true,
    bookCount: 0,
    popularityScore: 92,
    sortOrder: 3
  },
  {
    name: "Tarix",
    description: "Tarixiy kitoblar va tadqiqotlar. O'zbekiston va jahon tarixi haqidagi asarlar.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/tarix.jpg",
    slug: "tarix",
    isActive: true,
    bookCount: 0,
    popularityScore: 75,
    sortOrder: 4
  },
  {
    name: "Ilmiy adabiyot",
    description: "Ilmiy va texnik adabiyot. Turli sohalardagi ilmiy tadqiqotlar va ma'lumotnomalar.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/ilmiy.jpg",
    slug: "ilmiy-adabiyot",
    isActive: true,
    bookCount: 0,
    popularityScore: 70,
    sortOrder: 5
  },
  {
    name: "Bolalar adabiyoti",
    description: "Bolalar va o'smirlar uchun kitoblar. Tarbiyaviy va o'quv qo'llanmalari.",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_400,h_250,f_auto,q_auto/v1/genres/bolalar.jpg",
    slug: "bolalar-adabiyoti",
    isActive: true,
    bookCount: 0,
    popularityScore: 85,
    sortOrder: 6
  }
];

// Enhanced books data with proper structure
const sampleBooks = [
  {
    title: "O'tkan kunlar",
    description: "O'zbek adabiyotining eng mashhur romanlaridan biri. XIX asr oxiri va XX asr boshlarida o'zbek xalqining hayoti, urf-odatlari va ijtimoiy munosabatlari haqida hikoya qiluvchi tarixiy roman.",
    authorName: "Abdulla Qodiriy",
    authorId: "", // Will be filled after authors are created
    genreId: "", // Will be filled after genres are created
    price: 25000,
    publishedYear: 1925,
    isbn: "978-9943-01-001-1",
    pageCount: 320,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/otkan-kunlar.jpg",
    
    // Inventory
    stock: 50,
    stockStatus: "available",
    minStockLevel: 5,
    maxStockLevel: 100,
    
    // Business Logic
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    allowPreOrder: true,
    enableWaitlist: true,
    
    // Analytics
    viewCount: 1250,
    salesCount: 120,
    demandScore: 95,
    rating: 4.8,
    reviewCount: 45,
    
    // Admin
    adminPriority: 10,
    visibility: "visible",
    
    // SEO
    slug: "otkan-kunlar-abdulla-qodiriy",
    metaTitle: "O'tkan kunlar - Abdulla Qodiriy | Zamon Books",
    metaDescription: "O'zbek adabiyotining eng mashhur romanlaridan biri. Abdulla Qodiriyning tarixiy romani onlayn xarid qiling."
  },
  {
    title: "Mehrobdan chayon",
    description: "Abdulla Qodiriyning yana bir mashhur asari. O'zbek xalqining ma'naviy boyliklarini, urf-odatlarini va an'analarini aks ettiruvchi hikoya.",
    authorName: "Abdulla Qodiriy",
    authorId: "",
    genreId: "",
    price: 22000,
    publishedYear: 1926,
    isbn: "978-9943-01-002-8",
    pageCount: 280,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/mehrobdan-chayon.jpg",
    
    stock: 30,
    stockStatus: "available",
    minStockLevel: 3,
    maxStockLevel: 50,
    
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    allowPreOrder: true,
    enableWaitlist: true,
    
    viewCount: 890,
    salesCount: 85,
    demandScore: 80,
    rating: 4.6,
    reviewCount: 32,
    
    adminPriority: 8,
    visibility: "visible",
    
    slug: "mehrobdan-chayon-abdulla-qodiriy",
    metaTitle: "Mehrobdan chayon - Abdulla Qodiriy | Zamon Books",
    metaDescription: "Abdulla Qodiriyning mashhur hikoyasi. O'zbek adabiyotining klassik asari onlayn sotib oling."
  },
  {
    title: "Ufq",
    description: "Cho'lponning eng mashhur she'riy to'plami. O'zbek she'riyatining durdonasi bo'lgan bu asarda muhabbat, vatan va insoniy fazilatlar mavzulari ko'tarilgan.",
    authorName: "Cho'lpon",
    authorId: "",
    genreId: "", // She'riyat
    price: 18000,
    publishedYear: 1922,
    isbn: "978-9943-01-003-5",
    pageCount: 150,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/ufq.jpg",
    
    stock: 25,
    stockStatus: "available",
    minStockLevel: 3,
    maxStockLevel: 40,
    
    isAvailable: true,
    isFeatured: false,
    isNewArrival: true,
    allowPreOrder: true,
    enableWaitlist: true,
    
    viewCount: 650,
    salesCount: 60,
    demandScore: 75,
    rating: 4.7,
    reviewCount: 28,
    
    adminPriority: 7,
    visibility: "visible",
    
    slug: "ufq-cholpon",
    metaTitle: "Ufq - Cho'lpon | Zamon Books",
    metaDescription: "Cho'lponning mashhur she'riy to'plami. O'zbek she'riyatining klassik asari."
  },
  {
    title: "Navoi",
    description: "Oybekning mashhur tarixiy romani. Alisher Navoiyning hayoti va ijodi haqidagi keng qamrovli asar.",
    authorName: "Oybek",
    authorId: "",
    genreId: "",
    price: 35000,
    publishedYear: 1945,
    isbn: "978-9943-01-004-2",
    pageCount: 520,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/navoi.jpg",
    
    stock: 40,
    stockStatus: "available",
    minStockLevel: 5,
    maxStockLevel: 80,
    
    isAvailable: true,
    isFeatured: true,
    isNewArrival: false,
    allowPreOrder: true,
    enableWaitlist: true,
    
    viewCount: 1100,
    salesCount: 95,
    demandScore: 90,
    rating: 4.9,
    reviewCount: 67,
    
    adminPriority: 9,
    visibility: "visible",
    
    slug: "navoi-oybek",
    metaTitle: "Navoi - Oybek | Zamon Books",
    metaDescription: "Oybekning mashhur tarixiy romani. Alisher Navoiy haqidagi keng qamrovli asar."
  },
  {
    title: "Quyosh qoraymas",
    description: "Gafur Gulomning she'riy to'plami. Vatan sevgisi va insonparvarlik mavzularida yozilgan she'rlar.",
    authorName: "Gafur Gulom",
    authorId: "",
    genreId: "", // She'riyat
    price: 16000,
    publishedYear: 1940,
    isbn: "978-9943-01-005-9",
    pageCount: 120,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/quyosh-qoraymas.jpg",
    
    stock: 20,
    stockStatus: "available",
    minStockLevel: 2,
    maxStockLevel: 30,
    
    isAvailable: true,
    isFeatured: false,
    isNewArrival: false,
    allowPreOrder: true,
    enableWaitlist: true,
    
    viewCount: 420,
    salesCount: 35,
    demandScore: 65,
    rating: 4.5,
    reviewCount: 18,
    
    adminPriority: 6,
    visibility: "visible",
    
    slug: "quyosh-qoraymas-gafur-gulom",
    metaTitle: "Quyosh qoraymas - Gafur Gulom | Zamon Books",
    metaDescription: "Gafur Gulomning she'riy to'plami. Vatan sevgisi mavzusidagi she'rlar."
  },
  {
    title: "Muqaddas ishq",
    description: "Hamid Olimjonning lirik she'rlari to'plami. Muhabbat va go'zallik mavzularidagi nozik she'rlar.",
    authorName: "Hamid Olimjon",
    authorId: "",
    genreId: "", // She'riyat
    price: 14000,
    publishedYear: 1938,
    isbn: "978-9943-01-006-6",
    pageCount: 100,
    language: "uz",
    imageUrl: "https://res.cloudinary.com/dcn4maral/image/upload/c_fill,w_300,h_450,f_auto,q_auto/v1/books/muqaddas-ishq.jpg",
    
    stock: 15,
    stockStatus: "low_stock",
    minStockLevel: 3,
    maxStockLevel: 25,
    
    isAvailable: true,
    isFeatured: false,
    isNewArrival: true,
    allowPreOrder: true,
    enableWaitlist: true,
    
    viewCount: 380,
    salesCount: 28,
    demandScore: 60,
    rating: 4.4,
    reviewCount: 15,
    
    adminPriority: 5,
    visibility: "visible",
    
    slug: "muqaddas-ishq-hamid-olimjon",
    metaTitle: "Muqaddas ishq - Hamid Olimjon | Zamon Books",
    metaDescription: "Hamid Olimjonning lirik she'rlari to'plami. Muhabbat mavzusidagi nozik she'rlar."
  }
];

// Firebase setup function
async function setupFirebase() {
  try {
    console.log('🔥 Firebase Enhanced Setup boshlandi...');
    console.log('📊 Yaratilishi kerak bo\'lgan ma\'lumotlar:');
    console.log(`   - ${sampleAuthors.length} ta muallif`);
    console.log(`   - ${sampleGenres.length} ta janr`);
    console.log(`   - ${sampleBooks.length} ta kitob`);
    console.log(`   - 1 ta admin user`);
    console.log('');

    // 1. Authors collection yaratish
    console.log('👤 Mualliflar qo\'shilmoqda...');
    const authorIds = {};
    
    for (const author of sampleAuthors) {
      const docRef = await addDoc(collection(db, 'authors'), {
        ...author,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      authorIds[author.name] = docRef.id;
      console.log(`✅ Muallif qo'shildi: ${author.name} (ID: ${docRef.id})`);
    }

    // 2. Genres collection yaratish
    console.log('\n🏷️ Janrlar qo\'shilmoqda...');
    const genreIds = {};
    
    for (const genre of sampleGenres) {
      const docRef = await addDoc(collection(db, 'genres'), {
        ...genre,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      genreIds[genre.name] = docRef.id;
      console.log(`✅ Janr qo'shildi: ${genre.name} (ID: ${docRef.id})`);
    }

    // 3. Books collection yaratish (with proper references)
    console.log('\n📚 Kitoblar qo\'shilmoqda...');
    
    for (const book of sampleBooks) {
      // Set proper author and genre IDs
      const bookData = {
        ...book,
        authorId: authorIds[book.authorName] || '',
        genreId: book.authorName === "Cho'lpon" || book.authorName === "Gafur Gulom" || book.authorName === "Hamid Olimjon" 
          ? genreIds["She'riyat"] 
          : genreIds["Badiiy adabiyot"],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        publishedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'books'), bookData);
      console.log(`✅ Kitob qo'shildi: ${book.title} (ID: ${docRef.id})`);
    }

    // 4. Admin user yaratish
    console.log('\n👨‍💼 Admin user yaratilmoqda...');
    try {
      const adminEmail = 'admin@zamonbooks.uz';
      const adminPassword = 'ZamonBooks2025!';
      
      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
      const user = userCredential.user;
      
      // Admin profile yangilash
      await updateProfile(user, {
        displayName: 'Zamon Books Admin'
      });
      
      // Admin user data Firestore'ga saqlash
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: adminEmail,
        displayName: 'Zamon Books Admin',
        fullName: 'Zamon Books Administrator',
        phone: '+998901234567',
        address: 'Toshkent, O\'zbekiston',
        telegramUsername: '@zamon_books_admin',
        role: 'admin',
        isAdmin: true,
        isActive: true,
        isVerified: true,
        preferredLanguage: 'uz',
        theme: 'dark',
        notifications: {
          email: true,
          sms: true,
          telegram: true
        },
        loginCount: 0,
        totalOrders: 0,
        totalSpent: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Admin user yaratildi:');
      console.log(`   📧 Email: ${adminEmail}`);
      console.log(`   🔑 Parol: ${adminPassword}`);
      console.log(`   👤 UID: ${user.uid}`);
      
    } catch (authError) {
      console.log('⚠️ Admin user yaratishda xato (ehtimol allaqachon mavjud):');
      console.log(`   ${authError.message}`);
    }

    // 5. Sample collections yaratish (bo'sh)
    console.log('\n📦 Qo\'shimcha collection\'lar tayyorlanmoqda...');
    console.log('   ℹ️ Cart, Orders, Wishlist va boshqa collection\'lar');
    console.log('   ℹ️ foydalanuvchilar tomonidan ishlatilganda avtomatik yaratiladi.');

    console.log('\n🎉 Firebase Enhanced Setup muvaffaqiyatli yakunlandi!');
    console.log('📊 Yaratilgan ma\'lumotlar:');
    console.log(`   - ${sampleAuthors.length} ta muallif`);
    console.log(`   - ${sampleGenres.length} ta janr`);
    console.log(`   - ${sampleBooks.length} ta kitob`);
    console.log(`   - 1 ta admin user`);
    console.log(`   - Collection'lar avtomatik yaratiladi`);
    console.log('');
    console.log('🚀 Loyiha ishlatishga tayyor!');
    console.log('💡 Admin panel: /admin-dashboard');
    console.log('🔐 Admin login ma\'lumotlari yuqorida ko\'rsatilgan');

  } catch (error) {
    console.error('❌ Firebase setup xatosi:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Script ishga tushirish
if (import.meta.url === `file://${process.argv[1]}`) {
  setupFirebase().then(() => {
    console.log('\n✨ Setup yakunlandi. Process tugaydi...');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Setup muvaffaqiyatsiz tugadi:', error);
    process.exit(1);
  });
}

export { setupFirebase };