// Paketlenmiş uygulama açıkken yeni bir sürüm yayımlanırsa sayfayı yenile.
// Vite geliştirme sunucusunda kaynak güncellemelerini HMR yönetir.
const assets = (root) => [...root.querySelectorAll('script[src*="/assets/"], link[rel="stylesheet"][href*="/assets/"]')]
  .map((element) => new URL(element.getAttribute(element.tagName === 'SCRIPT' ? 'src' : 'href'), location.href).pathname)
  .sort().join('|');

const current = assets(document);
if (current) {
  let checking = false;
  let version = null;
  const readVersion = async () => {
    const response = await fetch(`/app-version.txt?kontrol=${Date.now()}`, { cache: 'no-store' });
    return response.ok ? (await response.text()).trim() : null;
  };
  readVersion().then((value) => { version = value; }).catch(() => {});
  setInterval(async () => {
    if (checking || document.visibilityState === 'hidden') return;
    checking = true;
    try {
      const publishedVersion = await readVersion();
      if (version && publishedVersion && publishedVersion !== version) {
        location.reload();
        return;
      }
      if (!version) version = publishedVersion;
      const response = await fetch(`/?surum-kontrolu=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const html = await response.text();
      const documentCopy = new DOMParser().parseFromString(html, 'text/html');
      const published = assets(documentCopy);
      if (published && published !== current) location.reload();
    } catch { /* Geçici ağ hatasında bir sonraki deneme yapılır. */ }
    finally { checking = false; }
  }, 5000);
}
