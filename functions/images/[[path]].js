export async function onRequest({ request }) {
  const { pathname, search } = new URL(request.url);
  return fetch(`https://assets.sdcardsfinds.com${pathname}${search}`);
}
