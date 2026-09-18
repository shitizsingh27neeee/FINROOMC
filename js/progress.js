/**
 * Progress & LocalStorage Management
 * Tracks levels, rooms, question attempts, achievements, and review vault
 */

class ProgressManager {
  constructor() {
    this.storageKey = window.CONFIG?.STORAGE_KEYS?.PROGRESS || 'fer_user_progress_v1';
    this.init();
  }

  getDefaultProgress() {
    return {
      currentLevel: 1,
      currentRoom: "1.1",
      completedRooms: [],
      totalScore: 0,
      streak: 0,
      longestStreak: 0,
      hintsUsedTotal: 0,
      lastPlayed: new Date().toISOString(),
      questionHistory: {},
      topicStats: {},
      achievements: [],
      reviewVault: [],
      flaggedQuestions: []
    };
  }

  init() {
    try {
      const existing = localStorage.getItem(this.storageKey);
      if (!existing) {
        this.save(this.getDefaultProgress());
      }
    } catch (e) {
      console.warn('LocalStorage unavailable, running in memory mode', e);
      this._memProgress = this.getDefaultProgress();
    }
  }

  getProgress() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...this.getDefaultProgress(), ...parsed };
      }
    } catch (e) {
      console.error('Failed to parse progress from LocalStorage', e);
    }
    return this._memProgress || this.getDefaultProgress();
  }

  save(progress) {
    progress.lastPlayed = new Date().toISOString();
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(progress));
    } catch (e) {
      console.warn('Could not save progress to LocalStorage', e);
      this._memProgress = progress;
    }
    return progress;
  }

  reset() {
    const fresh = this.getDefaultProgress();
    this.save(fresh);
    return fresh;
  }

  recordAttempt(questionId, isCorrect, timeSpent = 0, topic = 'General', questionData = null) {
    const progress = this.getProgress();
    if (!progress.questionHistory[questionId]) {
      progress.questionHistory[questionId] = {
        attempts: 0,
        correct: 0,
        wrong: 0,
        totalTime: 0,
        firstAttemptCorrect: false,
        lastAttemptDate: null
      };
    }

    const history = progress.questionHistory[questionId];
    history.attempts++;
    history.totalTime += timeSpent;
    history.lastAttemptDate = new Date().toISOString();

    if (isCorrect) {
      history.correct++;
      if (history.attempts === 1) {
        history.firstAttemptCorrect = true;
      }
      progress.streak = (progress.streak || 0) + 1;
      if (progress.streak > (progress.longestStreak || 0)) {
        progress.longestStreak = progress.streak;
      }
    } else {
      history.wrong++;
      progress.streak = 0;

      // Add to review vault if not already in vault
      this.addToVaultInternal(progress, questionId, questionData);
    }

    // Update Topic Stats
    if (topic) {
      if (!progress.topicStats[topic]) {
        progress.topicStats[topic] = { total: 0, correct: 0, accuracy: 0 };
      }
      progress.topicStats[topic].total++;
      if (isCorrect) progress.topicStats[topic].correct++;
      progress.topicStats[topic].accuracy = Math.round(
        (progress.topicStats[topic].correct / progress.topicStats[topic].total) * 100
      );
    }

    this.save(progress);
    return progress;
  }

  addPoints(amount) {
    const progress = this.getProgress();
    progress.totalScore = Math.max(0, (progress.totalScore || 0) + amount);
    this.save(progress);
    return progress.totalScore;
  }

  deductPoints(amount) {
    return this.addPoints(-Math.abs(amount));
  }

  addToVaultInternal(progress, questionId, questionData) {
    if (!progress.reviewVault) progress.reviewVault = [];
    const existing = progress.reviewVault.find(item => item.id === questionId);
    if (existing) {
      existing.attempts = (existing.attempts || 0) + 1;
      existing.lastReviewed = new Date().toISOString();
      existing.mastered = false;
    } else {
      progress.reviewVault.push({
        id: questionId,
        addedAt: new Date().toISOString(),
        attempts: 1,
        mastered: false,
        lastReviewed: new Date().toISOString(),
        questionSnippet: questionData?.question || '',
        topic: questionData?.topic || '',
        difficulty: questionData?.difficulty || 'medium',
        company: questionData?.company || ''
      });
    }
  }

  toggleVaultMastered(questionId) {
    const progress = this.getProgress();
    const item = progress.reviewVault?.find(v => v.id === questionId);
    if (item) {
      item.mastered = !item.mastered;
      item.lastReviewed = new Date().toISOString();
      this.save(progress);
      return item.mastered;
    }
    return false;
  }

  removeFromVault(questionId) {
    const progress = this.getProgress();
    if (progress.reviewVault) {
      progress.reviewVault = progress.reviewVault.filter(v => v.id !== questionId);
      this.save(progress);
    }
  }

  toggleFlagQuestion(questionId) {
    const progress = this.getProgress();
    if (!progress.flaggedQuestions) progress.flaggedQuestions = [];
    const idx = progress.flaggedQuestions.indexOf(questionId);
    let flagged = false;
    if (idx >= 0) {
      progress.flaggedQuestions.splice(idx, 1);
    } else {
      progress.flaggedQuestions.push(questionId);
      flagged = true;
    }
    this.save(progress);
    return flagged;
  }

  isQuestionFlagged(questionId) {
    const progress = this.getProgress();
    return progress.flaggedQuestions?.includes(questionId) || false;
  }

  completeRoom(roomId, accuracyPercent, scoreEarned = 0) {
    const progress = this.getProgress();
    if (!progress.completedRooms) progress.completedRooms = [];
    if (!progress.completedRooms.includes(roomId)) {
      progress.completedRooms.push(roomId);
    }
    this.addPoints(scoreEarned);

    // Calculate next room to unlock
    const nextRoomId = this.getNextRoomId(roomId);
    if (nextRoomId) {
      progress.currentRoom = nextRoomId;
      const nextLevel = parseInt(nextRoomId.split('.')[0], 10);
      if (nextLevel > progress.currentLevel) {
        progress.currentLevel = nextLevel;
      }
    }
    this.save(progress);
    return { progress, nextRoomId };
  }

  isRoomCompleted(roomId) {
    const progress = this.getProgress();
    return progress.completedRooms?.includes(roomId) || false;
  }

  isRoomUnlocked(roomId, unlockReq) {
    if (!unlockReq) return true; // first room of level 1 is open
    const progress = this.getProgress();
    return progress.completedRooms?.includes(unlockReq) || false;
  }

  getNextRoomId(currentRoomId) {
    const [lvlStr, rmStr] = currentRoomId.split('.');
    const lvl = parseInt(lvlStr, 10);
    const rm = parseInt(rmStr, 10);

    if (rm < 3) {
      return `${lvl}.${rm + 1}`;
    } else if (lvl < 5) {
      return `${lvl + 1}.1`;
    }
    return null; // Finished entire game!
  }

  checkAchievements(achievementsList = [], onUnlockCallback = null) {
    const progress = this.getProgress();
    const unlockedNow = [];

    achievementsList.forEach(ach => {
      const alreadyUnlocked = progress.achievements?.some(a => a.id === ach.id);
      if (alreadyUnlocked) return;

      let qualified = false;
      const history = Object.values(progress.questionHistory || {});
      const totalCorrect = history.reduce((sum, q) => sum + (q.correct || 0), 0);
      const totalScore = progress.totalScore || 0;
      const streak = progress.streak || 0;
      const completedRooms = progress.completedRooms || [];
      const masteredCount = progress.reviewVault?.filter(v => v.mastered)?.length || 0;

      switch (ach.id) {
        case 'first_correct':
          qualified = totalCorrect >= 1;
          break;
        case 'streak_3':
          qualified = streak >= 3;
          break;
        case 'streak_5':
          qualified = streak >= 5;
          break;
        case 'streak_10':
          qualified = streak >= 10;
          break;
        case 'room_1_1_complete':
          qualified = completedRooms.includes('1.1');
          break;
        case 'level_1_complete':
          qualified = ['1.1', '1.2', '1.3'].every(r => completedRooms.includes(r));
          break;
        case 'vault_master':
          qualified = masteredCount >= 3;
          break;
        case 'score_1000':
          qualified = totalScore >= 1000;
          break;
        case 'score_5000':
          qualified = totalScore >= 5000;
          break;
      }

      if (qualified) {
        progress.achievements.push({
          id: ach.id,
          title: ach.title,
          unlockedAt: new Date().toISOString()
        });
        unlockedNow.push(ach);
        if (typeof onUnlockCallback === 'function') {
          onUnlockCallback(ach);
        }
      }
    });

    if (unlockedNow.length > 0) {
      this.save(progress);
    }
    return unlockedNow;
  }
}

window.ProgressManager = ProgressManager;
