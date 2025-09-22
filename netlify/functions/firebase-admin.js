/**
 * Firebase Admin Function for Production
 * Handles server-side Firebase operations
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
  });
}

const db = admin.firestore();
const auth = admin.auth();

export const handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': process.env.VITE_SITE_URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { action, data, collection, documentId, userId } = JSON.parse(event.body || '{}');
    const authToken = event.headers.authorization?.replace('Bearer ', '');

    // Verify authentication for protected operations
    let decodedToken = null;
    if (authToken) {
      try {
        decodedToken = await auth.verifyIdToken(authToken);
      } catch (error) {
        console.error('Token verification failed:', error);
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Invalid authentication token' })
        };
      }
    }

    let result;

    switch (action) {
      case 'createUser':
        result = await createUser(data);
        break;

      case 'updateUser':
        if (!decodedToken) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
        }
        result = await updateUser(decodedToken.uid, data);
        break;

      case 'deleteUser':
        if (!decodedToken || !await isAdmin(decodedToken.uid)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        result = await deleteUser(userId);
        break;

      case 'getDocument':
        result = await getDocument(collection, documentId);
        break;

      case 'createDocument':
        if (!decodedToken) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
        }
        result = await createDocument(collection, data, decodedToken.uid);
        break;

      case 'updateDocument':
        if (!decodedToken) {
          return { statusCode: 401, headers, body: JSON.stringify({ error: 'Authentication required' }) };
        }
        result = await updateDocument(collection, documentId, data, decodedToken.uid);
        break;

      case 'deleteDocument':
        if (!decodedToken || !await isAdmin(decodedToken.uid)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        result = await deleteDocument(collection, documentId);
        break;

      case 'getCollection':
        result = await getCollection(collection, data?.filters, data?.limit, data?.orderBy);
        break;

      case 'batchWrite':
        if (!decodedToken || !await isAdmin(decodedToken.uid)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        result = await batchWrite(data.operations);
        break;

      case 'generateCustomToken':
        if (!decodedToken || !await isAdmin(decodedToken.uid)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        result = await generateCustomToken(userId, data?.claims);
        break;

      case 'setCustomClaims':
        if (!decodedToken || !await isAdmin(decodedToken.uid)) {
          return { statusCode: 403, headers, body: JSON.stringify({ error: 'Admin access required' }) };
        }
        result = await setCustomClaims(userId, data.claims);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, data: result })
    };

  } catch (error) {
    console.error('Firebase admin error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      })
    };
  }
};

// User management functions
async function createUser(userData) {
  const userRecord = await auth.createUser({
    email: userData.email,
    password: userData.password,
    displayName: userData.displayName,
    disabled: false
  });

  // Create user document in Firestore
  await db.collection('users').doc(userRecord.uid).set({
    email: userData.email,
    displayName: userData.displayName,
    isAdmin: userData.isAdmin || false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return { uid: userRecord.uid, email: userRecord.email };
}

async function updateUser(uid, userData) {
  // Update auth record
  const updateData = {};
  if (userData.email) updateData.email = userData.email;
  if (userData.displayName) updateData.displayName = userData.displayName;
  if (userData.password) updateData.password = userData.password;
  if (userData.disabled !== undefined) updateData.disabled = userData.disabled;

  if (Object.keys(updateData).length > 0) {
    await auth.updateUser(uid, updateData);
  }

  // Update Firestore document
  const firestoreData = { ...userData };
  delete firestoreData.password; // Don't store password in Firestore
  firestoreData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection('users').doc(uid).update(firestoreData);

  return { uid, updated: true };
}

async function deleteUser(uid) {
  // Delete auth record
  await auth.deleteUser(uid);

  // Delete Firestore document
  await db.collection('users').doc(uid).delete();

  return { uid, deleted: true };
}

// Document management functions
async function getDocument(collection, documentId) {
  const doc = await db.collection(collection).doc(documentId).get();
  
  if (!doc.exists) {
    throw new Error('Document not found');
  }

  return { id: doc.id, ...doc.data() };
}

async function createDocument(collection, data, userId) {
  const docData = {
    ...data,
    createdBy: userId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  const docRef = await db.collection(collection).add(docData);
  
  return { id: docRef.id, ...docData };
}

async function updateDocument(collection, documentId, data, userId) {
  const updateData = {
    ...data,
    updatedBy: userId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection(collection).doc(documentId).update(updateData);
  
  return { id: documentId, updated: true };
}

async function deleteDocument(collection, documentId) {
  await db.collection(collection).doc(documentId).delete();
  
  return { id: documentId, deleted: true };
}

async function getCollection(collection, filters = [], limit = 50, orderBy = null) {
  let query = db.collection(collection);

  // Apply filters
  filters.forEach(filter => {
    query = query.where(filter.field, filter.operator, filter.value);
  });

  // Apply ordering
  if (orderBy) {
    query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
  }

  // Apply limit
  query = query.limit(limit);

  const snapshot = await query.get();
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

async function batchWrite(operations) {
  const batch = db.batch();

  operations.forEach(operation => {
    const { type, collection, documentId, data } = operation;
    const docRef = documentId 
      ? db.collection(collection).doc(documentId)
      : db.collection(collection).doc();

    switch (type) {
      case 'set':
        batch.set(docRef, {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
      case 'update':
        batch.update(docRef, {
          ...data,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        break;
      case 'delete':
        batch.delete(docRef);
        break;
    }
  });

  await batch.commit();
  
  return { operations: operations.length, committed: true };
}

// Authentication functions
async function generateCustomToken(uid, customClaims = {}) {
  const token = await auth.createCustomToken(uid, customClaims);
  return { token };
}

async function setCustomClaims(uid, claims) {
  await auth.setCustomUserClaims(uid, claims);
  return { uid, claims };
}

// Helper functions
async function isAdmin(uid) {
  try {
    const userDoc = await db.collection('users').doc(uid).get();
    return userDoc.exists && userDoc.data()?.isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}