// D:\zamon-books-frontend\src\appwriteConfig.js
import { Client, Databases, Account, ID, Query } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT) // Your API Endpoint
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID); // Your Project ID

const databases = new Databases(client);
const account = new Account(client); // Account servisni qo'shish

export { client, databases, account, ID, Query };