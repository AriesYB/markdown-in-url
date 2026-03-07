import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入翻译资源
import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';

const resources = {
  'zh-CN': {
    translation: zhCN,
  },
  'en-US': {
    translation: enUS,
  },
};

i18n
  .use(LanguageDetector) // 自动检测用户语言
  .use(initReactI18next) // 绑定 react-i18next
  .init({
    resources,
    fallbackLng: 'zh-CN', // 默认语言
    debug: false,

    interpolation: {
      escapeValue: false, // React 已经做了 XSS 防护
    },

    detection: {
      // 语言检测顺序：优先浏览器语言，其次用户之前的选择
      order: ['navigator', 'localStorage'],
      // 缓存用户语言选择
      caches: ['localStorage'],
      // localStorage 键名
      lookupLocalStorage: 'i18nextLng',
      // 浏览器语言到项目语言的映射
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupSessionStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      checkWhitelist: true,
    },
  });

export default i18n;
