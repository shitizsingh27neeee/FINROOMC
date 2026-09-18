/**
 * Statistics & Analytics Engine
 * Aggregates accuracy, topic strengths/weaknesses, streaks, and recommendations
 */

class StatsEngine {
  constructor(progressManager, questionRepository) {
    this.progressManager = progressManager;
    this.questionRepository = questionRepository;
  }

  getOverallSummary() {
    const progress = this.progressManager.getProgress();
    const history = Object.values(progress.questionHistory || {});

    const totalAttempts = history.reduce((sum, item) => sum + (item.attempts || 0), 0);
    const totalCorrect = history.reduce((sum, item) => sum + (item.correct || 0), 0);
    const totalWrong = history.reduce((sum, item) => sum + (item.wrong || 0), 0);
    const uniqueQuestionsAnswered = history.length;
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
    const firstAttemptCorrectCount = history.filter(item => item.firstAttemptCorrect).length;
    const firstAttemptAccuracy = uniqueQuestionsAnswered > 0 
      ? Math.round((firstAttemptCorrectCount / uniqueQuestionsAnswered) * 100) 
      : 0;

    return {
      totalAttempts,
      totalCorrect,
      totalWrong,
      uniqueQuestionsAnswered,
      accuracy,
      firstAttemptAccuracy,
      totalScore: progress.totalScore || 0,
      streak: progress.streak || 0,
      longestStreak: progress.longestStreak || 0,
      completedRoomsCount: progress.completedRooms?.length || 0,
      achievementsCount: progress.achievements?.length || 0,
      vaultCount: progress.reviewVault?.length || 0
    };
  }

  getTopicBreakdown() {
    const progress = this.progressManager.getProgress();
    const topicStats = progress.topicStats || {};
    const topics = [];

    Object.entries(topicStats).forEach(([topic, data]) => {
      if (data.total > 0) {
        topics.push({
          topic,
          total: data.total,
          correct: data.correct,
          accuracy: Math.round((data.correct / data.total) * 100)
        });
      }
    });

    topics.sort((a, b) => b.accuracy - a.accuracy);

    const strongAreas = topics.filter(t => t.accuracy >= 75 && t.total >= 2);
    const needPractice = topics.filter(t => t.accuracy < 75 || (t.total >= 1 && t.accuracy < 60));

    return {
      allTopics: topics,
      strongAreas,
      needPractice
    };
  }

  getLevelProgression(roomConfigLevels = []) {
    const progress = this.progressManager.getProgress();
    const completedRooms = new Set(progress.completedRooms || []);

    return roomConfigLevels.map(level => {
      const totalRooms = level.rooms.length;
      const finishedInLevel = level.rooms.filter(r => completedRooms.has(r.id)).length;
      const percent = totalRooms > 0 ? Math.round((finishedInLevel / totalRooms) * 100) : 0;
      return {
        levelId: level.id,
        name: level.name,
        subtitle: level.subtitle,
        totalRooms,
        finishedInLevel,
        percent,
        isCompleted: finishedInLevel === totalRooms
      };
    });
  }

  getRecommendations() {
    const { needPractice } = this.getTopicBreakdown();
    const progress = this.progressManager.getProgress();
    const recommendations = [];

    if (needPractice.length > 0) {
      needPractice.slice(0, 3).forEach(item => {
        recommendations.push({
          type: 'topic',
          title: `Sharpen: ${item.topic}`,
          description: `Current accuracy is ${item.accuracy}% across ${item.total} attempts. Review key formulas and retry vault questions.`,
          action: 'vault',
          filter: item.topic
        });
      });
    }

    const unmasteredVaultCount = (progress.reviewVault || []).filter(v => !v.mastered).length;
    if (unmasteredVaultCount > 0) {
      recommendations.push({
        type: 'vault',
        title: `Clear Review Vault (${unmasteredVaultCount} pending)`,
        description: 'You have questions in your Review Vault waiting for mastery. Practicing missed questions builds long-term intuition.',
        action: 'vault'
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'explore',
        title: 'Ready for Next Level',
        description: 'Your fundamental metrics look solid! Advance to the next room or challenge higher difficulty rounds.',
        action: 'map'
      });
    }

    return recommendations;
  }
}

window.StatsEngine = StatsEngine;
