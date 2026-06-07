export async function onRequest({ request, params }) {
  const path = params.path ? params.path.join('/') : '';
  const url = new URL(request.url);
  const targetUrl = `https://assets.sdcardsfinds.com/images/${path}${url.search}`;
  return fetch(targetUrl);
}
