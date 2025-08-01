// Rate limiting utility for order submissions
class OrderRateLimiter {
    constructor(cooldownMs = 15000) { // 15 soniya default
        this.cooldownMs = cooldownMs;
        this.lastOrderTime = 0;
    }

    canMakeOrder() {
        const now = Date.now();
        const timeSinceLastOrder = now - this.lastOrderTime;

        if (timeSinceLastOrder < this.cooldownMs) {
            const remainingTime = Math.ceil((this.cooldownMs - timeSinceLastOrder) / 1000);
            return {
                allowed: false,
                remainingTime,
                message: `Iltimos, yana ${remainingTime} soniya kuting`
            };
        }

        return { allowed: true };
    }

    recordOrder() {
        this.lastOrderTime = Date.now();
    }

    getRemainingTime() {
        const now = Date.now();
        const timeSinceLastOrder = now - this.lastOrderTime;
        
        if (timeSinceLastOrder >= this.cooldownMs) {
            return 0;
        }
        
        return Math.ceil((this.cooldownMs - timeSinceLastOrder) / 1000);
    }
}

// Global instance - har bir user uchun alohida bo'lishi kerak
const orderRateLimiters = new Map();

export const getOrderRateLimiter = (userId) => {
    if (!orderRateLimiters.has(userId)) {
        orderRateLimiters.set(userId, new OrderRateLimiter());
    }
    return orderRateLimiters.get(userId);
};

export default OrderRateLimiter;