/**
 * Enhanced Order Model
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4
 */

export const OrderStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const PaymentStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIAL: 'partial'
};

export const PaymentMethod = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  ONLINE: 'online'
};

export const ShippingMethod = {
  PICKUP: 'pickup',
  DELIVERY: 'delivery',
  COURIER: 'courier',
  POST: 'post'
};

/**
 * Enhanced Order Model with comprehensive tracking
 */
export class OrderModel {
  constructor(data = {}) {
    // Basic order information
    this.id = data.id || null;
    this.orderNumber = data.orderNumber || this.generateOrderNumber();
    this.userId = data.userId || null;
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || 0;
    this.status = data.status || OrderStatus.PENDING;

    // Enhanced customer information
    this.customer = {
      name: data.customer?.name || '',
      email: data.customer?.email || '',
      phone: data.customer?.phone || '',
      telegramUsername: data.customer?.telegramUsername || '',
      address: {
        street: data.customer?.address?.street || '',
        city: data.customer?.address?.city || '',
        region: data.customer?.address?.region || '',
        postalCode: data.customer?.address?.postalCode || '',
        country: data.customer?.address?.country || 'Uzbekistan'
      }
    };

    // Enhanced payment information
    this.payment = {
      method: data.payment?.method || PaymentMethod.CASH,
      status: data.payment?.status || PaymentStatus.PENDING,
      transactionId: data.payment?.transactionId || null,
      amount: data.payment?.amount || this.totalAmount,
      currency: data.payment?.currency || 'UZS',
      paidAt: data.payment?.paidAt || null,
      dueDate: data.payment?.dueDate || null
    };

    // Enhanced shipping information
    this.shipping = {
      method: data.shipping?.method || ShippingMethod.PICKUP,
      cost: data.shipping?.cost || 0,
      trackingNumber: data.shipping?.trackingNumber || null,
      carrier: data.shipping?.carrier || null,
      estimatedDelivery: data.shipping?.estimatedDelivery || null,
      actualDelivery: data.shipping?.actualDelivery || null,
      address: data.shipping?.address || this.customer.address,
      instructions: data.shipping?.instructions || ''
    };

    // Order breakdown
    this.breakdown = {
      subtotal: data.breakdown?.subtotal || 0,
      shippingCost: data.breakdown?.shippingCost || this.shipping.cost,
      tax: data.breakdown?.tax || 0,
      discount: data.breakdown?.discount || 0,
      total: data.breakdown?.total || this.totalAmount
    };

    // Notification tracking
    this.notifications = {
      adminNotified: data.notifications?.adminNotified || false,
      customerNotified: data.notifications?.customerNotified || false,
      telegramSent: data.notifications?.telegramSent || false,
      emailSent: data.notifications?.emailSent || false,
      smsSent: data.notifications?.smsSent || false
    };

    // Status tracking with timestamps
    this.statusHistory = data.statusHistory || [];
    this.timestamps = {
      createdAt: data.timestamps?.createdAt || new Date(),
      updatedAt: data.timestamps?.updatedAt || new Date(),
      confirmedAt: data.timestamps?.confirmedAt || null,
      processedAt: data.timestamps?.processedAt || null,
      shippedAt: data.timestamps?.shippedAt || null,
      deliveredAt: data.timestamps?.deliveredAt || null,
      cancelledAt: data.timestamps?.cancelledAt || null
    };

    // Additional metadata
    this.metadata = {
      source: data.metadata?.source || 'web',
      userAgent: data.metadata?.userAgent || null,
      ipAddress: data.metadata?.ipAddress || null,
      referrer: data.metadata?.referrer || null,
      notes: data.metadata?.notes || '',
      tags: data.metadata?.tags || []
    };

    // Analytics data
    this.analytics = {
      processingTime: data.analytics?.processingTime || null,
      deliveryTime: data.analytics?.deliveryTime || null,
      customerSatisfaction: data.analytics?.customerSatisfaction || null,
      returnRequested: data.analytics?.returnRequested || false
    };
  }

  /**
   * Generate unique order number
   */
  generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    return `ORD-${year}${month}${day}-${timestamp}${random}`;
  }

  /**
   * Update order status with timestamp tracking
   */
  updateStatus(newStatus, notes = '') {
    const previousStatus = this.status;
    this.status = newStatus;
    this.timestamps.updatedAt = new Date();

    // Set specific timestamps based on status
    switch (newStatus) {
      case OrderStatus.CONFIRMED:
        this.timestamps.confirmedAt = new Date();
        break;
      case OrderStatus.PROCESSING:
        this.timestamps.processedAt = new Date();
        break;
      case OrderStatus.SHIPPED:
        this.timestamps.shippedAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        this.timestamps.deliveredAt = new Date();
        break;
      case OrderStatus.CANCELLED:
        this.timestamps.cancelledAt = new Date();
        break;
    }

    // Add to status history
    this.statusHistory.push({
      from: previousStatus,
      to: newStatus,
      timestamp: new Date(),
      notes: notes,
      updatedBy: 'system' // This could be enhanced to track who made the change
    });

    return this;
  }

  /**
   * Update payment status
   */
  updatePaymentStatus(newStatus, transactionId = null) {
    this.payment.status = newStatus;
    this.timestamps.updatedAt = new Date();

    if (transactionId) {
      this.payment.transactionId = transactionId;
    }

    if (newStatus === PaymentStatus.PAID) {
      this.payment.paidAt = new Date();
    }

    return this;
  }

  /**
   * Add tracking number for shipping
   */
  addTrackingNumber(trackingNumber, carrier = null) {
    this.shipping.trackingNumber = trackingNumber;
    if (carrier) {
      this.shipping.carrier = carrier;
    }
    this.timestamps.updatedAt = new Date();
    return this;
  }

  /**
   * Calculate order totals
   */
  calculateTotals() {
    const subtotal = this.items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    this.breakdown.subtotal = subtotal;
    this.breakdown.total = subtotal + this.breakdown.shippingCost + this.breakdown.tax - this.breakdown.discount;
    this.totalAmount = this.breakdown.total;

    return this;
  }

  /**
   * Add item to order
   */
  addItem(item) {
    const existingItemIndex = this.items.findIndex(i => i.bookId === item.bookId);
    
    if (existingItemIndex >= 0) {
      this.items[existingItemIndex].quantity += item.quantity;
      this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].unitPrice * this.items[existingItemIndex].quantity;
    } else {
      this.items.push({
        bookId: item.bookId,
        bookTitle: item.bookTitle,
        bookImage: item.bookImage || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity,
        isbn: item.isbn || null,
        sku: item.sku || null
      });
    }

    this.calculateTotals();
    this.timestamps.updatedAt = new Date();
    return this;
  }

  /**
   * Remove item from order
   */
  removeItem(bookId) {
    this.items = this.items.filter(item => item.bookId !== bookId);
    this.calculateTotals();
    this.timestamps.updatedAt = new Date();
    return this;
  }

  /**
   * Get order summary for display
   */
  getSummary() {
    return {
      orderNumber: this.orderNumber,
      status: this.status,
      totalAmount: this.totalAmount,
      itemCount: this.items.length,
      customerName: this.customer.name,
      createdAt: this.timestamps.createdAt,
      estimatedDelivery: this.shipping.estimatedDelivery
    };
  }

  /**
   * Get status display text in Uzbek
   */
  getStatusText() {
    const statusTexts = {
      [OrderStatus.PENDING]: 'Kutilmoqda',
      [OrderStatus.CONFIRMED]: 'Tasdiqlangan',
      [OrderStatus.PROCESSING]: 'Jarayonda',
      [OrderStatus.SHIPPED]: 'Yuborilgan',
      [OrderStatus.DELIVERED]: 'Yetkazilgan',
      [OrderStatus.CANCELLED]: 'Bekor qilingan',
      [OrderStatus.REFUNDED]: 'Qaytarilgan'
    };
    return statusTexts[this.status] || 'Noma\'lum';
  }

  /**
   * Get payment status display text in Uzbek
   */
  getPaymentStatusText() {
    const statusTexts = {
      [PaymentStatus.PENDING]: 'Kutilmoqda',
      [PaymentStatus.PAID]: 'To\'langan',
      [PaymentStatus.FAILED]: 'Muvaffaqiyatsiz',
      [PaymentStatus.REFUNDED]: 'Qaytarilgan',
      [PaymentStatus.PARTIAL]: 'Qisman to\'langan'
    };
    return statusTexts[this.payment.status] || 'Noma\'lum';
  }

  /**
   * Check if order can be cancelled
   */
  canBeCancelled() {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.status);
  }

  /**
   * Check if order can be refunded
   */
  canBeRefunded() {
    return this.payment.status === PaymentStatus.PAID && 
           [OrderStatus.DELIVERED, OrderStatus.CANCELLED].includes(this.status);
  }

  /**
   * Convert to plain object for database storage
   */
  toObject() {
    return {
      id: this.id,
      orderNumber: this.orderNumber,
      userId: this.userId,
      items: this.items,
      totalAmount: this.totalAmount,
      status: this.status,
      customer: this.customer,
      payment: this.payment,
      shipping: this.shipping,
      breakdown: this.breakdown,
      notifications: this.notifications,
      statusHistory: this.statusHistory,
      timestamps: this.timestamps,
      metadata: this.metadata,
      analytics: this.analytics
    };
  }

  /**
   * Create OrderModel from database object
   */
  static fromObject(data) {
    return new OrderModel(data);
  }

  /**
   * Validate order data
   */
  validate() {
    const errors = [];

    if (!this.userId) {
      errors.push('User ID is required');
    }

    if (!this.items || this.items.length === 0) {
      errors.push('Order must have at least one item');
    }

    if (!this.customer.name) {
      errors.push('Customer name is required');
    }

    if (!this.customer.phone && !this.customer.email) {
      errors.push('Customer phone or email is required');
    }

    if (this.totalAmount <= 0) {
      errors.push('Total amount must be greater than 0');
    }

    // Validate items
    this.items.forEach((item, index) => {
      if (!item.bookId) {
        errors.push(`Item ${index + 1}: Book ID is required`);
      }
      if (!item.quantity || item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Quantity must be greater than 0`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        errors.push(`Item ${index + 1}: Unit price must be greater than 0`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default OrderModel;