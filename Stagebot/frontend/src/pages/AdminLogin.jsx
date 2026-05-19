// src/pages/AdminLogin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LangSwitcher from '../components/LangSwitcher';
import { adminLogin, setAdminToken } from '../utils/api';
import './AdminLogin.css';

export default function AdminLogin() {
  const { t } = useTranslation();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      setAdminToken(data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="adminlogin-root">
      {/* Left — Form */}
      <div className="adminlogin-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" className="adminlogin-back">← {t('nav_back')}</a>
          <LangSwitcher />
        </div>

        <div className="adminlogin-form-wrap">
          <p className="adminlogin-label-top">ADMINISTRATION</p>
          <h1 className="adminlogin-title">{t('admin_login_title')}</h1>
          <p className="adminlogin-sub">{t('admin_login_sub')}</p>

          <form onSubmit={handleSubmit}>
            <div className="adminlogin-field">
              <label className="adminlogin-field-label">{t('admin_email')}</label>
              <input
                className="adminlogin-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@ensem.fr"
                required
              />
            </div>

            <div className="adminlogin-field">
              <label className="adminlogin-field-label">{t('admin_password')}</label>
              <input
                className="adminlogin-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && <div className="adminlogin-error">{error}</div>}

            <button className="adminlogin-btn" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : t('admin_submit')}
            </button>
          </form>
        </div>
      </div>

      {/* Right — Image */}
      <div className="adminlogin-right">
        <div className="adminlogin-right-bg" />
        <div className="adminlogin-right-overlay">
          <p className="adminlogin-right-label">PFE ASSISTANT ENSEM</p>
          <h2 className="adminlogin-right-title">{t('hero_title')}</h2>
        </div>
      </div>
    </div>
  );
}
