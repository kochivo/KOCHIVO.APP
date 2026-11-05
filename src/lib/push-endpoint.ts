const PUSH_ENDPOINT = /^https:\/\/(?:fcm\.googleapis\.com|(?:[a-z0-9-]+\.)+push\.apple\.com|updates\.push\.services\.mozilla\.com|push\.services\.mozilla\.com|(?:[a-z0-9-]+\.)+notify\.windows\.com)\/[^\s#\\]*$/;

export function allowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return endpoint.length <= 1000 && PUSH_ENDPOINT.test(endpoint)
      && url.protocol === 'https:' && !url.username && !url.password && !url.port
      && !url.hash;
  } catch { return false; }
}
