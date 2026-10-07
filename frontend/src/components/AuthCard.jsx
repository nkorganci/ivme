import { APP_NAME } from '../config.js';

/** Giriş ve kayıt sayfalarının ortak kartı. */
export default function AuthCard({ title, children, footer }) {
  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <p className="auth-brand">{APP_NAME}</p>
        <h1>{title}</h1>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  );
}
