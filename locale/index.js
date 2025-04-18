import en from './en.js';
import ko from './ko.js';

class LocalizationManager {
  constructor() {
    this.languages = {
      en,
      ko
    };
    
    // Default language
    this.currentLang = 'en';
    
    // Initialize with Overwolf language
    this.initializeWithOverwolfLanguage();
    
    // Listen for Overwolf language changes
    this.setupLanguageChangeListener();
  }
  
  initializeWithOverwolfLanguage() {
    overwolf.settings.language.get(result => {
      if (result.success) {
        // Convert the two-letter ISO code to our language format
        this.setLanguageFromOverwolf(result.language);
      } else {
        console.warn('Failed to get Overwolf language:', result.error);
      }
    });
  }
  
  setupLanguageChangeListener() {
    overwolf.settings.language.onLanguageChanged.addListener(event => {
      this.setLanguageFromOverwolf(event.language);
    });
  }
  
  // Convert Overwolf language code to our supported languages
  setLanguageFromOverwolf(languageCode) {
    // Convert Overwolf's language codes to our supported languages
    const langMap = {
      'ko': 'ko',  // Korean
      'en': 'en',  // English (and fallback for unsupported languages)
      // Add more mappings if needed
    };
    
    // Set to our language or fall back to English if not supported
    const langToUse = langMap[languageCode] || 'en';
    this.setLanguage(langToUse);
  }
  
  setLanguage(lang) {
    if (this.languages[lang]) {
      this.currentLang = lang;
      // Dispatch an event that the language changed
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: lang }));
      return true;
    }
    return false;
  }
  
  get(key, replacements = {}) {
    const text = this.languages[this.currentLang][key] || this.languages.en[key] || key;
    
    // Handle replacements like {battletag}
    return text.replace(/{(\w+)}/g, (match, key) => {
      return replacements[key] !== undefined ? replacements[key] : match;
    });
  }
  
  getCurrentLanguage() {
    return this.currentLang;
  }
  
  getAvailableLanguages() {
    return Object.keys(this.languages);
  }
}

// Create a singleton instance
const i18n = new LocalizationManager();
export default i18n;