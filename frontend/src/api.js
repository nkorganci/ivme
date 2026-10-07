// fetch sarmalayıcı: JSON, CSRF başlığı, ApiError ve 204 desteği.

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields || {};
  }
}

let onUnauthorized = null;
/** Oturum düştüğünde (401) çağrılacak işlevi kaydeder. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function readCookie(name) {
  const hit = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

const DEFAULT_MESSAGES = {
  400: 'Gönderilen bilgiler geçersiz.',
  401: 'Oturumun sona erdi. Lütfen yeniden giriş yap.',
  403: 'Bu işlem için yetkin yok.',
  404: 'İstenen kayıt bulunamadı.',
  409: 'İşlem mevcut durumla çakışıyor.',
};

async function request(method, path, body) {
  const headers = { Accept: 'application/json' };
  const init = { method, credentials: 'same-origin', headers };

  if (method !== 'GET') {
    // Çerez henüz yoksa (ilk istek) sunucudan almak için hafif bir GET at.
    if (!readCookie('XSRF-TOKEN')) {
      await fetch('/api/auth/me', { credentials: 'same-origin' }).catch(() => {});
    }
    const token = readCookie('XSRF-TOKEN');
    if (token) headers['X-XSRF-TOKEN'] = token;
  }
  if (body instanceof FormData) {
    init.body = body; // Content-Type'ı tarayıcı sınır değeriyle birlikte kendisi koyar
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError(0, 'Sunucuya ulaşılamadı. Bağlantını kontrol edip tekrar dene.');
  }
  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    if (res.status === 401 && onUnauthorized && !path.startsWith('/api/auth/')) {
      // Oturum gerçekten düştüyse (me de 401 dönüyorsa) kullanıcıyı çıkış durumuna al.
      fetch('/api/auth/me', { credentials: 'same-origin' })
        .then((r) => r.status === 401 && onUnauthorized())
        .catch(() => {});
    }
    const message = data?.hata || DEFAULT_MESSAGES[res.status] || 'Beklenmeyen bir hata oluştu.';
    throw new ApiError(res.status, message, data?.alanlar);
  }
  return data;
}

/** Boş değerleri atlayarak sorgu dizesi üretir: {a:1,b:''} -> "?a=1" */
export function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') sp.set(k, v);
  });
  const s = sp.toString();
  return s ? '?' + s : '';
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body ?? {}),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  upload: (path, formData) => request('POST', path, formData),
};

export const imageUrl = (id, version) => `/api/questions/${id}/image${version ? '?v=' + encodeURIComponent(version) : ''}`;
export const qrUrl = (id, size = 200) => `/api/questions/${id}/qr?size=${size}`;
