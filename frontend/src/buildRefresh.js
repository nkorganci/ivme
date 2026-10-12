// Paketlenmiş uygulama açıkken yeni bir sürüm yayımlanırsa sayfayı yenile.
// Vite geliştirme sunucusunda kaynak güncellemelerini HMR yönetir.
const assets = () => [...document.querySelectorAll('script[type="module"][src*="/assets/"]')]
  .map((script) => new URL(script.src).pathname).sort().join('|');

const current = assets();
if (current) {
  let checking = false;
  setInterval(async () => {
    if (checking || document.visibilityState === 'hidden') return;
    checking = true;
    try {
      const response = await fetch(`/?surum-kontrolu=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return;
      const html = await response.text();
      const documentCopy = new DOMParser().parseFromString(html, 'text/html');
      const published = [...documentCopy.querySelectorAll('script[type="module"][src*="/assets/"]')]
        .map((script) => new URL(script.getAttribute('src'), location.href).pathname).sort().join('|');
      if (published && published !== current) location.reload();
    } catch { /* Geçici ağ hatasında bir sonraki deneme yapılır. */ }
    finally { checking = false; }
  }, 30000);
}
