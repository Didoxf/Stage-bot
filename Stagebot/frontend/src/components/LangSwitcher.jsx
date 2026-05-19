// src/components/LangSwitcher.jsx
import { useTranslation } from 'react-i18next';

export default function LangSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language;

  function change(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('pfe_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }

  // Set initial direction
  if (typeof document !== 'undefined') {
    document.documentElement.dir = current === 'ar' ? 'rtl' : 'ltr';
  }

  return (
    <div className="lang-switcher">
      {['fr', 'en', 'ar'].map(lang => (
        <button
          key={lang}
          className={`lang-btn ${current === lang ? 'lang-btn--active' : ''}`}
          onClick={() => change(lang)}
        >
          {lang === 'ar' ? 'ع' : lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
