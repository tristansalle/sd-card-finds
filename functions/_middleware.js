export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/thumbs/')) {
    const targetUrl = 'https://assets.sdcardsfinds.com' + url.pathname + url.search;
    return fetch(new Request(targetUrl, request));
  }
  return next();
}
