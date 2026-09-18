/**
 * Narrative & Cutscenes Manager
 * Manages the Pluto & Abhishek story arc, opening cutscenes, distance elevator tracker, and the Grand Reunion.
 */

class NarrativeManager {
  constructor(gameEngine) {
    this.gameEngine = gameEngine;
    this.currentCutsceneIndex = 0;
    this.openingScenes = [
      {
        title: "Bring Your Pet to Work Day",
        badge: "Panel 1 of 6 • Goldman Sachs Bangalore",
        image: "/assets/abhishek/abhishek-standing.svg",
        text: "Abhishek, a brilliant 27-year-old finance analyst at Goldman Sachs Bangalore (MBA from IIM Bangalore), brought his beloved Golden Labrador Pluto to the office for 'Bring Your Pet to Work Day'.",
        doodle: "🐾"
      },
      {
        title: "The Accidental Exploration",
        badge: "Panel 2 of 6 • 5-Floor Finance Tower",
        image: "/assets/pluto/pluto-running.svg",
        text: "During an urgent high-stakes client presentation, curious Pluto wandered off to explore the sprawling 5-floor corporate tower, guided by the scent of office cafeterias!",
        doodle: "🏢"
      },
      {
        title: "Emergency Security Lockdown!",
        badge: "Panel 3 of 6 • Doors Sealed",
        image: "/assets/doodles/calc-doodle.svg",
        text: "Sudden automated building lockdown protocols engaged! Heavy security doors sealed every floor. Each door is protected by complex Indian financial puzzles that only finance minds can unlock!",
        doodle: "🔒"
      },
      {
        title: "Abhishek to the Top Floor",
        badge: "Panel 4 of 6 • Floor 5 Partner's Office",
        image: "/assets/abhishek/abhishek-worried.svg",
        text: "Abhishek searched everywhere in panic and sprinted to the Partner's Office on Floor 5 — the only room equipped with master security overrides. But the elevators are locked down!",
        doodle: "🏃‍♂️"
      },
      {
        title: "The Shared Knowledge Bond",
        badge: "Panel 5 of 6 • 5 Floors Between Them",
        image: "/assets/pluto/pluto-thinking.svg",
        text: "Luckily, during every evening study session and Sunday walk at Cubbon Park, Abhishek taught Pluto corporate finance! Pluto knows balance sheets, WACC, DCF, and LBO returns!",
        doodle: "💡"
      },
      {
        title: "Pluto's Journey Begins!",
        badge: "Panel 6 of 6 • Time to Climb",
        image: "/assets/pluto/pluto-happy.svg",
        text: "Help Pluto solve each security puzzle, climb all 5 floors, and reunite with Abhishek, who is waiting anxiously on the top floor with Pluto's favorite chicken treats!",
        doodle: "❤️"
      }
    ];

    this.reunionScenes = [
      {
        title: "Master Override Disengaged!",
        badge: "Scene 1 • Partner's Office Floor 5",
        image: "/assets/doodles/rupee-doodle.svg",
        text: "CLACK! The final security lock flashes emerald green! The master override disengages across the entire Goldman Sachs tower!"
      },
      {
        title: "The Partner's Door Opens",
        badge: "Scene 2 • Golden Light",
        image: "/assets/abhishek/abhishek-happy.svg",
        text: "The heavy mahogany door swings open. Bright sunlight floods the corridor. Abhishek drops his papers and looks up in disbelief!"
      },
      {
        title: "Pluto's Victory Sprint",
        badge: "Scene 3 • Full Speed",
        image: "/assets/pluto/pluto-celebrating.svg",
        text: "Pluto spots Abhishek! His tail wags so fast it becomes a golden blur. With joyful barks echoing through the 5th floor, Pluto sprints down the hallway!"
      },
      {
        title: "The Warmest Embrace",
        badge: "Scene 4 • Reunited!",
        image: "/assets/abhishek/abhishek-reunion.svg",
        text: "Abhishek drops to his knees with happy tears, catching Pluto mid-air in a tight, warm hug. Pluto licks Abhishek's cheek with pure joy!"
      },
      {
        title: "Celebration & Chicken Treats!",
        badge: "Scene 5 • Corner Office Partner",
        image: "/assets/doodles/heart-paw-doodle.svg",
        text: "'You did it, Pluto! You're the smartest, most wonderful dog in the world!' Abhishek hands Pluto a bowl full of chicken treats and an honorary Goldman Sachs Partner badge!"
      }
    ];

    this.currentReunionIndex = 0;
    this.init();
  }

  init() {
    this.bindDOM();
    this.checkFirstVisitStory();
  }

  bindDOM() {
    // Story modal button in header
    document.getElementById('btnOpenStoryModal')?.addEventListener('click', () => {
      this.openStoryCutscene();
    });

    // Opening cutscene controls
    document.getElementById('btnStoryNext')?.addEventListener('click', () => {
      this.nextStoryScene();
    });
    document.getElementById('btnStoryPrev')?.addEventListener('click', () => {
      this.prevStoryScene();
    });
    document.getElementById('btnStorySkip')?.addEventListener('click', () => {
      this.closeStoryModal();
    });

    // Reunion cutscene controls
    document.getElementById('btnReunionNext')?.addEventListener('click', () => {
      this.nextReunionScene();
    });
    document.getElementById('btnReunionClose')?.addEventListener('click', () => {
      this.closeReunionModal();
    });
  }

  checkFirstVisitStory() {
    const seen = localStorage.getItem('pluto_story_seen_v1');
    if (!seen) {
      setTimeout(() => {
        this.openStoryCutscene();
        localStorage.setItem('pluto_story_seen_v1', 'true');
      }, 600);
    }
  }

  openStoryCutscene() {
    this.currentCutsceneIndex = 0;
    this.renderStoryScene(0);
    const modal = document.getElementById('storyCutsceneModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }

  renderStoryScene(index) {
    const scene = this.openingScenes[index];
    if (!scene) return;

    const titleEl = document.getElementById('storyCutsceneTitle');
    const badgeEl = document.getElementById('storyCutsceneBadge');
    const imgEl = document.getElementById('storyCutsceneImg');
    const textEl = document.getElementById('storyCutsceneText');
    const nextBtn = document.getElementById('btnStoryNext');
    const prevBtn = document.getElementById('btnStoryPrev');
    const dotsContainer = document.getElementById('storyCutsceneDots');

    if (titleEl) titleEl.textContent = `${scene.doodle} ${scene.title}`;
    if (badgeEl) badgeEl.textContent = scene.badge;
    if (imgEl) {
      imgEl.src = scene.image;
      imgEl.alt = scene.title;
    }
    if (textEl) textEl.textContent = scene.text;

    if (prevBtn) {
      prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
    }

    if (nextBtn) {
      if (index === this.openingScenes.length - 1) {
        nextBtn.innerHTML = '🐾 Begin Pluto\'s Journey!';
        nextBtn.className = 'btn-primary px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 font-bold';
      } else {
        nextBtn.innerHTML = 'Next →';
        nextBtn.className = 'btn-primary px-4 py-2';
      }
    }

    if (dotsContainer) {
      dotsContainer.innerHTML = this.openingScenes.map((_, i) => `
        <span class="inline-block w-2.5 h-2.5 rounded-full transition-all ${i === index ? 'bg-amber-500 w-6' : 'bg-slate-300'}"></span>
      `).join('');
    }
  }

  nextStoryScene() {
    if (this.currentCutsceneIndex < this.openingScenes.length - 1) {
      this.currentCutsceneIndex++;
      this.renderStoryScene(this.currentCutsceneIndex);
    } else {
      this.closeStoryModal();
      window.plutoCharacter?.speak("Let's do this! Floor 1 security puzzle ahead!", 3500);
    }
  }

  prevStoryScene() {
    if (this.currentCutsceneIndex > 0) {
      this.currentCutsceneIndex--;
      this.renderStoryScene(this.currentCutsceneIndex);
    }
  }

  closeStoryModal() {
    const modal = document.getElementById('storyCutsceneModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  /* ════════════════════════════════════════════════════════════════
   * GRAND REUNION CUTSCENE
   * ════════════════════════════════════════════════════════════════ */
  triggerGrandReunion() {
    this.currentReunionIndex = 0;
    this.renderReunionScene(0);
    const modal = document.getElementById('grandReunionModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    if (window.plutoCharacter) {
      window.plutoCharacter.reactToReunion();
    }
  }

  renderReunionScene(index) {
    const scene = this.reunionScenes[index];
    if (!scene) return;

    const titleEl = document.getElementById('reunionSceneTitle');
    const badgeEl = document.getElementById('reunionSceneBadge');
    const imgEl = document.getElementById('reunionSceneImg');
    const textEl = document.getElementById('reunionSceneText');
    const nextBtn = document.getElementById('btnReunionNext');
    const closeBtn = document.getElementById('btnReunionClose');

    if (titleEl) titleEl.textContent = scene.title;
    if (badgeEl) badgeEl.textContent = scene.badge;
    if (imgEl) {
      imgEl.src = scene.image;
      imgEl.alt = scene.title;
    }
    if (textEl) textEl.textContent = scene.text;

    if (index === this.reunionScenes.length - 1) {
      if (nextBtn) nextBtn.classList.add('hidden');
      if (closeBtn) closeBtn.classList.remove('hidden');
    } else {
      if (nextBtn) nextBtn.classList.remove('hidden');
      if (closeBtn) closeBtn.classList.add('hidden');
    }
  }

  nextReunionScene() {
    if (this.currentReunionIndex < this.reunionScenes.length - 1) {
      this.currentReunionIndex++;
      this.renderReunionScene(this.currentReunionIndex);
    }
  }

  closeReunionModal() {
    const modal = document.getElementById('grandReunionModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  /* ════════════════════════════════════════════════════════════════
   * DISTANCE & ELEVATOR PAW TRACKER
   * ════════════════════════════════════════════════════════════════ */
  updateDistance(currentRoomId, clearedRoomsCount = 0) {
    const totalRooms = 15;
    const progressPercent = Math.min(100, Math.round((clearedRoomsCount / totalRooms) * 100));
    const floor = parseInt(currentRoomId.split('.')[0], 10) || 1;

    // Header distance label
    const headerDistLabel = document.getElementById('headerDistanceToAbhishek');
    if (headerDistLabel) {
      const floorsLeft = Math.max(0, 5 - floor);
      if (floorsLeft === 0) {
        headerDistLabel.innerHTML = '❤️ <strong>Floor 5 Reached!</strong> Partner\'s Office!';
      } else {
        headerDistLabel.innerHTML = `🐾 <strong>Floor ${floor}/5</strong> • ${floorsLeft} ${floorsLeft === 1 ? 'floor' : 'floors'} to Abhishek!`;
      }
    }

    // Elevator progress bar
    const bar = document.getElementById('elevatorProgressBar');
    if (bar) {
      bar.style.width = `${progressPercent}%`;
    }

    // Update floor steps in widget
    const floorSteps = document.querySelectorAll('.floor-step-item');
    floorSteps.forEach(item => {
      const itemFloor = parseInt(item.getAttribute('data-floor'), 10);
      item.classList.toggle('floor-cleared', itemFloor < floor);
      item.classList.toggle('floor-active', itemFloor === floor);
    });
  }
}

// Attach to window
window.NarrativeManager = NarrativeManager;
