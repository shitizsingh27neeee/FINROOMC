/**
 * Finance Escape Room - Global Configuration
 * From Campus to Corner Office
 */

const CONFIG = {
  APP_NAME: 'Finance Escape Room',
  APP_SUBTITLE: 'From Campus to Corner Office',
  STORAGE_KEYS: {
    PROGRESS: 'fer_user_progress_v1',
    CUSTOM_QUESTIONS: 'fer_custom_questions_v1',
    AI_KEY: 'fer_gemini_api_key',
    AI_ENABLED: 'fer_ai_enabled',
    ADMIN_PASS: 'fer_admin_password_hash',
    SETTINGS: 'fer_game_settings'
  },
  DEFAULT_ADMIN_PASS: 'finance123',
  POINTS: {
    easy: 50,
    medium: 100,
    hard: 150,
    FIRST_ATTEMPT_MULTIPLIER: 2.0,
    STREAK_5_MULTIPLIER: 1.5,
    HINT_COST: 5,
    ROOM_CLEAR_BONUS: 200
  },
  PASSING_ACCURACY_PERCENT: 80,
  AI: {
    DEFAULT_MODEL: 'gemini-3.8-flash',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 500,
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  INDIAN_CURRENCY: {
    formatCrores: (val) => `₹${Number(val).toLocaleString('en-IN')} Cr`,
    formatLakhs: (val) => `₹${Number(val).toLocaleString('en-IN')} Lakhs`
  }
};

// Export to window for vanilla JS compatibility
window.CONFIG = CONFIG;
