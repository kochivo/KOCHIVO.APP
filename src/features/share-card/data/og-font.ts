import 'server-only';

export async function ogFont() {
  // A fixed, cached font request keeps coach names out of requests to Google.
  const css = await fetch('https://fonts.googleapis.com/css2?family=Changa:wght@700',
    { next: { revalidate: 86400 } });
  if (!css.ok) throw new Error('OG font stylesheet unavailable');
  const url = (await css.text()).match(/src:\s*url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/)?.[1];
  if (!url) throw new Error('OG font URL unavailable');
  const response = await fetch(url, { next: { revalidate: 86400 } });
  if (!response.ok) throw new Error('OG font unavailable');
  return response.arrayBuffer();
}
