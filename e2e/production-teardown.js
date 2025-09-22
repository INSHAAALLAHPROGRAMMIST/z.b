async function globalTeardown() {
  console.log('🧹 Starting production E2E test cleanup...');
  
  try {
    // Log test completion
    console.log('📊 Production E2E tests completed');
    
    // Clean up any test artifacts
    console.log('🗑️ Cleaning up test artifacts...');
    
    // Send test completion notification if configured
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      await sendTestCompletionNotification();
    }
    
    console.log('✅ Production E2E test cleanup completed');
    
  } catch (error) {
    console.error('❌ Production E2E test cleanup failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function sendTestCompletionNotification() {
  try {
    const message = `🧪 Production E2E Tests Completed\n\n` +
                   `Environment: Production\n` +
                   `Time: ${new Date().toLocaleString()}\n` +
                   `Status: Tests finished`;
    
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: message
        })
      }
    );
    
    if (response.ok) {
      console.log('📱 Test completion notification sent');
    }
  } catch (error) {
    console.log('⚠️ Failed to send test completion notification:', error.message);
  }
}

export default globalTeardown;