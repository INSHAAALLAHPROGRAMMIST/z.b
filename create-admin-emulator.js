// Emulator orqali Admin User yaratish
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, doc, setDoc } from 'firebase/firestore';

// Firebase config (emulator uchun)
const firebaseConfig = {
    projectId: "zbdbonfb",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Emulator connect
try {
    connectFirestoreEmulator(db, '127.0.0.1', 8765);
    console.log('🔥 Connected to Firebase Emulator');
} catch (error) {
    console.log('Emulator already connected');
}

// Admin user profile (Auth'siz, faqat Firestore)
async function createAdminProfile() {
    try {
        console.log('👤 Creating admin profile in Firestore...');
        
        const adminProfile = {
            email: 'admin@zamonbooks.uz',
            displayName: 'Zamon Books Admin',
            photoURL: '',
            phone: '+998901234567',
            address: {
                street: 'Amir Temur ko\'chasi 15',
                city: 'Toshkent',
                region: 'Toshkent',
                postalCode: '100000',
                country: 'Uzbekistan'
            },
            preferences: {
                language: 'uz',
                currency: 'UZS',
                notifications: true,
                theme: 'dark',
                emailMarketing: true
            },
            role: 'admin',
            permissions: [
                'read', 'write', 'delete', 
                'manage_users', 'manage_orders', 
                'manage_inventory', 'manage_settings',
                'manage_books', 'manage_authors', 'manage_genres'
            ],
            isActive: true,
            isVerified: true,
            lastLoginIP: '127.0.0.1',
            loginCount: 0,
            totalSpent: 0,
            orderCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLoginAt: new Date()
        };
        
        // Admin ID sifatida 'admin' ishlatamiz
        await setDoc(doc(db, 'users', 'admin'), adminProfile);
        console.log(`✅ Admin profile created in Firestore`);
        
        console.log('🎉 Admin profile successfully created!');
        console.log('');
        console.log('📋 ADMIN INFO:');
        console.log(`ID: admin`);
        console.log(`Email: admin@zamonbooks.uz`);
        console.log(`Role: admin`);
        console.log(`Permissions: Full access`);
        console.log('');
        console.log('🌐 View in Firebase UI: http://127.0.0.1:4000/firestore');
        console.log('📊 Admin Panel: http://localhost:5173/admin');
        
        // Test uchun qo'shimcha ma'lumotlar
        console.log('');
        console.log('🧪 FOR TESTING:');
        console.log('1. Firebase Emulator UI\'da users collection\'ni ko\'ring');
        console.log('2. Admin panel\'ga kiring');
        console.log('3. Kitob qo\'shishni test qiling');
        
    } catch (error) {
        console.error('❌ Failed to create admin profile:', error);
    }
}

// Run
createAdminProfile();