export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/thumbs/')) {
    return fetch('https://assets.sdcardsfinds.com' + url.pathname);
  }
  return next();
}
