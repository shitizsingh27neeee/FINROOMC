/**
 * Review Vault Manager
 * Organizes missed questions, spaced repetition flags, and targeted review sessions
 */

class ReviewVaultManager {
  constructor(progressManager, questionRepository) {
    this.progressManager = progressManager;
    this.questionRepository = questionRepository;
    this.activeFilter = 'all'; // 'all', 'unmastered', 'mastered', 'flagged', 'hard'
    this.searchQuery = '';
  }

  getVaultItems() {
    const progress = this.progressManager.getProgress();
    const vault = progress.reviewVault || [];
    const flaggedSet = new Set(progress.flaggedQuestions || []);
    const history = progress.questionHistory || {};

    return vault.map(item => {
      const q = this.questionRepository.getById(item.id);
      const qHistory = history[item.id] || { attempts: item.attempts || 1, wrong: 1, correct: 0 };
      return {
        id: item.id,
        addedAt: item.addedAt,
        attempts: qHistory.attempts || 1,
        wrongCount: qHistory.wrong || 1,
        correctCount: qHistory.correct || 0,
        mastered: !!item.mastered,
        lastReviewed: item.lastReviewed,
        isFlagged: flaggedSet.has(item.id),
        question: q || {
          id: item.id,
          question: item.questionSnippet || 'Question removed or unavailable',
          topic: item.topic || 'General',
          difficulty: item.difficulty || 'medium',
          company: item.company || 'Corporate'
        }
      };
    });
  }

  getFilteredItems() {
    let items = this.getVaultItems();

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      items = items.filter(item => {
        const text = item.question?.question?.toLowerCase() || '';
        const topic = item.question?.topic?.toLowerCase() || '';
        const company = item.question?.company?.toLowerCase() || '';
        return text.includes(q) || topic.includes(q) || company.includes(q);
      });
    }

    switch (this.activeFilter) {
      case 'unmastered':
        return items.filter(i => !i.mastered);
      case 'mastered':
        return items.filter(i => i.mastered);
      case 'flagged':
        return items.filter(i => i.isFlagged);
      case 'hard':
        return items.filter(i => i.question?.difficulty === 'hard' || i.wrongCount >= 2);
      default:
        return items;
    }
  }

  setFilter(filterName) {
    this.activeFilter = filterName;
  }

  setSearch(query) {
    this.searchQuery = query || '';
  }

  toggleMastered(questionId) {
    return this.progressManager.toggleVaultMastered(questionId);
  }

  removeItem(questionId) {
    this.progressManager.removeFromVault(questionId);
  }

  getWeakestQuestions(limit = 5) {
    const items = this.getVaultItems().filter(i => !i.mastered);
    items.sort((a, b) => b.wrongCount - a.wrongCount);
    return items.slice(0, limit);
  }
}

window.ReviewVaultManager = ReviewVaultManager;
