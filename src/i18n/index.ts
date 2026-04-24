import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';
import esES from './locales/es-ES.json';
import frFR from './locales/fr-FR.json';
import jaJP from './locales/ja-JP.json';
import deDE from './locales/de-DE.json';
import arSA from './locales/ar-SA.json';
import koKR from './locales/ko-KR.json';
import zhCN from './locales/zh-CN.json';
import itIT from './locales/it-IT.json';
import ruRU from './locales/ru-RU.json';
import idID from './locales/id-ID.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      'en-US': { translation: enUS },
      'es-ES': { translation: esES },
      'fr-FR': { translation: frFR },
      'ja-JP': { translation: jaJP },
      'de-DE': { translation: deDE },
      'ar-SA': { translation: arSA },
      'ko-KR': { translation: koKR },
      'zh-CN': { translation: zhCN },
      'it-IT': { translation: itIT },
      'ru-RU': { translation: ruRU },
      'id-ID': { translation: idID },
    },
    fallbackLng: {
      'de': ['de-DE'],
      'de-AT': ['de-DE'],
      'de-CH': ['de-DE'],
      'ja': ['ja-JP'],
      'ko': ['ko-KR'],
      'ko-KP': ['ko-KR'],
      'zh': ['zh-CN'],
      'zh-SG': ['zh-CN'],
      'zh-Hans': ['zh-CN'],
      'it': ['it-IT'],
      'it-CH': ['it-IT'],
      'it-SM': ['it-IT'],
      'ru': ['ru-RU'],
      'ru-BY': ['ru-RU'],
      'ru-KZ': ['ru-RU'],
      'ru-KG': ['ru-RU'],
      'ar': ['ar-SA'],
      'ar-EG': ['ar-SA'],
      'ar-MA': ['ar-SA'],
      'ar-DZ': ['ar-SA'],
      'ar-TN': ['ar-SA'],
      'ar-LB': ['ar-SA'],
      'ar-JO': ['ar-SA'],
      'ar-IQ': ['ar-SA'],
      'ar-KW': ['ar-SA'],
      'ar-AE': ['ar-SA'],
      'ar-QA': ['ar-SA'],
      'ar-BH': ['ar-SA'],
      'ar-OM': ['ar-SA'],
      'ar-YE': ['ar-SA'],
      'ar-SY': ['ar-SA'],
      'ar-LY': ['ar-SA'],
      'ar-SD': ['ar-SA'],
      'id': ['id-ID'],
      'default': ['fr-FR'],
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'timezoni-language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
