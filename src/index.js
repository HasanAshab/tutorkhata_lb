export default {
  async fetch(request) {
    const backends = [
      "https://api1.example.com",
      "https://api2.example.com",
      "https://api3.example.com",
    ];

    const index = Math.floor(Math.random() * backends.length);
    const url = new URL(request.url);

    return fetch(backends[index] + url.pathname + url.search, request);
  }
};
