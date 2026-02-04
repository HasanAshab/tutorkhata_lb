export default {
  async fetch(request) {
    const backends = [
      "https://api1.example.com",
      "https://api2.example.com",
      "https://api3.example.com",
    ];

    // Shuffle backends for random order health checking
    const shuffledBackends = [...backends].sort(() => Math.random() - 0.5);
    
    const url = new URL(request.url);
    
    // Find a healthy backend
    const healthyBackend = await findHealthyBackend(shuffledBackends);
    
    if (!healthyBackend) {
      await notifyFailure("All backends are down - service unavailable");
      return new Response("Service Unavailable", { status: 503 });
    }

    // Forward request to healthy backend
    return fetch(healthyBackend + url.pathname + url.search, request);
  }
};

// Health check function to find a working backend
async function findHealthyBackend(backends) {
  const failedBackends = [];
  
  for (const backend of backends) {
    try {
      const healthResponse = await fetch(`${backend}/api/health`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(5000)
      });

      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        if (healthData.success === true) {
          // If we found a healthy backend and had previous failures, notify about those
          if (failedBackends.length > 0) {
            for (const failure of failedBackends) {
              await notifyFailure(failure);
            }
          }
          return backend;
        } else {
          failedBackends.push(`Backend ${backend} health check failed - success: ${healthData.success}`);
        }
      } else {
        failedBackends.push(`Backend ${backend} health check failed - HTTP ${healthResponse.status}`);
      }
    } catch (error) {
      failedBackends.push(`Backend ${backend} health check error - ${error.message}`);
    }
  }
  
  // All backends failed - don't send individual alerts, just return null
  return null;
}

// Simple notification function
async function notifyFailure(message) {
  const webhookUrl = "https://discord.com/api/webhooks/1468438730175156235/1pXTmTBfq_RmwsSC8wpT_NRUuhOoh6xkCZGmRdGQfbvIx1rGE4DdNmB7u07dkXd0VcG5";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `⚠️ Load Balancer Alert: ${message}` }),
  }).catch(console.error);
}
