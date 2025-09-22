// Firebase Admin User Creation Script
// Bu script Firebase'da admin user yaratish uchun

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

// Firebase initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Admin user yaratish funksiyasi
 */
async function createAdminUser(email, password, name = 'Admin User') {
    try {
        console.log('👨‍💼 Admin user yaratilmoqda...');
        console.log('📧 Email:', email);

        // Firebase Auth'da user yaratish
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        console.log('✅ Firebase Auth\'da user yaratildi:', user.uid);

        // User profile yangilash
        await updateProfile(user, {
            displayName: name
        });

        console.log('✅ User profile yangilandi');

        // Firestore'da user ma'lumotlarini saqlash
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            name: name,
            role: 'admin',
            isAdmin: true,
            permissions: [
                'books:read',
                'books:write',
                'books:delete',
                'users:read',
                'users:write',
                'orders:read',
                'orders:write',
                'analytics:read'
            ],
            createdAt: new Date(),
            updatedAt: new Date(),
            lastLogin: null,
            isActive: true
        });

        console.log('✅ Firestore\'da user ma\'lumotlari saqlandi');

        console.log('🎉 Admin user muvaffaqiyatli yaratildi!');
        console.log('📋 Ma\'lumotlar:');
        console.log('   - UID:', user.uid);
        console.log('   - Email:', email);
        console.log('   - Parol:', password);
        console.log('   - Role: admin');
        console.log('   - isAdmin: true');

        return {
            success: true,
            user: {
                uid: user.uid,
                email: email,
                name: name,
                isAdmin: true
            }
        };

    } catch (error) {
        console.error('❌ Admin user yaratishda xato:', error);

        // Firebase error messages
        let errorMessage = 'Noma\'lum xato';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'Bu email allaqachon ishlatilmoqda';
                break;
            case 'auth/weak-password':
                errorMessage = 'Parol juda zaif (kamida 6 ta belgi kerak)';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email manzil noto\'g\'ri';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Internet aloqasi yo\'q';
                break;
        }

        console.error('💡 Xato sababi:', errorMessage);

        return {
            success: false,
            error: error.code,
            message: errorMessage
        };
    }
}

/**
 * Mavjud user'ni admin qilish
 */
async function makeUserAdmin(userId) {
    try {
        console.log('👨‍💼 User admin qilinmoqda...');
        console.log('🆔 User ID:', userId);

        await setDoc(doc(db, 'users', userId), {
            role: 'admin',
            isAdmin: true,
            permissions: [
                'books:read',
                'books:write',
                'books:delete',
                'users:read',
                'users:write',
                'orders:read',
                'orders:write',
                'analytics:read'
            ],
            updatedAt: new Date()
        }, { merge: true });

        console.log('✅ User admin qilindi!');

        return { success: true };

    } catch (error) {
        console.error('❌ User\'ni admin qilishda xato:', error);
        return { success: false, error: error.code };
    }
}

// Command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log('📋 Foydalanish:');
    console.log('   node create-firebase-admin.js create <email> <password> [name]');
    console.log('   node create-firebase-admin.js promote <userId>');
    console.log('');
    console.log('📝 Misollar:');
    console.log('   node create-firebase-admin.js create admin@zamonbooks.uz admin123456 "Admin User"');
    console.log('   node create-firebase-admin.js promote abc123def456');
    process.exit(0);
}

const command = args[0];

if (command === 'create') {
    const email = args[1];
    const password = args[2];
    const name = args[3] || 'Admin User';

    if (!email || !password) {
        console.error('❌ Email va parol kiritish majburiy!');
        process.exit(1);
    }

    createAdminUser(email, password, name);

} else if (command === 'promote') {
    const userId = args[1];

    if (!userId) {
        console.error('❌ User ID kiritish majburiy!');
        process.exit(1);
    }

    makeUserAdmin(userId);

} else {
    console.error('❌ Noto\'g\'ri command:', command);
    console.log('✅ Mavjud commandlar: create, promote');
    process.exit(1);
}

export { createAdminUser, makeUserAdmin };