// src/pages/Home.jsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EnsemLogo from '../components/EnsemLogo';
import LangSwitcher from '../components/LangSwitcher';
import './Home.css';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="home-root">
      {/* Navigation */}
      <nav className="home-nav">
        <div className="home-nav-logo">
          <EnsemLogo size={32} />
          <span className="home-nav-title">SFEI Assistant ENSEM</span>
        </div>
        <div className="home-nav-right">
          <LangSwitcher />
          <a href="/admin/login" className="home-nav-admin">{t('nav_admin')}</a>
        </div>
      </nav>

      {/* Hero */}
      <section className="home-hero">
        <div className="home-hero-bg" />
        <div className="home-hero-content">
          <p className="home-hero-label">{t('hero_subtitle')}</p>
          <h1 className="home-hero-title">{t('hero_title')}</h1>
          <p className="home-hero-desc">{t('hero_desc')}</p>
          <button className="home-hero-cta" onClick={() => navigate('/chat')}>
            {t('hero_cta')}
          </button>
        </div>
      </section>

      {/* Features */}
      <section className="home-features">
        <div className="home-feature">
          <div className="home-feature-icon">🕐</div>
          <h3 className="home-feature-title">{t('feat1_title')}</h3>
          <p className="home-feature-desc">{t('feat1_desc')}</p>
        </div>
        <div className="home-feature">
          <div className="home-feature-icon">🌍</div>
          <h3 className="home-feature-title">{t('feat2_title')}</h3>
          <p className="home-feature-desc">{t('feat2_desc')}</p>
        </div>
        <div className="home-feature">
          <div className="home-feature-icon">✅</div>
          <h3 className="home-feature-title">{t('feat3_title')}</h3>
          <p className="home-feature-desc">{t('feat3_desc')}</p>
        </div>
      </section>
    </div>
  );
}
