/**
 * Pluto Character Controller
 * Controls Pluto's emotional states, animations, speech bubbles, sound effects, and interactivity.
 */

class PlutoCharacter {
  constructor() {
    this.element = null;
    this.sprite = null;
    this.speechBubble = null;
    this.speechText = null;
    this.currentState = 'sitting';
    this.dialogues = null;
    this.audioContext = null;
    this.speechTimeout = null;
    this.idleInterval = null;

    this.init();
  }

  async init() {
    this.bindDOM();
    await this.loadDialogues();
    this.setState('sitting');
    this.startIdleChatter();
  }

  bindDOM() {
    this.element = document.getElementById('plutoCharacter');
    if (!this.element) {
      console.warn('plutoCharacter element not found in DOM');
      return;
    }

    this.sprite = this.element.querySelector('.pluto-sprite-container');
    this.speechBubble = document.getElementById('plutoSpeechBubble');
    this.speechText = document.getElementById('plutoSpeechText');

    // Click Pluto for happy reaction and bark
    this.element.addEventListener('click', () => {
      this.playBarkSound('happy');
      this.setState('happy');
      this.speakRandomDialogue('idle', 3500);
      setTimeout(() => {
        if (this.currentState === 'happy') this.setState('sitting');
      }, 3500);
    });
  }

  async loadDialogues() {
    try {
      const res = await fetch('/data/pluto-dialogues.json');
      if (res.ok) {
        this.dialogues = await res.json();
      }
    } catch (e) {
      console.warn('Failed to load pluto-dialogues.json, using fallback', e);
      this.dialogues = {
        idle: ["Woof! Abhishek is waiting on Floor 5!", "I remember this from our study sessions!"],
        thinking: ["Hmm... let me tilt my head and think!", "What would Abhishek say?"],
        correct: ["WOOF! We did it! Abhishek would be so proud! 🐾", "Tail wagging at max speed!"],
        wrong: ["Whimper... it's okay! We learn from every attempt!", "Abhishek says review helps master it!"],
        hint: ["Sniffing out a helpful study tip from Abhishek!"],
        streak: ["On fire! Look at your boy, Abhishek! 🔥🐾"],
        levelUp: ["Floor cleared! Up the stairs we go! 🏃‍♂️🐾"],
        reunion: ["ABHISHEK!! I FOUND YOU!! WOOF WOOF! ❤️🐕"]
      };
    }
  }

  setState(newState) {
    if (!this.element) return;
    this.currentState = newState;
    this.element.setAttribute('data-state', newState);

    const spriteImg = this.element.querySelector('#plutoSpriteImg');
    if (spriteImg) {
      // Map state to SVG asset
      const validAssets = ['sitting', 'happy', 'thinking', 'sad', 'celebrating'];
      const assetState = validAssets.includes(newState) ? newState : (newState === 'excited' ? 'happy' : 'sitting');
      spriteImg.src = `/assets/pluto/pluto-${assetState}.svg`;
      spriteImg.alt = `Pluto the Labrador (${newState})`;
    }

    // Trigger state class on container while preserving container layout
    this.element.className = `pluto-character-container pluto-companion pluto-${newState}`;
  }

  speak(message, duration = 4000) {
    if (!this.speechBubble || !this.speechText) return;

    if (this.speechTimeout) {
      clearTimeout(this.speechTimeout);
    }

    this.speechText.textContent = message;
    this.speechBubble.classList.remove('hidden');
    this.speechBubble.classList.add('visible');

    this.speechTimeout = setTimeout(() => {
      this.speechBubble.classList.remove('visible');
      setTimeout(() => this.speechBubble.classList.add('hidden'), 300);
    }, duration);
  }

  speakRandomDialogue(category, duration = 4000) {
    if (!this.dialogues || !this.dialogues[category] || this.dialogues[category].length === 0) return;
    const list = this.dialogues[category];
    const phrase = list[Math.floor(Math.random() * list.length)];
    this.speak(phrase, duration);
  }

  reactToAnswer(isCorrect, streak = 0) {
    if (isCorrect) {
      this.playBarkSound('happy');
      if (streak >= 5) {
        this.setState('celebrating');
        this.speakRandomDialogue('streak', 4000);
      } else {
        this.setState('happy');
        this.speakRandomDialogue('correct', 3500);
      }
      setTimeout(() => {
        if (this.currentState === 'happy' || this.currentState === 'celebrating') {
          this.setState('sitting');
        }
      }, 3500);
    } else {
      this.playWhimperSound();
      this.setState('sad');
      this.speakRandomDialogue('wrong', 4000);
      setTimeout(() => {
        if (this.currentState === 'sad') {
          this.setState('thinking');
        }
      }, 4000);
    }
  }

  reactToHint() {
    this.playCollarJingleSound();
    this.setState('thinking');
    this.speakRandomDialogue('hint', 3500);
  }

  reactToThinking() {
    this.setState('thinking');
    this.speakRandomDialogue('thinking', 3000);
  }

  celebrateFloorCleared(floor) {
    this.playBarkSound('excited');
    this.setState('celebrating');
    this.speak(`Floor ${floor} cleared! Running to the stairs! Abhishek, I'm coming! 🐾`, 4500);
    setTimeout(() => this.setState('sitting'), 4500);
  }

  reactToReunion() {
    this.playBarkSound('excited');
    this.setState('celebrating');
    this.speak("ABHISHEK!! I FOUND YOU!! WOOF WOOF! ❤️🐕", 6000);
  }

  startIdleChatter() {
    if (this.idleInterval) clearInterval(this.idleInterval);
    this.idleInterval = setInterval(() => {
      // 25% chance of idle dialogue every 40 seconds if not hidden
      if (Math.random() < 0.35 && this.currentState === 'sitting') {
        this.playCollarJingleSound();
        this.speakRandomDialogue('idle', 3500);
      }
    }, 45000);
  }

  /* ════════════════════════════════════════════════════════════════
   * PROCEDURAL SOUND SYNTHESIS (Zero network audio dependency)
   * ════════════════════════════════════════════════════════════════ */
  initAudio() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  playBarkSound(type = 'happy') {
    try {
      this.initAudio();
      if (!this.audioContext) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Two quick pitched formant bursts simulating a friendly Labrador woof
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(type === 'excited' ? 620 : 540, now);
      filter.Q.setValueAtTime(3.0, now);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.18);

      // Second soft echo woof
      if (type === 'excited') {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(320, now + 0.12);
        osc2.frequency.exponentialRampToValueAtTime(180, now + 0.24);

        gain2.gain.setValueAtTime(0.01, now + 0.12);
        gain2.gain.linearRampToValueAtTime(0.2, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(ctx.destination);

        osc2.start(now + 0.12);
        osc2.stop(now + 0.28);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }

  playWhimperSound() {
    try {
      this.initAudio();
      if (!this.audioContext) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.linearRampToValueAtTime(460, now + 0.25);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch (e) {}
  }

  playCollarJingleSound() {
    try {
      this.initAudio();
      if (!this.audioContext) return;
      const ctx = this.audioContext;
      const now = ctx.currentTime;

      [2400, 3100, 3800].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.04);
        gain.gain.setValueAtTime(0.04, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.1);
      });
    } catch (e) {}
  }
}

// Attach to window
window.PlutoCharacter = PlutoCharacter;
