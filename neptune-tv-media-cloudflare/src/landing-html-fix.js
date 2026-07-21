export async function fixLandingAssetOrder(response) {
  let body = await response.text();

  body = body.replace(/<script[^>]+src="\/final-experience-v12\.js[^\"]*"[^>]*><\/script>/g, '');
  body = body.replace(/<script[^>]+src="\/problem-solution-v3\.js[^\"]*"[^>]*><\/script>/g, '');

  const scripts = '<script src="/final-experience-v12.js?v=7" defer></script><script src="/problem-solution-v3.js?v=7" defer></script>';
  body = body.replace('</body>', `${scripts}</body>`);

  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  headers.delete('Last-Modified');
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('Pragma', 'no-cache');

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
