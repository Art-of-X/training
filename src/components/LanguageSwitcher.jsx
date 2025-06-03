import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-hfbk-fg-secondary">
        Language / Sprache:
      </span>
      <button
        onClick={toggleLanguage}
        className="flex items-center space-x-2 px-3 py-1 border border-hfbk-primary text-hfbk-primary hover:bg-hfbk-primary hover:text-hfbk-bg-dark transition-colors"
      >
        <span className={language === 'en' ? 'font-bold' : ''}>EN</span>
        <span className="text-hfbk-fg-secondary">|</span>
        <span className={language === 'de' ? 'font-bold' : ''}>DE</span>
      </button>
    </div>
  );
};

export default LanguageSwitcher; 