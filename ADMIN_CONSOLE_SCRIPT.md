# 👨‍💼 Admin User Yaratish - Console Script

## 🎯 **Console da to'g'ridan-to'g'ri ishlatish:**

### **1. Saytga kiring:** https://www.zamonbooks.uz
### **2. F12 bosing, Console tab ni oching**
### **3. "joylashga ruxsat berish" yozing va Enter bosing**
### **4. Quyidagi kodni to'liq copy-paste qiling:**

```javascript
// Admin user yaratish - to'liq script
(async function createAdmin() {
  try {
    console.log('🔥 Admin user yaratilmoqda...');
    
    // Firebase imports
    const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js');
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js');
    
    // Admin ma'lumotlari
    const adminEmail = 'admin@zamonbooks.uz';
    const adminPassword = 'Admin123!';
    
    // Firebase auth va db ni tekshirish
    if (!window.auth || !window.db) {
      console.error('❌ Firebase auth yoki db topilmadi');
      console.log('💡 Sahifani yangilab qayta urinib ko\'ring');
      return;
    }
    
    // User yaratish
    const userCredential = await createUserWithEmailAndPassword(
      window.auth, 
      adminEmail, 
      adminPassword
    );
    
    const user = userCredential.user;
    console.log('✅ Firebase Auth user yaratildi:', user.uid);
    
    // Firestore ga admin ma'lumotlarini qo'shish
    await setDoc(doc(window.db, 'users', user.uid), {
      uid: user.uid,
      email: adminEmail,
      displayName: 'Admin User',
      photoURL: 'https://res.cloudinary.com/dcn4maral/image/upload/v1/users/admin-avatar.jpg',
      emailVerified: true,
      phone: '+998901234567',
      
      // Admin huquqlari
      role: 'admin',
      isAdmin: true,
      isActive: true,
      permissions: [
        'books:read', 'books:write', 'books:delete',
        'users:read', 'users:write',
        'orders:read', 'orders:write',
        'analytics:read'
      ],
      
      // User statistikasi
      totalOrders: 0,
      totalSpent: 0,
      
      // Preferences
      preferences: {
        language: 'uz',
        currency: 'UZS',
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        theme: 'dark'
      },
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ Admin ma\'lumotlari Firestore ga saqlandi');
    console.log('🎉 Admin user muvaffaqiyatli yaratildi!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🔗 Admin panel: /admin-login');
    
    alert('✅ Admin user yaratildi!\n📧 Email: ' + adminEmail + '\n🔑 Password: ' + adminPassword);
    
  } catch (error) {
    console.error('❌ Admin user yaratishda xato:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️ Bu email allaqachon mavjud!');
      alert('⚠️ admin@zamonbooks.uz email allaqachon mavjud!\nPassword: Admin123! bilan login qilib ko\'ring');
    } else {
      alert('❌ Xato: ' + error.message);
    }
  }
})();
```

### **5. Enter bosing va natijani kuting**

---

## 🔐 **Login Ma'lumotlari:**
- **📧 Email:** admin@zamonbooks.uz
- **🔑 Password:** Admin123!
- **🔗 Admin Panel:** https://www.zamonbooks.uz/admin-login

---

## ⚠️ **Agar Xato Bo'lsa:**

### **Firebase connection xatosi:**
```javascript
// Firebase connection ni tekshirish
console.log('Auth:', window.auth);
console.log('DB:', window.db);
console.log('Firebase:', window.firebase);
```

### **Email already exists xatosi:**
Bu normal - admin user allaqachon yaratilgan. Yuqoridagi login ma'lumotlari bilan admin panelga kiring.

---

## 🎉 **Muvaffaqiyatli yaratilgandan keyin:**
1. **Admin panelga kiring:** /admin-login
2. **Sample data yarating:** Console da `window.seedFirebaseData()`
3. **Kitoblar qo'shing:** Admin panel orqali