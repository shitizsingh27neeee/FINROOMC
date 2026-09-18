/**
 * Google AI Studio (Gemini) Integration Handler
 * Supports both server-side proxy (/api/gemini) and direct client-side API calls
 * With graceful fallbacks, caching, and customized Indian finance prompt engineering
 */

class AIHandler {
  constructor() {
    this.storageKeyKey = window.CONFIG?.STORAGE_KEYS?.AI_KEY || 'fer_gemini_api_key';
    this.storageEnabledKey = window.CONFIG?.STORAGE_KEYS?.AI_ENABLED || 'fer_ai_enabled';
    this.cache = new Map();
  }

  getApiKey() {
    try {
      return localStorage.getItem(this.storageKeyKey) || '';
    } catch (e) {
      return '';
    }
  }

  setApiKey(key) {
    try {
      localStorage.setItem(this.storageKeyKey, key.trim());
      return true;
    } catch (e) {
      return false;
    }
  }

  isAiEnabled() {
    try {
      const stored = localStorage.getItem(this.storageEnabledKey);
      return stored !== 'false'; // Enabled by default
    } catch (e) {
      return true;
    }
  }

  setAiEnabled(enabled) {
    try {
      localStorage.setItem(this.storageEnabledKey, enabled ? 'true' : 'false');
    } catch (e) {
      console.warn(e);
    }
  }

  async generate(prompt, temperature = 0.7) {
    if (!this.isAiEnabled()) return null;

    // Check memory cache
    const cacheKey = `${prompt}_${temperature}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. Try server-side API proxy first (/api/gemini)
    try {
      const serverRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, temperature })
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data && data.text) {
          this.cache.set(cacheKey, data.text);
          return data.text;
        }
      }
    } catch (err) {
      // Server-side route not available or running statically; continue to client fallback
    }

    // 2. Client-side fallback if user provided API key in settings
    const clientKey = this.getApiKey();
    if (!clientKey) {
      return null;
    }

    try {
      const model = window.CONFIG?.AI?.DEFAULT_MODEL || 'gemini-3.8-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${clientKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: 500
          }
        })
      });

      if (!response.ok) {
        console.warn(`Gemini client API returned HTTP ${response.status}`);
        return null;
      }

      const resData = await response.json();
      const generated = resData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      if (generated) {
        this.cache.set(cacheKey, generated);
      }
      return generated;
    } catch (clientErr) {
      console.warn('Direct Gemini API call failed:', clientErr);
      return null;
    }
  }

  /**
   * 1. Personalized Wrong Answer Explanation
   */
  async getPersonalizedWrongExplanation(question, selectedIndex, topicAccuracy = 50) {
    const wrongOption = question.options[selectedIndex] || 'Your selection';
    const correctOption = question.options[question.correctAnswer] || 'Correct answer';

    const prompt = `You are an elite Indian finance interview mentor (ex-Goldman Sachs / McKinsey) coaching an MBA student for an Investment Banking or Private Equity interview.

Context:
- Question: "${question.question}"
- Topic: ${question.topic}
- Student's Selected Answer (INCORRECT): "${wrongOption}"
- True Correct Answer: "${correctOption}"
- Student's topic accuracy history: ${topicAccuracy}%

Task:
1. Explain specifically why choosing "${wrongOption}" is a conceptual or mathematical mistake (1-2 crisp sentences).
2. Provide an intuitive analogy using Indian corporate context (e.g. Reliance, Tata, HDFC, Kirana store, UPI, or NSE).
3. Provide one sharp Dalal Street interview tip or framework to never miss this in an interview.

Keep under 140 words. Tone: sharp, encouraging, professional mentor. Format with clean line breaks.`;

    const result = await this.generate(prompt, 0.7);
    return result;
  }

  /**
   * 2. Progressive Hint Generation (3 levels)
   */
  async getProgressiveHint(question, hintLevel = 1) {
    let prompt = '';
    if (hintLevel === 1) {
      prompt = `For this finance interview question: "${question.question}" (Topic: ${question.topic}).
Provide a gentle conceptual hint indicating which accounting framework or financial principle applies.
DO NOT eliminate any options or reveal the final answer.
Keep under 45 words.`;
    } else if (hintLevel === 2) {
      prompt = `For this finance question: "${question.question}"
Options: ${question.options.map((opt, i) => `(${i + 1}) ${opt}`).join(', ')}
Identify 2 clearly incorrect options from the list and give a brief one-sentence reason why each cannot be the answer.
DO NOT disclose the remaining correct answer explicitly.
Keep under 65 words.`;
    } else {
      prompt = `For this finance calculation question: "${question.question}"
State the exact formula needed, substitute the first given variable step-by-step, but leave the final arithmetic calculation for the student to complete.
Keep under 80 words.`;
    }

    const result = await this.generate(prompt, 0.6);
    return result;
  }

  /**
   * 3. Similar Question Generation
   */
  async generateSimilarQuestion(originalQuestion) {
    const prompt = `You are a finance interview question author for top Indian business schools (IIM, ISB, FMS).
Generate a new high-quality finance multiple-choice interview question following this benchmark:

Original Question: "${originalQuestion.question}"
Topic: ${originalQuestion.topic}
Difficulty: ${originalQuestion.difficulty}
Sector: ${originalQuestion.sector || 'Corporate'}
Correct Answer Concept: ${originalQuestion.options[originalQuestion.correctAnswer]}

Strict Requirements:
1. Test the EXACT same financial concept or ratio.
2. Use a DIFFERENT well-known Indian company from the same sector (e.g. if Reliance, use Tata or Adani; if TCS, use Infosys or Wipro; if HDFC, use ICICI or SBI).
3. Change all numerical values but keep them realistic in Indian ₹ Crore / Lakh magnitude.
4. Output MUST be strictly valid JSON without markdown wrapping or backticks.

JSON format:
{
  "question": "question text",
  "options": ["option 1", "option 2", "option 3", "option 4"],
  "correctAnswer": 0,
  "explanation": "2-3 sentences explaining the formula and correct answer",
  "example": "Indian company context data",
  "interviewTip": "1-2 practical interview tips",
  "company": "Company Name",
  "topic": "${originalQuestion.topic}"
}`;

    const raw = await this.generate(prompt, 0.8);
    if (!raw) return null;

    try {
      const cleanJson = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.question && Array.isArray(parsed.options) && typeof parsed.correctAnswer === 'number') {
        return {
          ...parsed,
          id: `q_ai_${Date.now()}`,
          level: originalQuestion.level,
          room: originalQuestion.room,
          difficulty: originalQuestion.difficulty,
          type: 'multiple_choice',
          aiGenerated: true
        };
      }
    } catch (e) {
      console.warn('Failed to parse AI generated question JSON', e);
    }
    return null;
  }

  /**
   * 4. Interview Tip Generator
   */
  async generateInterviewTip(topic, questionText) {
    const prompt = `Provide an authoritative interview tip for an MBA candidate targeting top-tier Investment Banking or Private Equity in India.
Topic: ${topic}
Concept: ${questionText}

Format:
1. Common Follow-up Question
2. 3-step Answer Framework
3. Pitfall to Avoid

Max 120 words.`;

    return await this.generate(prompt, 0.7);
  }
}

window.AIHandler = AIHandler;
