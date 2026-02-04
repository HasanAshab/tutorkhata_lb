export default {
  async fetch(request) {
    const backends = [
      "https://api1.example.com",
      "https://api2.example.com",
      "https://api3.example.com",
    ];

    const url = new URL(request.url);
    const path = url.pathname + url.search;

    let lastError = null;

    // Try each backend in order
    for (const backend of backends) {
      try {
        const res = await fetch(backend + path, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });

        // Check health endpoint
        if (path === "/api/health") {
          const data = await res.json().catch(() => ({}));
          if (data.success === true) {
            return new Response(JSON.stringify({backend, success: true}), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } else {
            // Failed health
            lastError = `Health check failed at ${backend}`;
            continue; // try next backend
          }
        }

        // Normal request: just proxy
        if (res.ok) return res;

      } catch (err) {
        lastError = `Error connecting to ${backend}: ${err.message}`;
        continue;
      }
    }

    // All backends failed → send notification
    if (lastError) await notifyFailure(lastError);

    return new Response(
      JSON.stringify({success: false, message: "Service Unavailable." }),
      {status: 503, headers: {"Content-Type": "application/json"}}
    );
  },
};

// Simple notification function
async function notifyFailure(message) {
  const webhookUrl = "https://discord.com/api/webhooks/1468438730175156235/1pXTmTBfq_RmwsSC8wpT_NRUuhOoh6xkCZGmRdGQfbvIx1rGE4DdNmB7u07dkXd0VcG5";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `⚠️ Load Balancer Alert: ${message}` }),
  }).catch(console.error);
}
