export async function downloadImage(url) {
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(`Failed to download image: HTTP ${response.status}`);

  return {
    data: Buffer.from(await response.arrayBuffer()),
    mime: response.headers.get("content-type"),
  };
}
