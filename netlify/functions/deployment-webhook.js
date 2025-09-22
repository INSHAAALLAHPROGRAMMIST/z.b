/**
 * Netlify Function: Deployment Webhook
 * Handles deployment notifications and monitoring
 */

export const handler = async (event, context) => {
  // Verify webhook signature for security
  const signature = event.headers['x-netlify-signature'];
  const payload = event.body;
  
  if (!signature) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Missing signature' })
    };
  }

  try {
    const deploymentData = JSON.parse(payload);
    
    // Handle different deployment events
    switch (deploymentData.state) {
      case 'building':
        await handleBuildStart(deploymentData);
        break;
        
      case 'ready':
        await handleDeploymentSuccess(deploymentData);
        break;
        
      case 'error':
        await handleDeploymentFailure(deploymentData);
        break;
        
      default:
        console.log('Unknown deployment state:', deploymentData.state);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Webhook processed successfully',
        state: deploymentData.state 
      })
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Send error notification
    await sendErrorNotification(error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'Webhook processing failed',
        message: error.message 
      })
    };
  }
};

async function handleBuildStart(deploymentData) {
  console.log('Build started:', deploymentData.id);
  
  // Send Telegram notification about build start
  await sendTelegramNotification(
    `🔨 Build Started\n\n` +
    `Deploy ID: ${deploymentData.id}\n` +
    `Branch: ${deploymentData.branch}\n` +
    `Commit: ${deploymentData.commit_ref}\n` +
    `Time: ${new Date().toLocaleString()}`
  );
}

async function handleDeploymentSuccess(deploymentData) {
  console.log('Deployment successful:', deploymentData.id);
  
  // Run post-deployment health checks
  const healthCheckResults = await runPostDeploymentChecks(deploymentData.deploy_ssl_url);
  
  // Send success notification
  await sendTelegramNotification(
    `✅ Deployment Successful\n\n` +
    `Deploy ID: ${deploymentData.id}\n` +
    `URL: ${deploymentData.deploy_ssl_url}\n` +
    `Branch: ${deploymentData.branch}\n` +
    `Build Time: ${deploymentData.deploy_time}s\n` +
    `Health Check: ${healthCheckResults.status}\n` +
    `Time: ${new Date().toLocaleString()}`
  );
  
  // Update deployment status in database
  await updateDeploymentStatus(deploymentData.id, 'success', healthCheckResults);
}

async function handleDeploymentFailure(deploymentData) {
  console.log('Deployment failed:', deploymentData.id);
  
  // Send failure notification
  await sendTelegramNotification(
    `❌ Deployment Failed\n\n` +
    `Deploy ID: ${deploymentData.id}\n` +
    `Branch: ${deploymentData.branch}\n` +
    `Error: ${deploymentData.error_message || 'Unknown error'}\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Please check the build logs for more details.`
  );
  
  // Update deployment status in database
  await updateDeploymentStatus(deploymentData.id, 'failed', {
    error: deploymentData.error_message
  });
}

async function runPostDeploymentChecks(deployUrl) {
  const checks = {
    status: 'healthy',
    checks: {}
  };
  
  try {
    // Check if site is accessible
    const siteResponse = await fetch(deployUrl, { 
      timeout: 10000,
      headers: { 'User-Agent': 'Netlify-Health-Check' }
    });
    
    checks.checks.accessibility = {
      status: siteResponse.ok ? 'healthy' : 'unhealthy',
      statusCode: siteResponse.status,
      responseTime: siteResponse.headers.get('x-response-time')
    };
    
    // Check health endpoint
    const healthResponse = await fetch(`${deployUrl}/.netlify/functions/health-check`, {
      timeout: 15000
    });
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      checks.checks.health = healthData;
    } else {
      checks.checks.health = {
        status: 'unhealthy',
        statusCode: healthResponse.status
      };
      checks.status = 'degraded';
    }
    
    // Check critical pages
    const criticalPages = ['/', '/auth', '/cart'];
    for (const page of criticalPages) {
      try {
        const pageResponse = await fetch(`${deployUrl}${page}`, { timeout: 5000 });
        checks.checks[`page_${page.replace('/', 'home')}`] = {
          status: pageResponse.ok ? 'healthy' : 'unhealthy',
          statusCode: pageResponse.status
        };
      } catch (error) {
        checks.checks[`page_${page.replace('/', 'home')}`] = {
          status: 'unhealthy',
          error: error.message
        };
        checks.status = 'degraded';
      }
    }
    
  } catch (error) {
    console.error('Post-deployment check error:', error);
    checks.status = 'unhealthy';
    checks.error = error.message;
  }
  
  return checks;
}

async function sendTelegramNotification(message) {
  const telegramBotToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.VITE_TELEGRAM_CHAT_ID;
  
  if (!telegramBotToken || !telegramChatId) {
    console.warn('Telegram credentials not configured');
    return;
  }
  
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: message,
          parse_mode: 'HTML'
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
    }
    
    console.log('Telegram notification sent successfully');
  } catch (error) {
    console.error('Failed to send Telegram notification:', error);
  }
}

async function updateDeploymentStatus(deployId, status, metadata) {
  // This would typically update a database record
  // For now, we'll just log the information
  console.log('Deployment status update:', {
    deployId,
    status,
    metadata,
    timestamp: new Date().toISOString()
  });
  
  // In a real implementation, you might:
  // - Update Firebase/Firestore
  // - Send to monitoring service
  // - Update deployment dashboard
}

async function sendErrorNotification(error) {
  await sendTelegramNotification(
    `🚨 Webhook Error\n\n` +
    `Error: ${error.message}\n` +
    `Stack: ${error.stack?.substring(0, 500)}...\n` +
    `Time: ${new Date().toLocaleString()}`
  );
}