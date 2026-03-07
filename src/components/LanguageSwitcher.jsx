import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css';

const languages = [
  { code: 'zh-CN', label: 'EN' },
  { code: 'en-US', label: '中' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];
  const targetLanguage =
    languages.find((lang) => lang.code !== i18n.language) || languages[1];

  return (
    <button
      className="btn btn-secondary language-button"
      onClick={() => {
        changeLanguage(targetLanguage.code);
      }}
      title={i18n.language === 'zh-CN' ? 'Switch to English' : '切换到中文'}
    >
      {currentLanguage.label}
    </button>
  );
}
