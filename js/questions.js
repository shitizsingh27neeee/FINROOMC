/**
 * Question Repository & Shuffling Logic
 * Merges default JSON questions with CMS custom questions from LocalStorage
 */

class QuestionRepository {
  constructor() {
    this.storageKey = window.CONFIG?.STORAGE_KEYS?.CUSTOM_QUESTIONS || 'fer_custom_questions_v1';
    this.defaultQuestions = [];
    this.allQuestions = [];
    this.loaded = false;
  }

  async init() {
    try {
      const response = await fetch('/data/questions-default.json');
      if (response.ok) {
        this.defaultQuestions = await response.json();
      } else {
        console.warn('Could not load questions-default.json, using fallback repository');
        this.defaultQuestions = [];
      }
    } catch (e) {
      console.warn('Network error loading default questions, fallback to empty array', e);
      this.defaultQuestions = [];
    }

    this.refreshAll();
    this.loaded = true;
    return this.allQuestions;
  }

  getCustomQuestions() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to read custom questions from LocalStorage', e);
      return [];
    }
  }

  saveCustomQuestions(questions) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(questions));
      this.refreshAll();
      return true;
    } catch (e) {
      console.error('Failed to save custom questions', e);
      return false;
    }
  }

  refreshAll() {
    const custom = this.getCustomQuestions();
    // Default questions have custom: false
    const normalizedDefaults = (this.defaultQuestions || []).map(q => ({
      ...q,
      custom: false
    }));
    // Custom questions have custom: true
    const normalizedCustom = custom.map(q => ({
      ...q,
      custom: true
    }));

    // Build unified map by id, custom overrides if same id
    const map = new Map();
    normalizedDefaults.forEach(q => map.set(q.id, q));
    normalizedCustom.forEach(q => map.set(q.id, q));

    this.allQuestions = Array.from(map.values());
  }

  getAll() {
    if (!this.loaded) this.refreshAll();
    return this.allQuestions;
  }

  getById(id) {
    return this.getAll().find(q => q.id === id) || null;
  }

  getByRoom(roomId) {
    return this.getAll().filter(q => q.room === roomId && (q.metadata?.published !== false));
  }

  getByLevel(levelNumber) {
    return this.getAll().filter(q => Number(q.level) === Number(levelNumber) && (q.metadata?.published !== false));
  }

  getByTopic(topicName) {
    return this.getAll().filter(q => q.topic?.toLowerCase() === topicName?.toLowerCase());
  }

  /**
   * Fisher-Yates option shuffle
   * Returns a deep clone with shuffled options and updated correctAnswer index
   */
  shuffleQuestionOptions(originalQuestion) {
    if (!originalQuestion || !Array.isArray(originalQuestion.options)) return originalQuestion;

    const q = JSON.parse(JSON.stringify(originalQuestion));
    const originalCorrectText = q.options[q.correctAnswer];

    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    q.options = shuffled;
    q.correctAnswer = shuffled.indexOf(originalCorrectText);
    return q;
  }

  addOrUpdateCustomQuestion(questionData) {
    const custom = this.getCustomQuestions();
    const existingIndex = custom.findIndex(q => q.id === questionData.id);

    const fullQuestion = {
      ...questionData,
      custom: true,
      metadata: {
        createdAt: questionData.metadata?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: (questionData.metadata?.version || 1) + (existingIndex >= 0 ? 1 : 0),
        author: questionData.metadata?.author || 'admin',
        published: questionData.metadata?.published !== false
      }
    };

    if (existingIndex >= 0) {
      custom[existingIndex] = fullQuestion;
    } else {
      if (!fullQuestion.id) {
        fullQuestion.id = `q_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      }
      custom.push(fullQuestion);
    }

    this.saveCustomQuestions(custom);
    return fullQuestion;
  }

  deleteCustomQuestion(questionId) {
    const custom = this.getCustomQuestions().filter(q => q.id !== questionId);
    this.saveCustomQuestions(custom);
    return true;
  }

  bulkAddQuestions(newQuestions = []) {
    const custom = this.getCustomQuestions();
    const existingIds = new Set(custom.map(q => q.id));

    newQuestions.forEach(q => {
      const id = q.id || `q_import_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const item = {
        ...q,
        id,
        custom: true,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          author: 'import',
          published: q.published !== false
        }
      };
      if (existingIds.has(id)) {
        const idx = custom.findIndex(x => x.id === id);
        custom[idx] = item;
      } else {
        custom.push(item);
        existingIds.add(id);
      }
    });

    this.saveCustomQuestions(custom);
    return custom.length;
  }
}

window.QuestionRepository = QuestionRepository;
