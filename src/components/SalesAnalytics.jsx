import React, { useState, useEffect } from 'react';
import { databases } from '../lib/appwrite';
import { DATABASE_ID, ORDERS_COLLECTION_ID } from '../lib/config';

// Sales analytics komponenti
const SalesAnalytics = () => {
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    topBooks: [],
    salesByDay: []
  });

  const fetchSalesData = async () => {
    try {
      // Buyurtmalarni olish
      const orders = await databases.listDocuments(
        DATABASE_ID,
        ORDERS_COLLECTION_ID,
        [
          Query.limit(1000)
        ]
      );

      // Statistikalarni hisoblash
      let totalSales = 0;
      let totalRevenue = 0;
      const bookSales = {};

      orders.documents.forEach(order => {
        totalSales += orders.documents.length;
        totalRevenue += order.totalAmount;

        // Eng ko'p sotilgan kitoblar
        if (bookSales[order.bookId]) {
          bookSales[order.bookId].count += order.quantity;
          bookSales[order.bookId].revenue += order.totalAmount;
        } else {
          bookSales[order.bookId] = {
            title: order.bookTitle,
            count: order.quantity,
            revenue: order.totalAmount
          };
        }
      });

      // Eng ko'p sotilgan kitoblar
      const topBooks = Object.values(bookSales)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setSalesData({
        totalSales,
        totalRevenue,
        topBooks,
        salesByDay: [] // Bu yerda kunlik statistika bo'lishi mumkin
      });

    } catch (error) {
      console.error('Sotuv ma\'lumotlarini yuklashda xato:', error);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, []);

  return (
    <div className="sales-analytics">
      <h2>Sotuv Statistikalari</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Jami Sotuvlar</h3>
          <p className="stat-number">{salesData.totalSales}</p>
        </div>
        
        <div className="stat-card">
          <h3>Jami Daromad</h3>
          <p className="stat-number">{salesData.totalRevenue.toLocaleString()} so'm</p>
        </div>
      </div>

      <div className="top-books">
        <h3>Eng Ko'p Sotilgan Kitoblar</h3>
        {salesData.topBooks.map((book, index) => (
          <div key={index} className="book-item">
            <span className="rank">#{index + 1}</span>
            <span className="title">{book.title}</span>
            <span className="count">{book.count} ta</span>
            <span className="revenue">{book.revenue.toLocaleString()} so'm</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SalesAnalytics;