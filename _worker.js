export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/thumbs/')) {
      const assetUrl = 'https://assets.sdcardsfinds.com' + url.pathname;
      const response = await fetch(assetUrl);
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      });
    }

    return env.ASSETS.fetch(request);
  }
};
