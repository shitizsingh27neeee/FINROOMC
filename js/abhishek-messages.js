/**
 * Abhishek Message System
 * Manages heartwarming polaroid message cards sent by Abhishek from Floor 5
 */

class AbhishekMessageSystem {
  constructor() {
    this.messages = {};
    this.modalEl = null;
    this.speechUtterance = null;
    this.voiceEnabled = true;
    this.init();
  }

  async init() {
    this.bindDOM();
    await this.loadMessages();
  }

  bindDOM() {
    this.modalEl = document.getElementById('abhishekMessageModal');
    if (!this.modalEl) return;

    // Close button
    document.getElementById('btnCloseAbhishekMessage')?.addEventListener('click', () => {
      this.dismissMessage();
    });

    // Voice toggle
    document.getElementById('btnToggleVoiceMessage')?.addEventListener('click', () => {
      this.toggleVoice();
    });
  }

  async loadMessages() {
    try {
      const res = await fetch('/data/abhishek-messages.json');
      if (res.ok) {
        this.messages = await res.json();
      }
    } catch (e) {
      console.warn('Failed to load abhishek-messages.json', e);
    }
  }

  showMessage(roomId, onContinue) {
    const message = this.messages[roomId];
    if (!message) {
      if (onContinue) onContinue();
      return;
    }

    const modal = document.getElementById('abhishekMessageModal');
    if (!modal) {
      if (onContinue) onContinue();
      return;
    }

    // Populate data
    const titleEl = document.getElementById('abhishekMsgRoomTitle');
    const timeEl = document.getElementById('abhishekMsgTime');
    const bodyEl = document.getElementById('abhishekMsgBody');
    const sigEl = document.getElementById('abhishekMsgSig');
    const badgeEl = document.getElementById('abhishekMsgFloorBadge');
    const encourEl = document.getElementById('abhishekMsgEncouragement');

    if (titleEl) titleEl.textContent = `Security Door ${message.roomId} Unlocked!`;
    if (timeEl) timeEl.textContent = message.timeAgo || 'Just now';
    if (bodyEl) bodyEl.textContent = message.text;
    if (sigEl) sigEl.textContent = message.signature || '- Abhishek ❤️';
    if (badgeEl) badgeEl.textContent = message.floorName || `Floor ${message.floor}`;
    if (encourEl) encourEl.textContent = message.encouragement || "Keep going, Pluto!";

    // Continue action
    const continueBtn = document.getElementById('btnContinueFromAbhishek');
    if (continueBtn) {
      // Clean previous listener
      const newBtn = continueBtn.cloneNode(true);
      continueBtn.parentNode.replaceChild(newBtn, continueBtn);
      newBtn.addEventListener('click', () => {
        this.dismissMessage();
        if (onContinue) onContinue();
      });
    }

    // Open modal
    modal.classList.remove('hidden');
    modal.classList.add('flex');

    // Trigger Speech Synthesis if supported
    if (this.voiceEnabled && 'speechSynthesis' in window) {
      this.speakMessage(message.text);
    }
  }

  speakMessage(text) {
    try {
      window.speechSynthesis.cancel(); // Stop any pending
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;

      // Prefer Indian English voice if available
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang === 'en-IN' || v.name.includes('India'));
      if (indianVoice) utterance.voice = indianVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      // SpeechSynthesis policy catch
    }
  }

  toggleVoice() {
    this.voiceEnabled = !this.voiceEnabled;
    const btn = document.getElementById('btnToggleVoiceMessage');
    if (btn) {
      btn.textContent = this.voiceEnabled ? '🔊 Voice: ON' : '🔇 Voice: OFF';
    }
    if (!this.voiceEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  dismissMessage() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    const modal = document.getElementById('abhishekMessageModal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
}

// Attach to window
window.AbhishekMessageSystem = AbhishekMessageSystem;
