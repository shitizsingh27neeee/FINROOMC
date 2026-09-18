/**
 * Core Game Engine Controller
 * Handles gameplay loop, room navigation, answer evaluation, hints, modals, and achievements
 */

class GameEngine {
  constructor() {
    this.progressManager = new window.ProgressManager();
    this.questionRepo = new window.QuestionRepository();
    this.statsEngine = new window.StatsEngine(this.progressManager, this.questionRepo);
    this.vaultManager = new window.ReviewVaultManager(this.progressManager, this.questionRepo);
    this.aiHandler = new window.AIHandler();

    this.roomConfigs = null;
    this.achievementsList = [];

    // Active session state
    this.currentLevelId = 1;
    this.currentRoomId = '1.1';
    this.currentRoomQuestions = [];
    this.currentQuestionIndex = 0;
    this.currentQuestion = null; // Shuffled active question
    this.selectedOptionIndex = null;
    this.isAnswerSubmitted = false;
    this.questionStartTime = Date.now();
    this.roomCorrectCount = 0;
    this.roomScoreEarned = 0;
    this.currentQuestionHintsUsed = 0;
    this.roomHintsUsedCount = 0;
    this.isBonusPractice = false;
  }

  async init() {
    // 1. Load room configurations
    try {
      const rRes = await fetch('/data/rooms-config.json');
      if (rRes.ok) this.roomConfigs = await rRes.json();
    } catch (e) {
      console.warn('Failed to load rooms-config.json', e);
    }

    // 2. Load achievements definition
    try {
      const aRes = await fetch('/data/achievements.json');
      if (aRes.ok) this.achievementsList = await aRes.json();
    } catch (e) {
      console.warn('Failed to load achievements.json', e);
    }

    // 3. Initialize questions repository
    await this.questionRepo.init();

    // 4. Align current level and room with user progress
    const progress = this.progressManager.getProgress();
    if (progress.currentRoom) {
      this.currentRoomId = progress.currentRoom;
      this.currentLevelId = parseInt(progress.currentRoom.split('.')[0], 10) || 1;
    }

    this.bindEvents();
    this.updateHeaderStats();
    this.renderLevelSelector();
    this.renderRoomMap();
    this.renderBuildingTower();
    this.checkInitialAchievements();
  }

  bindEvents() {
    // Navigation Action Buttons
    document.getElementById('btnOpenStats')?.addEventListener('click', () => this.togglePanel('statsPanel', true));
    document.getElementById('btnCloseStats')?.addEventListener('click', () => this.togglePanel('statsPanel', false));

    document.getElementById('btnOpenVault')?.addEventListener('click', () => {
      this.renderVaultPanel();
      this.togglePanel('vaultPanel', true);
    });
    document.getElementById('btnCloseVault')?.addEventListener('click', () => this.togglePanel('vaultPanel', false));

    document.getElementById('btnOpenSettings')?.addEventListener('click', () => this.openSettingsModal());
    document.getElementById('btnCloseSettings')?.addEventListener('click', () => this.closeSettingsModal());

    // Submit & Hint buttons
    document.getElementById('btnSubmitAnswer')?.addEventListener('click', () => this.handleAnswerSubmission());
    document.getElementById('btnRequestHint')?.addEventListener('click', () => this.handleRequestHint());
    document.getElementById('btnFiftyFifty')?.addEventListener('click', () => this.handleFiftyFifty());

    // Building Tower Door & Floor Clicks
    document.getElementById('buildingTower')?.addEventListener('click', (e) => {
      const doorBtn = e.target.closest('.tower-door-badge');
      if (doorBtn && !doorBtn.classList.contains('door-locked')) {
        const roomId = doorBtn.getAttribute('data-room-id');
        if (roomId) this.startRoom(roomId);
      }
    });

    // Continue Mission Button
    document.getElementById('btnContinueMission')?.addEventListener('click', () => {
      const activeRoomId = this.getActiveOrNextRoomId();
      this.startRoom(activeRoomId);
    });

    // Level selector tabs
    document.getElementById('levelTabsContainer')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.level-tab-btn');
      if (btn) {
        const lvl = parseInt(btn.getAttribute('data-level'), 10);
        this.selectLevel(lvl);
      }
    });

    // Room Map Card Clicks
    document.getElementById('roomMapContainer')?.addEventListener('click', (e) => {
      const card = e.target.closest('.room-map-card');
      if (card && !card.classList.contains('locked')) {
        const roomId = card.getAttribute('data-room-id');
        this.startRoom(roomId);
      }
    });

    // Success Modal Continue
    document.getElementById('btnSuccessContinue')?.addEventListener('click', () => {
      this.closeModal('successModal');
      this.advanceToNextQuestion();
    });

    // Explanation Modal Actions
    document.getElementById('btnExplanationNext')?.addEventListener('click', () => {
      this.closeModal('explanationModal');
      this.advanceToNextQuestion();
    });

    document.getElementById('btnTrySimilarQuestion')?.addEventListener('click', () => {
      this.handleTrySimilarQuestion();
    });

    // Flag Question Button
    document.getElementById('btnFlagQuestion')?.addEventListener('click', () => {
      if (this.currentQuestion) {
        const flagged = this.progressManager.toggleFlagQuestion(this.currentQuestion.id);
        this.updateFlagButtonUI(flagged);
      }
    });

    // Room Complete Modal Buttons
    document.getElementById('btnRoomCompleteNext')?.addEventListener('click', () => {
      this.closeModal('roomCompleteModal');
      const nextRoom = this.progressManager.getNextRoomId(this.currentRoomId);
      if (nextRoom) {
        this.startRoom(nextRoom);
      } else {
        this.renderRoomMap();
      }
    });

    document.getElementById('btnRoomCompleteReview')?.addEventListener('click', () => {
      this.closeModal('roomCompleteModal');
      this.renderVaultPanel();
      this.togglePanel('vaultPanel', true);
    });

    document.getElementById('btnRoomFailRetry')?.addEventListener('click', () => {
      this.closeModal('roomFailModal');
      this.startRoom(this.currentRoomId);
    });

    document.getElementById('btnRoomFailVault')?.addEventListener('click', () => {
      this.closeModal('roomFailModal');
      this.renderVaultPanel();
      this.togglePanel('vaultPanel', true);
    });

    // Settings Modal Save
    document.getElementById('formSettings')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const apiKey = document.getElementById('settingApiKeyInput')?.value;
      const aiEnabled = document.getElementById('settingAiEnabledToggle')?.checked;
      this.aiHandler.setApiKey(apiKey || '');
      this.aiHandler.setAiEnabled(aiEnabled);
      this.closeSettingsModal();
      this.showToast('⚙️ Settings Saved', 'AI preferences have been successfully updated.');
    });

    // Vault Filter buttons
    document.getElementById('vaultFilterTabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.vault-tab');
      if (tab) {
        document.querySelectorAll('.vault-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.vaultManager.setFilter(tab.getAttribute('data-filter'));
        this.renderVaultPanel();
      }
    });

    document.getElementById('vaultSearchInput')?.addEventListener('input', (e) => {
      this.vaultManager.setSearch(e.target.value);
      this.renderVaultPanel();
    });

    document.getElementById('btnPracticeWeakVault')?.addEventListener('click', () => {
      this.startVaultPracticeSession();
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      // If modal or input active, don't trigger game hotkeys
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (['1', '2', '3', '4'].includes(e.key) && !this.isAnswerSubmitted) {
        const idx = parseInt(e.key, 10) - 1;
        this.selectOption(idx);
      } else if (e.key === 'Enter' && !this.isAnswerSubmitted && this.selectedOptionIndex !== null) {
        this.handleAnswerSubmission();
      } else if (e.key === 'Escape') {
        ['statsPanel', 'vaultPanel'].forEach(id => this.togglePanel(id, false));
        ['explanationModal', 'successModal', 'roomCompleteModal', 'roomFailModal', 'settingsModal'].forEach(id => this.closeModal(id));
      }
    });
  }

  updateHeaderStats() {
    const progress = this.progressManager.getProgress();
    const scoreEl = document.getElementById('headerTotalScore');
    const streakEl = document.getElementById('headerStreakCount');
    const streakBadge = document.getElementById('headerStreakBadge');
    const levelNameEl = document.getElementById('headerLevelIndicator');

    if (scoreEl) scoreEl.textContent = Number(progress.totalScore || 0).toLocaleString('en-IN');
    if (streakEl) streakEl.textContent = progress.streak || 0;

    if (streakBadge) {
      if ((progress.streak || 0) >= 5) {
        streakBadge.classList.add('streak-fire-highlight');
      } else {
        streakBadge.classList.remove('streak-fire-highlight');
      }
    }

    const currentLevel = this.roomConfigs?.levels?.find(l => l.id === this.currentLevelId);
    if (levelNameEl) {
      levelNameEl.textContent = `Level ${this.currentLevelId}: ${currentLevel?.name || 'Campus Recruitment'}`;
    }
  }

  renderLevelSelector() {
    const container = document.getElementById('levelTabsContainer');
    if (!container || !this.roomConfigs?.levels) return;

    container.innerHTML = this.roomConfigs.levels.map(lvl => {
      const isCurrent = lvl.id === this.currentLevelId;
      return `
        <button class="level-tab-btn ${isCurrent ? 'active' : ''}" data-level="${lvl.id}" id="levelTab_${lvl.id}">
          <span class="tab-level-num">L${lvl.id}</span>
          <span class="tab-level-name">${lvl.name}</span>
        </button>
      `;
    }).join('');
  }

  selectLevel(levelId) {
    this.currentLevelId = levelId;
    this.renderLevelSelector();
    this.renderRoomMap();
    this.updateHeaderStats();
  }

  getActiveOrNextRoomId() {
    if (this.currentRoomId) return this.currentRoomId;
    for (const level of (this.roomConfigs?.levels || [])) {
      for (const room of level.rooms) {
        if (!this.progressManager.isRoomCompleted(room.id)) {
          return room.id;
        }
      }
    }
    return '1.1';
  }

  handleFiftyFifty() {
    if (this.isAnswerSubmitted || this.isFiftyFiftyUsed) return;
    if (!this.currentQuestion || !Array.isArray(this.currentQuestion.options)) return;
    
    this.isFiftyFiftyUsed = true;
    const correctIdx = this.currentQuestion.correctAnswer;
    const incorrectIndices = [];
    this.currentQuestion.options.forEach((_, idx) => {
      if (idx !== correctIdx) incorrectIndices.push(idx);
    });
    
    // Pick 2 random incorrect options to eliminate
    const shuffledIncorrect = [...incorrectIndices].sort(() => Math.random() - 0.5);
    const toEliminate = shuffledIncorrect.slice(0, 2);
    
    toEliminate.forEach(idx => {
      const card = document.getElementById(`optCard_${idx}`);
      if (card) {
        card.classList.add('lifeline-eliminated');
        // Add animated paw claw slash overlay
        const slashEl = document.createElement('div');
        slashEl.className = 'paw-claw-slash';
        slashEl.innerHTML = `
          <svg viewBox="0 0 100 40" style="width:100%; height:100%; filter: drop-shadow(0 2px 4px rgba(220,38,38,0.5));">
            <line x1="5" y1="5" x2="95" y2="35" stroke="#DC2626" stroke-width="4.5" stroke-linecap="round"/>
            <line x1="12" y1="4" x2="90" y2="32" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
            <line x1="20" y1="4" x2="82" y2="30" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
          </svg>
        `;
        card.appendChild(slashEl);
      }
    });

    const btnFifty = document.getElementById('btnFiftyFifty');
    if (btnFifty) {
      btnFifty.disabled = true;
      btnFifty.classList.add('opacity-50', 'cursor-not-allowed');
      btnFifty.textContent = '🎲 50/50 Used';
    }

    if (window.plutoCharacter) {
      window.plutoCharacter.speak("Woof! I sniffed away 2 incorrect choices! 🐾", 3500);
    }
  }

  renderBuildingTower() {
    // Renders the 5-story illustrated building tower and updates Pluto's mission status
    this.renderRoomMap();
  }

  renderRoomMap() {
    if (!this.roomConfigs?.levels) return;

    const progress = this.progressManager.getProgress();
    const clearedRooms = progress.clearedRooms || [];
    const totalDoors = 15;
    const clearedCount = clearedRooms.length;
    const progressPercent = Math.min(100, Math.round((clearedCount / totalDoors) * 100));

    // Determine currently active room
    let activeRoom = null;
    for (const level of this.roomConfigs.levels) {
      for (const room of level.rooms) {
        if (!this.progressManager.isRoomCompleted(room.id)) {
          activeRoom = room;
          break;
        }
      }
      if (activeRoom) break;
    }
    if (!activeRoom) {
      activeRoom = this.roomConfigs.levels[4].rooms[2];
    }

    const currentFloor = parseInt((activeRoom.id || '1.1').split('.')[0], 10);
    const floorsRemaining = Math.max(0, 5 - currentFloor);

    // 1. Render each floor in the illustrated Building Tower & Elevator Shaft
    const elevatorCar = document.getElementById('elevatorCar');
    if (elevatorCar) {
      // Map floor 1-5 to elevator height percentage
      const floorPercentages = { 1: '4%', 2: '25%', 3: '47%', 4: '68%', 5: '88%' };
      elevatorCar.style.bottom = floorPercentages[currentFloor] || '4%';
    }

    // Update elevator stops indicator
    document.querySelectorAll('.elevator-stop').forEach(stop => {
      const stopFloor = parseInt(stop.getAttribute('data-floor') || '1', 10);
      stop.classList.remove('active', 'cleared');
      if (stopFloor < currentFloor) {
        stop.classList.add('cleared');
      } else if (stopFloor === currentFloor) {
        stop.classList.add('active');
      }
    });

    this.roomConfigs.levels.forEach(level => {
      const floorEl = document.getElementById(`towerFloor${level.id}`);
      const doorsEl = document.getElementById(`floorDoors${level.id}`);
      const plutoSlot = document.getElementById(`plutoFloorSlot${level.id}`);

      const allLevelRoomsDone = level.rooms.every(r => this.progressManager.isRoomCompleted(r.id));
      const isCurrentLevel = level.id === currentFloor;

      if (floorEl) {
        floorEl.classList.remove('active', 'completed', 'locked');
        if (allLevelRoomsDone) {
          floorEl.classList.add('completed');
        } else if (isCurrentLevel || level.id <= currentFloor) {
          floorEl.classList.add('active');
        } else {
          floorEl.classList.add('locked');
        }
      }

      // Update Pluto presence on current floor
      if (plutoSlot) {
        if (isCurrentLevel) {
          plutoSlot.innerHTML = `
            <div class="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/30 to-amber-600/30 border border-amber-400/60 rounded-full px-3 py-1 shadow-sm animate-pulse">
              <span class="text-lg">🐕</span>
              <span class="text-xs font-bold text-amber-200 tracking-wide font-sans">PLUTO HERE</span>
            </div>
          `;
        } else {
          plutoSlot.innerHTML = '';
        }
      }

      if (doorsEl) {
        doorsEl.innerHTML = level.rooms.map(room => {
          const isDone = this.progressManager.isRoomCompleted(room.id);
          const isUnlocked = this.progressManager.isRoomUnlocked(room.id, room.unlockRequirement);
          const isCurrent = room.id === activeRoom.id;

          let badgeClass = 'door-locked';
          let statusLabel = '🔒 Locked';
          if (isDone) {
            badgeClass = 'door-cleared';
            statusLabel = '✓ Cleared';
          } else if (isCurrent) {
            badgeClass = 'door-current';
            statusLabel = '⚡ NOW';
          } else if (isUnlocked) {
            badgeClass = 'door-available';
            statusLabel = '🔓 Open';
          }

          return `
            <button class="tower-door-badge ${badgeClass}" data-room-id="${room.id}" title="${room.name}" ${(!isUnlocked && !isDone) ? 'disabled' : ''}>
              <span class="door-badge-num">🚪 ${room.id}</span>
              <span class="door-badge-status">${statusLabel}</span>
            </button>
          `;
        }).join('');
      }
    });

    // 2. Update the Pluto Mission Card
    const badgeEl = document.getElementById('missionRoomBadge');
    if (badgeEl) badgeEl.textContent = `📍 Room ${activeRoom.id}: ${activeRoom.name}`;

    const targetEl = document.getElementById('missionTargetText');
    if (targetEl) {
      targetEl.innerHTML = `🎯 Solve finance puzzles with <strong>≥80% accuracy</strong> to unlock Door ${activeRoom.id} and climb higher!`;
    }

    const progTextEl = document.getElementById('missionProgressText');
    if (progTextEl) {
      progTextEl.textContent = `Progress: ${progressPercent}% (${clearedCount}/15 doors cleared)`;
    }

    const floorsLeftEl = document.getElementById('missionFloorsLeft');
    if (floorsLeftEl) {
      floorsLeftEl.textContent = floorsRemaining === 0 ? "🎉 On Floor 5! Abhishek's office!" : `${floorsRemaining} floor${floorsRemaining === 1 ? '' : 's'} to Abhishek! 🐾`;
    }

    const progFillEl = document.getElementById('missionProgressFill');
    if (progFillEl) {
      progFillEl.style.width = `${Math.max(8, progressPercent)}%`;
    }

    // Dynamic Abhishek encouraging quote based on floor
    const quoteEl = document.getElementById('missionAbhishekQuote');
    if (quoteEl) {
      const quotes = {
        1: '"Great job Pluto! I can hear you getting closer! Keep your paws steady and solve those Indian corporate ratios! 🐾"',
        2: '"Floor 2! You\'re tackling the technical interview drills like a pro! I left a chew bone by the water cooler! ❤️"',
        3: '"Halfway there, buddy! Financial modeling and tech floors are tough, but you\'ve got this! 🐾"',
        4: '"You\'re right below me in the Boardrooms! Only one floor between us now! Keep going! 🏢❤️"',
        5: '"PLUTO! I\'m right here in the Partner\'s Office! Just unlock these last doors! 🐕🎉"'
      };
      quoteEl.textContent = quotes[currentFloor] || quotes[1];
    }

    // 3. Fallback container
    const container = document.getElementById('roomMapContainer');
    if (container) {
      const level = this.roomConfigs.levels.find(l => l.id === this.currentLevelId) || this.roomConfigs.levels[0];
      container.innerHTML = level.rooms.map((room, index) => {
        const isCompleted = this.progressManager.isRoomCompleted(room.id);
        const isUnlocked = this.progressManager.isRoomUnlocked(room.id, room.unlockRequirement);
        const isActive = !isCompleted && isUnlocked;

        let stateClass = 'locked';
        let badgeHtml = '<span class="status-badge badge-locked">🔒 LOCKED</span>';

        if (isCompleted) {
          stateClass = 'completed';
          badgeHtml = '<span class="status-badge badge-completed">✓ DONE ⭐⭐⭐</span>';
        } else if (isActive) {
          stateClass = 'active';
          badgeHtml = '<span class="status-badge badge-active">⚡ NOW</span>';
        }

        const arrowConnector = index < level.rooms.length - 1 
          ? `<div class="room-connector ${isCompleted ? 'connector-done' : ''}">→</div>` 
          : '';

        return `
          <div class="room-card-wrapper">
            <div class="room-map-card ${stateClass}" data-room-id="${room.id}" id="roomCard_${room.id.replace('.', '_')}">
              <div class="room-card-header">
                <span class="room-id-tag">Room ${room.id}</span>
                ${badgeHtml}
              </div>
              <h3 class="room-card-title">${room.name}</h3>
              <p class="room-card-desc">${room.description}</p>
              <div class="room-card-footer">
                <span class="text-xs text-secondary font-medium">Passing: ${room.passingScore}% Accuracy</span>
                <button class="btn-sm ${isActive ? 'btn-primary' : isCompleted ? 'btn-outline' : 'btn-disabled'}">
                  ${isCompleted ? 'Replay' : isActive ? 'Enter Room →' : 'Locked'}
                </button>
              </div>
            </div>
            ${arrowConnector}
          </div>
        `;
      }).join('');
    }
  }

  startRoom(roomId) {
    this.currentRoomId = roomId;
    this.currentLevelId = parseInt(roomId.split('.')[0], 10);
    this.isBonusPractice = false;

    // Fetch questions for this room
    let questions = this.questionRepo.getByRoom(roomId);
    if (questions.length === 0) {
      questions = this.questionRepo.getAll().slice(0, 5);
    }

    this.currentRoomQuestions = questions;
    this.currentQuestionIndex = 0;
    this.roomCorrectCount = 0;
    this.roomScoreEarned = 0;
    this.roomHintsUsedCount = 0;

    // Update door room title
    const doorTitle = document.getElementById('doorRoomTitle');
    const roomConfig = this.roomConfigs?.levels?.flatMap(l => l.rooms)?.find(r => r.id === roomId);
    if (doorTitle) {
      doorTitle.textContent = `Door ${roomId} • ${roomConfig ? roomConfig.name : 'Security Puzzle'}`;
    }

    // Show gameplay arena, scroll into view smoothly
    document.getElementById('roomPlayArena')?.classList.remove('hidden');
    document.getElementById('roomPlayArena')?.scrollIntoView({ behavior: 'smooth' });

    if (window.narrativeManager) {
      window.narrativeManager.updateDistance(roomId, this.progressManager.getProgress().clearedRooms?.length || 0);
    }
    if (window.plutoCharacter) {
      window.plutoCharacter.speak(`Approaching Door ${roomId}! What would Abhishek say? 🐾`, 3500);
    }

    this.loadQuestion(this.currentQuestionIndex);
    this.updateHeaderStats();
    this.renderRoomMap();
  }

  loadQuestion(index) {
    if (!this.currentRoomQuestions || index >= this.currentRoomQuestions.length) {
      this.evaluateRoomCompletion();
      return;
    }

    const rawQuestion = this.currentRoomQuestions[index];
    // Fisher-Yates shuffle options for varied replayability
    this.currentQuestion = this.questionRepo.shuffleQuestionOptions(rawQuestion);
    this.selectedOptionIndex = null;
    this.isAnswerSubmitted = false;
    this.questionStartTime = Date.now();
    this.currentQuestionHintsUsed = 0;

    // Reset Hint UI
    const hintBox = document.getElementById('questionHintBox');
    if (hintBox) {
      hintBox.classList.add('hidden');
      hintBox.innerHTML = '';
    }

    // Spin the vault combination dial to locked angle
    const combDial = document.getElementById('doorCombinationDial');
    if (combDial) {
      const dialDeg = ((index * 68) + 40) % 360;
      combDial.style.transform = `rotate(${dialDeg}deg)`;
    }

    // Reset security LED to armed
    const ledBulb = document.getElementById('statusLedBulb');
    const ledLabel = document.getElementById('statusLedLabel');
    if (ledBulb) {
      ledBulb.className = 'status-led-bulb armed';
    }
    if (ledLabel) {
      ledLabel.className = 'status-led-label';
      ledLabel.textContent = 'ARMED';
    }

    // Update Progress Indicator & Header
    const qCount = this.currentRoomQuestions.length;
    const progressDots = document.getElementById('questionProgressDots');
    if (progressDots) {
      progressDots.innerHTML = Array.from({ length: qCount }).map((_, i) => {
        const dotState = i < index ? 'dot-done' : i === index ? 'dot-current' : 'dot-pending';
        return `<span class="progress-dot ${dotState}"></span>`;
      }).join('');
    }

    const qNumEl = document.getElementById('currentQuestionNumberLabel');
    if (qNumEl) qNumEl.textContent = `Question ${index + 1} of ${qCount}`;

    const typeBadge = document.getElementById('questionTypeBadge');
    if (typeBadge) {
      const diff = this.currentQuestion.difficulty || 'medium';
      typeBadge.textContent = `${this.currentQuestion.topic || 'Finance'} • ${diff.toUpperCase()}`;
      typeBadge.className = `type-badge type-${diff}`;
    }

    // Flag icon state
    this.updateFlagButtonUI(this.progressManager.isQuestionFlagged(this.currentQuestion.id));

    // Render Question Text with Indian context highlighting
    const qTextEl = document.getElementById('activeQuestionText');
    if (qTextEl) {
      let formatted = this.escapeHtml(this.currentQuestion.question);
      // Highlight company name in navy bold
      if (this.currentQuestion.company) {
        const compRegex = new RegExp(`(${this.escapeRegex(this.currentQuestion.company)})`, 'gi');
        formatted = formatted.replace(compRegex, '<span class="company-highlight font-bold text-navy">$1</span>');
      }
      // Highlight Indian Rupee values
      formatted = formatted.replace(/(₹[0-9,]+(\.[0-9]+)?\s*(Cr|Crores|Lakhs|L)?)/g, '<span class="currency-highlight font-semibold text-gold">$1</span>');
      qTextEl.innerHTML = formatted;
    }

    // Reset 50/50 Lifeline button
    this.isFiftyFiftyUsed = false;
    const btnFifty = document.getElementById('btnFiftyFifty');
    if (btnFifty) {
      btnFifty.disabled = false;
      btnFifty.classList.remove('opacity-50', 'cursor-not-allowed');
      btnFifty.textContent = '🎲 50/50 Lifeline';
    }

    // Render 2x2 Option Cards
    const optionsGrid = document.getElementById('questionOptionsGrid');
    if (optionsGrid && Array.isArray(this.currentQuestion.options)) {
      optionsGrid.innerHTML = this.currentQuestion.options.map((optText, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
          <button class="option-card" data-index="${optIdx}" id="optCard_${optIdx}">
            <span class="option-label option-letter">${letter}</span>
            <span class="option-text">${this.escapeHtml(optText)}</span>
          </button>
        `;
      }).join('');

      // Bind selection clicks
      optionsGrid.querySelectorAll('.option-card').forEach(card => {
        card.addEventListener('click', () => {
          if (this.isAnswerSubmitted) return;
          const idx = parseInt(card.getAttribute('data-index'), 10);
          this.selectOption(idx);
        });
      });
    }

    // Disable submit until selection
    const submitBtn = document.getElementById('btnSubmitAnswer');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
  }

  selectOption(index) {
    if (this.isAnswerSubmitted) return;
    this.selectedOptionIndex = index;

    document.querySelectorAll('.option-card').forEach((card, idx) => {
      card.classList.toggle('selected', idx === index);
    });

    const submitBtn = document.getElementById('btnSubmitAnswer');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  }

  updateFlagButtonUI(isFlagged) {
    const btn = document.getElementById('btnFlagQuestion');
    if (btn) {
      btn.innerHTML = isFlagged ? '🚩 Flagged' : '🏳️ Flag';
      btn.classList.toggle('flagged-active', isFlagged);
    }
  }

  async handleAnswerSubmission() {
    if (this.isAnswerSubmitted || this.selectedOptionIndex === null) return;
    this.isAnswerSubmitted = true;

    const timeSpent = Math.max(1, Math.round((Date.now() - this.questionStartTime) / 1000));
    const isCorrect = this.selectedOptionIndex === this.currentQuestion.correctAnswer;

    // Disable all options
    document.querySelectorAll('.option-card').forEach(c => c.classList.add('pointer-events-none'));
    const submitBtn = document.getElementById('btnSubmitAnswer');
    if (submitBtn) submitBtn.disabled = true;

    const selectedEl = document.getElementById(`optCard_${this.selectedOptionIndex}`);
    const correctEl = document.getElementById(`optCard_${this.currentQuestion.correctAnswer}`);

    if (isCorrect) {
      // Success Flow
      if (selectedEl) {
        selectedEl.classList.add('correct');
      }

      // Vault Door combination dial snaps open to 0 deg & LED glows green
      const combDial = document.getElementById('doorCombinationDial');
      if (combDial) {
        combDial.style.transform = 'rotate(0deg)';
      }
      const ledBulb = document.getElementById('statusLedBulb');
      const ledLabel = document.getElementById('statusLedLabel');
      if (ledBulb) {
        ledBulb.className = 'status-led-bulb unlocked';
      }
      if (ledLabel) {
        ledLabel.className = 'status-led-label unlocked';
        ledLabel.textContent = 'UNLOCKED';
      }

      // Pluto celebrates
      if (window.plutoCharacter) {
        const currentStreak = this.progressManager.getProgress().streak || 0;
        window.plutoCharacter.reactToAnswer(true, currentStreak + 1);
      }

      // Calculate points
      const history = this.progressManager.getProgress().questionHistory[this.currentQuestion.id];
      const isFirstAttempt = !history || history.attempts === 0;
      const currentStreak = this.progressManager.getProgress().streak || 0;

      const basePts = window.CONFIG.POINTS[this.currentQuestion.difficulty || 'medium'] || 100;
      let multiplier = 1;
      if (isFirstAttempt) multiplier *= window.CONFIG.POINTS.FIRST_ATTEMPT_MULTIPLIER;
      if (currentStreak >= 5) multiplier *= window.CONFIG.POINTS.STREAK_5_MULTIPLIER;

      const earnedPoints = Math.round(basePts * multiplier);
      this.roomCorrectCount++;
      this.roomScoreEarned += earnedPoints;

      // Record in progress
      this.progressManager.recordAttempt(
        this.currentQuestion.id,
        true,
        timeSpent,
        this.currentQuestion.topic,
        this.currentQuestion
      );
      this.progressManager.addPoints(earnedPoints);
      this.updateHeaderStats();

      // Check achievements
      this.progressManager.checkAchievements(this.achievementsList, (unlocked) => {
        this.showAchievementToast(unlocked);
      });

      // Show Success Modal after subtle pulse
      setTimeout(() => {
        this.showSuccessModal(earnedPoints, currentStreak + 1);
      }, 500);

    } else {
      // Wrong Flow
      if (selectedEl) {
        selectedEl.classList.add('wrong');
      }
      if (correctEl) {
        correctEl.classList.add('correct-reveal');
      }

      // Security LED flashes lockdown red
      const ledBulb = document.getElementById('statusLedBulb');
      const ledLabel = document.getElementById('statusLedLabel');
      if (ledBulb) {
        ledBulb.className = 'status-led-bulb error';
      }
      if (ledLabel) {
        ledLabel.className = 'status-led-label error';
        ledLabel.textContent = 'LOCKDOWN';
      }

      // Pluto whimper & thinking
      if (window.plutoCharacter) {
        window.plutoCharacter.reactToAnswer(false, 0);
      }

      // Record in progress (streak resets, added to review vault)
      this.progressManager.recordAttempt(
        this.currentQuestion.id,
        false,
        timeSpent,
        this.currentQuestion.topic,
        this.currentQuestion
      );
      this.updateHeaderStats();

      // Fetch AI explanation asynchronously while showing modal
      setTimeout(async () => {
        await this.showExplanationModal(this.selectedOptionIndex);
      }, 500);
    }
  }

  showSuccessModal(earnedPoints, newStreak) {
    const ptsEl = document.getElementById('successPointsEarnedLabel');
    const streakEl = document.getElementById('successStreakBonusLabel');
    if (ptsEl) ptsEl.textContent = `+${earnedPoints} Points`;
    if (streakEl) {
      streakEl.textContent = newStreak >= 3 ? `🔥 ${newStreak} Question Streak!` : 'Keep the momentum going!';
    }
    this.openModal('successModal');
  }

  async showExplanationModal(wrongIndex) {
    const wrongOptText = this.currentQuestion.options[wrongIndex] || 'Your Choice';
    const correctOptText = this.currentQuestion.options[this.currentQuestion.correctAnswer] || 'Correct Choice';

    const yourAnsEl = document.getElementById('modalWrongYourAnswerText');
    const correctAnsEl = document.getElementById('modalWrongCorrectAnswerText');
    const staticExplEl = document.getElementById('modalWrongStaticExplanation');
    const aiExplEl = document.getElementById('modalWrongAiExplanation');
    const exampleEl = document.getElementById('modalWrongExampleText');
    const tipEl = document.getElementById('modalWrongTipText');

    if (yourAnsEl) yourAnsEl.textContent = `❌ You selected: "${wrongOptText}"`;
    if (correctAnsEl) correctAnsEl.textContent = `✓ Correct answer: "${correctOptText}"`;
    if (staticExplEl) staticExplEl.textContent = this.currentQuestion.explanation || 'No explanation available.';
    if (exampleEl) exampleEl.textContent = this.currentQuestion.example || 'Example data for Indian corporates is provided in review materials.';
    if (tipEl) tipEl.textContent = this.currentQuestion.interviewTip || 'Review the core formula and definitions before technical rounds.';

    // Show initial modal immediately
    this.openModal('explanationModal');

    // Trigger AI personal mentor explanation
    if (aiExplEl) {
      aiExplEl.innerHTML = '<span class="ai-loading">Generating personalized Dalal Street mentor feedback...</span>';
      try {
        const topicStats = this.progressManager.getProgress().topicStats[this.currentQuestion.topic];
        const topicAcc = topicStats ? topicStats.accuracy : 50;
        const aiResponse = await this.aiHandler.getPersonalizedWrongExplanation(this.currentQuestion, wrongIndex, topicAcc);

        if (aiResponse) {
          aiExplEl.innerHTML = `<div class="ai-feedback-box">${this.formatTextWithBreaks(aiResponse)}</div>`;
        } else {
          aiExplEl.innerHTML = '<div class="text-xs text-secondary">AI enhancement is offline. Core static explanation displayed above.</div>';
        }
      } catch (e) {
        aiExplEl.innerHTML = '<div class="text-xs text-secondary">Core static explanation displayed above.</div>';
      }
    }
  }

  async handleRequestHint() {
    if (this.isAnswerSubmitted) return;

    if (window.plutoCharacter) {
      window.plutoCharacter.reactToHint();
    }

    // Deduct hint points
    this.progressManager.deductPoints(window.CONFIG.POINTS.HINT_COST);
    this.updateHeaderStats();
    this.currentQuestionHintsUsed++;
    this.roomHintsUsedCount++;

    const hintLevel = Math.min(3, this.currentQuestionHintsUsed);
    const hintBox = document.getElementById('questionHintBox');
    if (!hintBox) return;

    hintBox.classList.remove('hidden');
    hintBox.innerHTML = `<div class="hint-pill font-medium">💡 Generating Hint ${hintLevel} (-5 pts)...</div>`;

    // Static hint fallback if available in question data
    let hintText = this.currentQuestion.hints?.[hintLevel - 1];

    // Try AI generation for high dynamic quality
    try {
      const aiHint = await this.aiHandler.getProgressiveHint(this.currentQuestion, hintLevel);
      if (aiHint) hintText = aiHint;
    } catch (e) {
      console.warn('AI hint fallback', e);
    }

    hintBox.innerHTML = `
      <div class="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 text-sm">
        <div class="font-bold flex items-center gap-1 mb-1">
          <span>💡 Hint ${hintLevel} of 3</span>
          <span class="text-xs font-normal text-amber-700">(-5 points applied)</span>
        </div>
        <div>${this.escapeHtml(hintText || 'Think about the core accounting principle linking balance sheet snapshots with period performance.')}</div>
      </div>
    `;
  }

  async handleTrySimilarQuestion() {
    this.closeModal('explanationModal');
    const loadingToast = this.showToast('🧠 AI Generating...', 'Authoring a similar Indian corporate finance question for you...');

    const similarQ = await this.aiHandler.generateSimilarQuestion(this.currentQuestion);
    if (similarQ) {
      // Inject as temporary bonus question
      this.currentRoomQuestions.splice(this.currentQuestionIndex + 1, 0, similarQ);
      this.advanceToNextQuestion();
      this.showToast('🎯 Bonus Question Ready', `Practicing concept with ${similarQ.company || 'new company'}!`);
    } else {
      this.showToast('⚠️ Notice', 'Could not generate dynamic question right now. Advancing to next room question.');
      this.advanceToNextQuestion();
    }
  }

  advanceToNextQuestion() {
    this.currentQuestionIndex++;
    this.loadQuestion(this.currentQuestionIndex);
  }

  evaluateRoomCompletion() {
    const totalQ = this.currentRoomQuestions.length;
    const accuracy = totalQ > 0 ? Math.round((this.roomCorrectCount / totalQ) * 100) : 0;
    const passed = accuracy >= window.CONFIG.PASSING_ACCURACY_PERCENT;

    if (passed) {
      // Room Passed!
      const { nextRoomId } = this.progressManager.completeRoom(
        this.currentRoomId,
        accuracy,
        window.CONFIG.POINTS.ROOM_CLEAR_BONUS
      );

      const clearedCount = this.progressManager.getProgress().clearedRooms?.length || 0;
      if (window.narrativeManager) {
        window.narrativeManager.updateDistance(this.currentRoomId, clearedCount);
      }

      const floor = parseInt(this.currentRoomId.split('.')[0], 10) || 1;
      if (window.plutoCharacter) {
        window.plutoCharacter.celebrateFloorCleared(floor);
      }

      // Check room achievements
      this.progressManager.checkAchievements(this.achievementsList, (ach) => this.showAchievementToast(ach));

      // Display Passed Modal or Abhishek Message / Reunion
      const titleEl = document.getElementById('roomCompleteTitle');
      const scoreEl = document.getElementById('roomCompleteStats');
      if (titleEl) titleEl.textContent = `⭐ DOOR ${this.currentRoomId} UNLOCKED! ⭐`;
      if (scoreEl) {
        scoreEl.innerHTML = `
          <div class="text-xl font-bold text-success mb-2">${accuracy}% Accuracy (${this.roomCorrectCount}/${totalQ})</div>
          <div class="text-sm text-secondary">Earned <strong>+${this.roomScoreEarned + window.CONFIG.POINTS.ROOM_CLEAR_BONUS} total points</strong> (includes +200 door clear bonus).</div>
        `;
      }

      // Grand Reunion at Room 5.3!
      if (this.currentRoomId === '5.3') {
        if (window.narrativeManager) {
          window.narrativeManager.triggerGrandReunion();
        } else {
          this.openModal('roomCompleteModal');
        }
      } else {
        // Show Abhishek's message modal first, then room complete modal on continue
        if (window.abhishekMessages) {
          window.abhishekMessages.showMessage(this.currentRoomId, () => {
            this.openModal('roomCompleteModal');
          });
        } else {
          this.openModal('roomCompleteModal');
        }
      }
    } else {
      // Room Failed (<80%)
      const failTitle = document.getElementById('roomFailTitle');
      const failStats = document.getElementById('roomFailStats');
      if (failTitle) failTitle.textContent = `Room ${this.currentRoomId} Attempted`;
      if (failStats) {
        failStats.innerHTML = `
          <div class="text-xl font-bold text-amber mb-2">${accuracy}% Accuracy (${this.roomCorrectCount}/${totalQ})</div>
          <div class="text-sm text-secondary mb-2">Passing score is <strong>80%</strong>. Missed questions have been automatically saved to your <strong>Review Vault</strong>.</div>
        `;
      }
      this.openModal('roomFailModal');
    }

    this.updateHeaderStats();
    this.renderRoomMap();
  }

  startVaultPracticeSession() {
    const weakest = this.vaultManager.getWeakestQuestions(5);
    if (weakest.length === 0) {
      alert('Your Review Vault is empty or all questions are mastered! Great job!');
      return;
    }

    this.togglePanel('vaultPanel', false);
    this.currentRoomQuestions = weakest.map(w => w.question).filter(Boolean);
    this.currentQuestionIndex = 0;
    this.roomCorrectCount = 0;
    this.roomScoreEarned = 0;
    this.isBonusPractice = true;

    document.getElementById('roomPlayArena')?.classList.remove('hidden');
    document.getElementById('roomPlayArena')?.scrollIntoView({ behavior: 'smooth' });
    this.loadQuestion(0);
    this.showToast('📚 Review Session', `Started practice on ${this.currentRoomQuestions.length} vault questions.`);
  }

  renderVaultPanel() {
    const container = document.getElementById('vaultListContainer');
    const countEl = document.getElementById('vaultTotalCountBadge');
    if (!container) return;

    const items = this.vaultManager.getFilteredItems();
    if (countEl) countEl.textContent = `${items.length} questions`;

    if (items.length === 0) {
      container.innerHTML = `
        <div class="text-center py-12 text-secondary">
          <div class="text-3xl mb-2">📚</div>
          <p class="font-medium">No questions in this vault filter.</p>
          <p class="text-xs">Questions you get wrong are automatically saved here for interview revision.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(item => {
      const q = item.question;
      const historyIcons = Array.from({ length: item.wrongCount }).map(() => '❌').join('') +
        (item.correctCount > 0 ? '✅' : '');

      return `
        <div class="vault-item-card ${item.mastered ? 'vault-mastered' : ''}" id="vaultItem_${item.id}">
          <div class="vault-card-top">
            <span class="badge badge-sm badge-outline">${this.escapeHtml(q.topic || 'Finance')}</span>
            <span class="text-xs font-mono text-secondary">${historyIcons}</span>
          </div>
          <p class="vault-card-question line-clamp-2">${this.escapeHtml(q.question)}</p>
          <div class="vault-card-actions">
            <button class="btn-xs btn-outline btn-vault-master" data-id="${item.id}">
              ${item.mastered ? '✓ Mastered' : 'Mark Mastered'}
            </button>
            <button class="btn-xs btn-primary btn-vault-practice" data-id="${item.id}">Practice Now</button>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.btn-vault-master').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-id');
        this.vaultManager.toggleMastered(qId);
        this.renderVaultPanel();
      });
    });

    container.querySelectorAll('.btn-vault-practice').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = btn.getAttribute('data-id');
        const q = this.questionRepo.getById(qId);
        if (q) {
          this.togglePanel('vaultPanel', false);
          this.currentRoomQuestions = [q];
          this.currentQuestionIndex = 0;
          document.getElementById('roomPlayArena')?.classList.remove('hidden');
          document.getElementById('roomPlayArena')?.scrollIntoView({ behavior: 'smooth' });
          this.loadQuestion(0);
        }
      });
    });
  }

  openSettingsModal() {
    const inputKey = document.getElementById('settingApiKeyInput');
    const toggleAi = document.getElementById('settingAiEnabledToggle');
    if (inputKey) inputKey.value = this.aiHandler.getApiKey();
    if (toggleAi) toggleAi.checked = this.aiHandler.isAiEnabled();
    this.openModal('settingsModal');
  }

  closeSettingsModal() {
    this.closeModal('settingsModal');
  }

  togglePanel(panelId, show) {
    const el = document.getElementById(panelId);
    if (!el) return;
    el.classList.toggle('active', show);

    if (panelId === 'statsPanel' && show) {
      this.renderStatsPanel();
    }
  }

  renderStatsPanel() {
    const summary = this.statsEngine.getOverallSummary();
    const topics = this.statsEngine.getTopicBreakdown();
    const levels = this.statsEngine.getLevelProgression(this.roomConfigs?.levels || []);
    const recs = this.statsEngine.getRecommendations();

    const elAcc = document.getElementById('statsOverallAccuracy');
    const elScore = document.getElementById('statsTotalScore');
    const elStreak = document.getElementById('statsBestStreak');
    const elBar = document.getElementById('statsAccuracyBarFill');

    if (elAcc) elAcc.textContent = `${summary.accuracy}%`;
    if (elScore) elScore.textContent = summary.totalScore.toLocaleString('en-IN');
    if (elStreak) elStreak.textContent = `${summary.longestStreak} in a row`;
    if (elBar) elBar.style.width = `${summary.accuracy}%`;

    // Strong & Weak topics
    const strongContainer = document.getElementById('statsStrongTopicsList');
    if (strongContainer) {
      strongContainer.innerHTML = topics.strongAreas.length === 0 
        ? '<div class="text-xs text-secondary">Keep answering questions to establish topic mastery.</div>' 
        : topics.strongAreas.map(t => `
          <div class="flex justify-between items-center text-sm py-1 border-b border-gray-100">
            <span class="font-medium text-emerald-800">✓ ${t.topic}</span>
            <span class="font-bold text-emerald-600">${t.accuracy}%</span>
          </div>
        `).join('');
    }

    const weakContainer = document.getElementById('statsWeakTopicsList');
    if (weakContainer) {
      weakContainer.innerHTML = topics.needPractice.length === 0
        ? '<div class="text-xs text-secondary">No weak areas identified yet!</div>'
        : topics.needPractice.map(t => `
          <div class="flex justify-between items-center text-sm py-1 border-b border-gray-100">
            <span class="font-medium text-red-800">⚠️ ${t.topic}</span>
            <span class="font-bold text-red-600">${t.accuracy}%</span>
          </div>
        `).join('');
    }

    // Level progression bars
    const lvlContainer = document.getElementById('statsLevelProgressionList');
    if (lvlContainer) {
      lvlContainer.innerHTML = levels.map(l => `
        <div class="mb-3">
          <div class="flex justify-between text-xs font-semibold mb-1">
            <span>Level ${l.levelId}: ${l.name}</span>
            <span>${l.finishedInLevel}/${l.totalRooms} Rooms (${l.percent}%)</span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-2">
            <div class="bg-navy h-2 rounded-full" style="width: ${l.percent}%"></div>
          </div>
        </div>
      `).join('');
    }

    // Recommendations
    const recContainer = document.getElementById('statsRecommendationsList');
    if (recContainer) {
      recContainer.innerHTML = recs.map(r => `
        <div class="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-navy mb-2">
          <div class="font-bold">${r.title}</div>
          <div class="text-secondary mt-0.5">${r.description}</div>
        </div>
      `).join('');
    }
  }

  checkInitialAchievements() {
    this.progressManager.checkAchievements(this.achievementsList, (ach) => {
      this.showAchievementToast(ach);
    });
  }

  showAchievementToast(achievement) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="toast-icon">${achievement.icon || '🏆'}</div>
      <div class="toast-body">
        <div class="toast-title">Achievement Unlocked!</div>
        <div class="toast-name">${this.escapeHtml(achievement.title)}</div>
        <div class="toast-desc">${this.escapeHtml(achievement.description)} (+${achievement.points || 100} pts)</div>
      </div>
    `;

    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  showToast(title, message) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast generic-toast';
    toast.innerHTML = `
      <div class="toast-body">
        <div class="toast-title">${this.escapeHtml(title)}</div>
        <div class="toast-desc">${this.escapeHtml(message)}</div>
      </div>
    `;
    document.getElementById('toastContainer')?.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 3000);
    return toast;
  }

  openModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
  }

  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  formatTextWithBreaks(str) {
    return this.escapeHtml(str).replace(/\n/g, '<br>');
  }
}

window.GameEngine = GameEngine;
