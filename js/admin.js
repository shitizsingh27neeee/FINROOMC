/**
 * Admin / Content Management System Controller
 * Handles Question CRUD, Import/Export Wizard, Analytics, and AI Enhancements
 */

class AdminController {
  constructor() {
    this.questionRepo = new window.QuestionRepository();
    this.progressManager = new window.ProgressManager();
    this.aiHandler = new window.AIHandler();
    this.currentPage = 1;
    this.pageSize = 10;
    this.selectedQuestionIds = new Set();
    this.editingQuestionId = null;
    this.filterLevel = 'all';
    this.filterRoom = 'all';
    this.filterDifficulty = 'all';
    this.searchQuery = '';
    this.importedStaging = [];
    this.isAuthenticated = false;
  }

  async init() {
    await this.questionRepo.init();
    this.checkAuth();
    this.bindEvents();
    this.renderAll();
  }

  checkAuth() {
    const authed = sessionStorage.getItem('fer_admin_authenticated');
    if (authed === 'true') {
      this.isAuthenticated = true;
      document.getElementById('adminAuthGate')?.classList.add('hidden');
      document.getElementById('adminMainApp')?.classList.remove('hidden');
    } else {
      this.isAuthenticated = false;
      document.getElementById('adminAuthGate')?.classList.remove('hidden');
      document.getElementById('adminMainApp')?.classList.add('hidden');
    }
  }

  login(password) {
    const defaultPass = window.CONFIG?.DEFAULT_ADMIN_PASS || 'finance123';
    const storedPass = localStorage.getItem(window.CONFIG?.STORAGE_KEYS?.ADMIN_PASS) || defaultPass;

    if (password === storedPass) {
      sessionStorage.setItem('fer_admin_authenticated', 'true');
      this.isAuthenticated = true;
      this.checkAuth();
      this.renderAll();
      return true;
    }
    return false;
  }

  logout() {
    sessionStorage.removeItem('fer_admin_authenticated');
    this.isAuthenticated = false;
    this.checkAuth();
  }

  bindEvents() {
    // Login form
    document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const passInput = document.getElementById('adminPasswordInput');
      const errEl = document.getElementById('adminLoginError');
      if (this.login(passInput.value)) {
        if (errEl) errEl.classList.add('hidden');
        passInput.value = '';
      } else {
        if (errEl) {
          errEl.textContent = 'Incorrect password. Default is "finance123".';
          errEl.classList.remove('hidden');
        }
      }
    });

    // Logout
    document.getElementById('btnAdminLogout')?.addEventListener('click', () => {
      this.logout();
    });

    // Nav tabs
    document.querySelectorAll('.admin-nav-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetView = tab.getAttribute('data-view');
        this.switchView(targetView);
      });
    });

    // Search and Filters
    document.getElementById('filterSearch')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.currentPage = 1;
      this.renderQuestionsTable();
    });

    document.getElementById('filterLevel')?.addEventListener('change', (e) => {
      this.filterLevel = e.target.value;
      this.currentPage = 1;
      this.populateRoomFilterOptions();
      this.renderQuestionsTable();
    });

    document.getElementById('filterRoom')?.addEventListener('change', (e) => {
      this.filterRoom = e.target.value;
      this.currentPage = 1;
      this.renderQuestionsTable();
    });

    document.getElementById('filterDifficulty')?.addEventListener('change', (e) => {
      this.filterDifficulty = e.target.value;
      this.currentPage = 1;
      this.renderQuestionsTable();
    });

    // Question Modal (Add / Edit)
    document.getElementById('btnOpenAddModal')?.addEventListener('click', () => {
      this.openEditModal(null);
    });

    document.getElementById('btnCloseEditModal')?.addEventListener('click', () => {
      this.closeEditModal();
    });

    document.getElementById('btnCancelEditModal')?.addEventListener('click', () => {
      this.closeEditModal();
    });

    document.getElementById('formQuestionEditor')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveQuestionForm();
    });

    // AI Form Enhancers
    document.getElementById('btnAiEnhanceExplanation')?.addEventListener('click', async () => {
      await this.handleAiEnhanceExplanation();
    });

    document.getElementById('btnAiGenerateTip')?.addEventListener('click', async () => {
      await this.handleAiGenerateTip();
    });

    // Form dynamic live preview
    ['qInputQuestion', 'qInputOption0', 'qInputOption1', 'qInputOption2', 'qInputOption3', 'qInputExplanation', 'qInputExample', 'qInputTip'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => this.updateFormLivePreview());
    });
    document.querySelectorAll('input[name="qCorrectAnswer"]').forEach(radio => {
      radio.addEventListener('change', () => this.updateFormLivePreview());
    });

    // Bulk actions
    document.getElementById('selectAllQuestions')?.addEventListener('change', (e) => {
      const checked = e.target.checked;
      const visible = this.getFilteredQuestions();
      if (checked) {
        visible.forEach(q => this.selectedQuestionIds.add(q.id));
      } else {
        this.selectedQuestionIds.clear();
      }
      this.renderQuestionsTable();
    });

    document.getElementById('btnBulkExportCsv')?.addEventListener('click', () => {
      this.exportQuestions('csv', true);
    });

    document.getElementById('btnBulkDelete')?.addEventListener('click', () => {
      this.bulkDeleteSelected();
    });

    // Import / Export Wizard
    document.getElementById('btnDownloadCsvTemplate')?.addEventListener('click', () => {
      this.downloadCsvTemplate();
    });

    document.getElementById('btnExportAllCsv')?.addEventListener('click', () => {
      this.exportQuestions('csv', false);
    });

    document.getElementById('btnExportAllJson')?.addEventListener('click', () => {
      this.exportQuestions('json', false);
    });

    const dropZone = document.getElementById('csvDropZone');
    const fileInput = document.getElementById('csvFileInput');

    dropZone?.addEventListener('click', () => fileInput.click());
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-primary');
    });
    dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('border-primary'));
    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-primary');
      if (e.dataTransfer.files.length) {
        this.processUploadedFile(e.dataTransfer.files[0]);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.processUploadedFile(e.target.files[0]);
      }
    });

    document.getElementById('btnExecuteImport')?.addEventListener('click', () => {
      this.executeImportStaged();
    });

    // Reset Defaults
    document.getElementById('btnResetAllData')?.addEventListener('click', () => {
      if (confirm('Warning: This will remove all custom added questions and clear user progress. Are you sure?')) {
        localStorage.removeItem(window.CONFIG.STORAGE_KEYS.CUSTOM_QUESTIONS);
        this.progressManager.reset();
        this.questionRepo.refreshAll();
        this.renderAll();
        alert('All local custom data has been reset to system defaults.');
      }
    });
  }

  switchView(viewName) {
    document.querySelectorAll('.admin-nav-tab').forEach(t => {
      const active = t.getAttribute('data-view') === viewName;
      t.classList.toggle('active', active);
    });

    document.querySelectorAll('.admin-view-panel').forEach(panel => {
      panel.classList.toggle('hidden', panel.getAttribute('data-view') !== viewName);
    });

    if (viewName === 'analytics') {
      this.renderAnalytics();
    }
  }

  renderAll() {
    this.renderStatsCards();
    this.populateRoomFilterOptions();
    this.renderQuestionsTable();
  }

  renderStatsCards() {
    const all = this.questionRepo.getAll();
    const custom = all.filter(q => q.custom);
    const progress = this.progressManager.getProgress();
    const history = Object.values(progress.questionHistory || {});
    const totalAttempts = history.reduce((sum, h) => sum + (h.attempts || 0), 0);
    const totalCorrect = history.reduce((sum, h) => sum + (h.correct || 0), 0);
    const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

    const elTotal = document.getElementById('statTotalQuestions');
    const elCustom = document.getElementById('statCustomQuestions');
    const elAttempts = document.getElementById('statTotalAttempts');
    const elAccuracy = document.getElementById('statGlobalAccuracy');

    if (elTotal) elTotal.textContent = all.length;
    if (elCustom) elCustom.textContent = custom.length;
    if (elAttempts) elAttempts.textContent = totalAttempts;
    if (elAccuracy) elAccuracy.textContent = `${accuracy}%`;
  }

  populateRoomFilterOptions() {
    const roomSelect = document.getElementById('filterRoom');
    if (!roomSelect) return;
    const currentVal = roomSelect.value;
    const all = this.questionRepo.getAll();

    let rooms = Array.from(new Set(all.map(q => q.room))).filter(Boolean).sort();
    if (this.filterLevel !== 'all') {
      rooms = rooms.filter(r => r.startsWith(`${this.filterLevel}.`));
    }

    roomSelect.innerHTML = '<option value="all">All Rooms</option>' +
      rooms.map(r => `<option value="${r}" ${r === currentVal ? 'selected' : ''}>Room ${r}</option>`).join('');
  }

  getFilteredQuestions() {
    let list = this.questionRepo.getAll();

    if (this.filterLevel !== 'all') {
      list = list.filter(q => Number(q.level) === Number(this.filterLevel));
    }

    if (this.filterRoom !== 'all') {
      list = list.filter(q => q.room === this.filterRoom);
    }

    if (this.filterDifficulty !== 'all') {
      list = list.filter(q => q.difficulty === this.filterDifficulty);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      list = list.filter(item => {
        return (item.question || '').toLowerCase().includes(q) ||
               (item.topic || '').toLowerCase().includes(q) ||
               (item.company || '').toLowerCase().includes(q);
      });
    }

    return list;
  }

  renderQuestionsTable() {
    const container = document.getElementById('questionsTableBody');
    const filtered = this.getFilteredQuestions();
    const totalCountEl = document.getElementById('filteredQuestionsCount');
    if (totalCountEl) totalCountEl.textContent = `${filtered.length} questions found`;

    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;

    const startIdx = (this.currentPage - 1) * this.pageSize;
    const paged = filtered.slice(startIdx, startIdx + this.pageSize);

    if (paged.length === 0) {
      container.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-secondary">
            No questions match your filter criteria. Click <strong>Add Question</strong> or adjust filters.
          </td>
        </tr>
      `;
      this.renderPagination(1, 1);
      return;
    }

    container.innerHTML = paged.map(q => {
      const isSelected = this.selectedQuestionIds.has(q.id);
      const badgeClass = q.difficulty === 'easy' ? 'badge-easy' : q.difficulty === 'medium' ? 'badge-medium' : 'badge-hard';
      const sourceBadge = q.custom ? '<span class="pill-custom">Custom</span>' : '<span class="pill-default">Default</span>';

      return `
        <tr class="table-row ${isSelected ? 'row-selected' : ''}">
          <td class="text-center">
            <input type="checkbox" class="question-row-checkbox" data-id="${q.id}" ${isSelected ? 'checked' : ''} />
          </td>
          <td>
            <div class="font-bold">Room ${q.room}</div>
            <div class="text-xs text-secondary">Level ${q.level}</div>
          </td>
          <td>
            <div class="font-medium text-navy line-clamp-2">${this.escapeHtml(q.question)}</div>
            <div class="text-xs text-secondary flex gap-2 mt-1">
              <span>🏢 ${this.escapeHtml(q.company || 'Corporate')}</span>
              <span>•</span>
              <span>🏷️ ${this.escapeHtml(q.topic || 'Finance')}</span>
            </div>
          </td>
          <td>
            <span class="badge ${badgeClass}">${q.difficulty?.toUpperCase()}</span>
          </td>
          <td>${sourceBadge}</td>
          <td>
            <div class="text-sm font-semibold">${q.options?.length || 4} opts</div>
            <div class="text-xs text-success font-medium">✓ Ans: ${this.escapeHtml(q.options?.[q.correctAnswer] || 'N/A')}</div>
          </td>
          <td class="text-right whitespace-nowrap">
            <button class="btn-sm btn-outline btn-edit-q" data-id="${q.id}">Edit</button>
            <button class="btn-sm btn-danger btn-delete-q" data-id="${q.id}" ${q.custom ? '' : 'title="Default questions can be hidden or cloned"'}>Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row controls
    container.querySelectorAll('.question-row-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = cb.getAttribute('data-id');
        if (e.target.checked) {
          this.selectedQuestionIds.add(id);
        } else {
          this.selectedQuestionIds.delete(id);
        }
        this.updateBulkActionToolbar();
      });
    });

    container.querySelectorAll('.btn-edit-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openEditModal(id);
      });
    });

    container.querySelectorAll('.btn-delete-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.deleteQuestion(id);
      });
    });

    this.renderPagination(this.currentPage, totalPages);
    this.updateBulkActionToolbar();
  }

  renderPagination(current, total) {
    const pContainer = document.getElementById('tablePagination');
    if (!pContainer) return;

    let html = `
      <button class="btn-pagination" id="btnPrevPage" ${current === 1 ? 'disabled' : ''}>← Previous</button>
      <span class="pagination-info">Page ${current} of ${total}</span>
      <button class="btn-pagination" id="btnNextPage" ${current === total ? 'disabled' : ''}>Next →</button>
    `;
    pContainer.innerHTML = html;

    document.getElementById('btnPrevPage')?.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderQuestionsTable();
      }
    });

    document.getElementById('btnNextPage')?.addEventListener('click', () => {
      if (this.currentPage < total) {
        this.currentPage++;
        this.renderQuestionsTable();
      }
    });
  }

  updateBulkActionToolbar() {
    const count = this.selectedQuestionIds.size;
    const toolbar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('selectedCountLabel');
    if (toolbar) {
      toolbar.classList.toggle('hidden', count === 0);
    }
    if (countEl) {
      countEl.textContent = `${count} selected`;
    }
  }

  openEditModal(questionId) {
    this.editingQuestionId = questionId;
    const modal = document.getElementById('questionEditModal');
    const titleEl = document.getElementById('modalEditTitle');

    if (questionId) {
      const q = this.questionRepo.getById(questionId);
      if (!q) return;
      if (titleEl) titleEl.textContent = `Edit Question (${q.room})`;
      this.populateFormFields(q);
    } else {
      if (titleEl) titleEl.textContent = 'Add New Finance Question';
      this.populateFormFields({
        level: this.filterLevel !== 'all' ? parseInt(this.filterLevel, 10) : 1,
        room: this.filterRoom !== 'all' ? this.filterRoom : '1.1',
        topic: 'Financial Accounting',
        difficulty: 'medium',
        company: 'Reliance Industries',
        sector: 'Conglomerate',
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        example: '',
        interviewTip: '',
        tags: []
      });
    }

    this.updateFormLivePreview();
    modal?.classList.remove('hidden');
  }

  closeEditModal() {
    document.getElementById('questionEditModal')?.classList.add('hidden');
    this.editingQuestionId = null;
  }

  populateFormFields(q) {
    document.getElementById('qInputLevel').value = q.level || 1;
    document.getElementById('qInputRoom').value = q.room || '1.1';
    document.getElementById('qInputTopic').value = q.topic || '';
    document.getElementById('qInputDifficulty').value = q.difficulty || 'medium';
    document.getElementById('qInputCompany').value = q.company || '';
    document.getElementById('qInputSector').value = q.sector || '';
    document.getElementById('qInputQuestion').value = q.question || '';

    const opts = q.options || ['', '', '', ''];
    document.getElementById('qInputOption0').value = opts[0] || '';
    document.getElementById('qInputOption1').value = opts[1] || '';
    document.getElementById('qInputOption2').value = opts[2] || '';
    document.getElementById('qInputOption3').value = opts[3] || '';

    const correct = q.correctAnswer ?? 0;
    const radio = document.querySelector(`input[name="qCorrectAnswer"][value="${correct}"]`);
    if (radio) radio.checked = true;

    document.getElementById('qInputExplanation').value = q.explanation || '';
    document.getElementById('qInputExample').value = q.example || '';
    document.getElementById('qInputTip').value = q.interviewTip || '';
    document.getElementById('qInputTags').value = Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || '');
  }

  updateFormLivePreview() {
    const qText = document.getElementById('qInputQuestion')?.value || 'Your finance question preview will appear here...';
    const comp = document.getElementById('qInputCompany')?.value || 'Indian Enterprise';
    const topic = document.getElementById('qInputTopic')?.value || 'Finance Concept';

    const pQ = document.getElementById('previewQuestionText');
    const pMeta = document.getElementById('previewMetaText');
    if (pQ) pQ.textContent = qText;
    if (pMeta) pMeta.textContent = `${comp} • ${topic}`;

    const correctRadio = document.querySelector('input[name="qCorrectAnswer"]:checked');
    const correctIdx = correctRadio ? parseInt(correctRadio.value, 10) : 0;

    for (let i = 0; i < 4; i++) {
      const optVal = document.getElementById(`qInputOption${i}`)?.value || `Option ${String.fromCharCode(65 + i)}`;
      const pOpt = document.getElementById(`previewOpt${i}`);
      if (pOpt) {
        pOpt.textContent = optVal;
        pOpt.classList.toggle('preview-correct', i === correctIdx);
      }
    }
  }

  saveQuestionForm() {
    const level = parseInt(document.getElementById('qInputLevel').value, 10) || 1;
    const room = document.getElementById('qInputRoom').value.trim() || '1.1';
    const topic = document.getElementById('qInputTopic').value.trim() || 'General Finance';
    const difficulty = document.getElementById('qInputDifficulty').value;
    const company = document.getElementById('qInputCompany').value.trim() || 'Indian Enterprise';
    const sector = document.getElementById('qInputSector').value.trim() || 'General';
    const question = document.getElementById('qInputQuestion').value.trim();

    const opt0 = document.getElementById('qInputOption0').value.trim();
    const opt1 = document.getElementById('qInputOption1').value.trim();
    const opt2 = document.getElementById('qInputOption2').value.trim();
    const opt3 = document.getElementById('qInputOption3').value.trim();
    const options = [opt0, opt1, opt2, opt3].filter(Boolean);

    if (!question || question.length < 5) {
      alert('Please provide a complete finance interview question prompt.');
      return;
    }

    if (options.length < 2) {
      alert('Please fill in at least Option A and Option B.');
      return;
    }

    const correctRadio = document.querySelector('input[name="qCorrectAnswer"]:checked');
    let correctAnswer = correctRadio ? parseInt(correctRadio.value, 10) : 0;
    if (correctAnswer >= options.length) correctAnswer = 0;

    const explanation = document.getElementById('qInputExplanation').value.trim();
    const example = document.getElementById('qInputExample').value.trim();
    const interviewTip = document.getElementById('qInputTip').value.trim();
    const tagsRaw = document.getElementById('qInputTags').value;
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

    const questionData = {
      id: this.editingQuestionId || `q_custom_${Date.now()}`,
      level,
      room,
      roomName: `Room ${room}`,
      topic,
      difficulty,
      type: 'multiple_choice',
      company,
      sector,
      question,
      options,
      correctAnswer,
      explanation,
      example,
      interviewTip,
      tags
    };

    this.questionRepo.addOrUpdateCustomQuestion(questionData);
    this.closeEditModal();
    this.renderAll();
  }

  deleteQuestion(questionId) {
    const q = this.questionRepo.getById(questionId);
    if (!q) return;

    if (confirm(`Are you sure you want to delete or hide "${q.question.slice(0, 50)}..."?`)) {
      if (q.custom) {
        this.questionRepo.deleteCustomQuestion(questionId);
      } else {
        // If default question, hide it by setting published = false in custom overlay
        this.questionRepo.addOrUpdateCustomQuestion({
          ...q,
          metadata: { ...q.metadata, published: false }
        });
      }
      this.selectedQuestionIds.delete(questionId);
      this.renderAll();
    }
  }

  bulkDeleteSelected() {
    const count = this.selectedQuestionIds.size;
    if (count === 0) return;

    if (confirm(`Are you sure you want to delete/hide all ${count} selected questions?`)) {
      this.selectedQuestionIds.forEach(id => {
        const q = this.questionRepo.getById(id);
        if (q?.custom) {
          this.questionRepo.deleteCustomQuestion(id);
        } else if (q) {
          this.questionRepo.addOrUpdateCustomQuestion({
            ...q,
            metadata: { ...q.metadata, published: false }
          });
        }
      });
      this.selectedQuestionIds.clear();
      this.renderAll();
    }
  }

  async handleAiEnhanceExplanation() {
    const btn = document.getElementById('btnAiEnhanceExplanation');
    const explInput = document.getElementById('qInputExplanation');
    const qText = document.getElementById('qInputQuestion').value;
    const topic = document.getElementById('qInputTopic').value;

    if (!qText) {
      alert('Please enter a question prompt first.');
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Enhancing with AI...';
    btn.disabled = true;

    try {
      const prompt = `As a senior Indian investment banker, improve this explanation for an MBA candidate:
Question: "${qText}"
Topic: ${topic}
Current Explanation: "${explInput.value}"

Write a crystal-clear pedagogical explanation (under 120 words) with the exact formula and calculation logic.`;

      const enhanced = await this.aiHandler.generate(prompt, 0.7);
      if (enhanced) {
        explInput.value = enhanced.trim();
        this.updateFormLivePreview();
      } else {
        alert('AI enhancement unavailable or no API key configured. You can edit the explanation manually.');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  async handleAiGenerateTip() {
    const btn = document.getElementById('btnAiGenerateTip');
    const tipInput = document.getElementById('qInputTip');
    const qText = document.getElementById('qInputQuestion').value;
    const topic = document.getElementById('qInputTopic').value;

    if (!qText) {
      alert('Please enter a question prompt first.');
      return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Generating Tip...';
    btn.disabled = true;

    try {
      const tip = await this.aiHandler.generateInterviewTip(topic, qText);
      if (tip) {
        tipInput.value = tip.trim();
      } else {
        alert('AI tip unavailable or no API key configured.');
      }
    } catch (e) {
      console.warn(e);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  // Import / Export
  downloadCsvTemplate() {
    fetch('/data/templates/question-template.csv')
      .then(res => res.text())
      .then(csv => {
        window.ImportExportManager.triggerDownload('finance_question_template.csv', csv, 'text/csv');
      })
      .catch(() => {
        const fallback = 'Level,Room,Topic,Difficulty,Type,Company,Question,OptionA,OptionB,OptionC,OptionD,Correct,Explanation,Example,InterviewTip\n1,1.1,Balance Sheet,easy,multiple_choice,Reliance,Which statement is snapshot?,P&L,Balance Sheet,Cash Flow,None,1,Snapshot point in time,Reliance assets,Photo vs Video\n';
        window.ImportExportManager.triggerDownload('finance_question_template.csv', fallback, 'text/csv');
      });
  }

  exportQuestions(format = 'csv', onlySelected = false) {
    let list = this.questionRepo.getAll();
    if (onlySelected && this.selectedQuestionIds.size > 0) {
      list = list.filter(q => this.selectedQuestionIds.has(q.id));
    }

    if (format === 'csv') {
      const csvData = window.ImportExportManager.exportToCSV(list);
      window.ImportExportManager.triggerDownload(`finance_escape_room_export_${Date.now()}.csv`, csvData, 'text/csv');
    } else {
      const jsonData = JSON.stringify(list, null, 2);
      window.ImportExportManager.triggerDownload(`finance_escape_room_export_${Date.now()}.json`, jsonData, 'application/json');
    }
  }

  processUploadedFile(file) {
    const statusEl = document.getElementById('importValidationStatus');
    const previewContainer = document.getElementById('importPreviewContainer');
    const btnExecute = document.getElementById('btnExecuteImport');

    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      alert('Please upload a valid .csv or .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            this.importedStaging = parsed;
            statusEl.innerHTML = `<span class="text-success font-bold">✓ Validated ${parsed.length} questions from JSON</span>`;
            btnExecute.classList.remove('hidden');
          }
        } catch (err) {
          statusEl.innerHTML = `<span class="text-error font-bold">❌ Invalid JSON syntax</span>`;
        }
      } else {
        // CSV
        const parsedRows = window.ImportExportManager.parseCSV(content);
        const { validQuestions, errors } = window.ImportExportManager.validateAndMapQuestions(parsedRows);

        this.importedStaging = validQuestions;
        let html = '';
        if (errors.length > 0) {
          html += `<div class="p-3 bg-red-50 border border-red-200 rounded mb-2 text-error text-sm">
            <strong>Found ${errors.length} rows with errors:</strong><br>
            ${errors.slice(0, 3).map(err => `Row ${err.rowNumber}: ${err.errors.join(', ')}`).join('<br>')}
            ${errors.length > 3 ? `<br>...and ${errors.length - 3} more` : ''}
          </div>`;
        }

        html += `<div class="text-success font-bold">✓ ${validQuestions.length} valid questions ready for import.</div>`;
        statusEl.innerHTML = html;

        if (validQuestions.length > 0) {
          btnExecute.classList.remove('hidden');
          // Show preview of first 3 questions
          previewContainer.innerHTML = validQuestions.slice(0, 3).map(q => `
            <div class="p-3 bg-white border border-gray-200 rounded my-2 text-left text-sm">
              <span class="font-bold text-navy">Room ${q.room} [${q.difficulty}]</span>: ${this.escapeHtml(q.question)}
              <div class="text-xs text-secondary mt-1">Options: ${q.options.map((o, idx) => `${idx === q.correctAnswer ? '<b>✓ ' : ''}${this.escapeHtml(o)}${idx === q.correctAnswer ? '</b>' : ''}`).join(' | ')}</div>
            </div>
          `).join('');
          previewContainer.classList.remove('hidden');
        } else {
          btnExecute.classList.add('hidden');
          previewContainer.classList.add('hidden');
        }
      }
    };
    reader.readAsText(file);
  }

  executeImportStaged() {
    if (!this.importedStaging || this.importedStaging.length === 0) return;
    const addedCount = this.questionRepo.bulkAddQuestions(this.importedStaging);
    alert(`Successfully imported ${this.importedStaging.length} questions into the repository!`);
    this.importedStaging = [];
    document.getElementById('importValidationStatus').innerHTML = '';
    document.getElementById('importPreviewContainer').innerHTML = '';
    document.getElementById('btnExecuteImport').classList.add('hidden');
    this.renderAll();
    this.switchView('questions');
  }

  renderAnalytics() {
    const statsContainer = document.getElementById('analyticsDashboardView');
    if (!statsContainer) return;

    const statsEngine = new window.StatsEngine(this.progressManager, this.questionRepo);
    const summary = statsEngine.getOverallSummary();
    const topicBreakdown = statsEngine.getTopicBreakdown();

    statsContainer.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="card stat-card">
          <div class="stat-label">Total Answers Recorded</div>
          <div class="stat-value">${summary.totalAttempts}</div>
          <div class="text-xs text-secondary">${summary.uniqueQuestionsAnswered} distinct questions practiced</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Overall Accuracy</div>
          <div class="stat-value text-success">${summary.accuracy}%</div>
          <div class="text-xs text-secondary">First attempt accuracy: ${summary.firstAttemptAccuracy}%</div>
        </div>
        <div class="card stat-card">
          <div class="stat-label">Review Vault Backlog</div>
          <div class="stat-value text-amber">${summary.vaultCount}</div>
          <div class="text-xs text-secondary">Questions currently pending mastery</div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="card">
          <h3 class="font-bold text-navy mb-3">Strongest Topics (≥75% Accuracy)</h3>
          ${topicBreakdown.strongAreas.length === 0 ? '<div class="text-secondary text-sm">No strong topics recorded yet. Practice more rooms!</div>' : `
            <div class="space-y-2">
              ${topicBreakdown.strongAreas.map(t => `
                <div class="flex justify-between items-center text-sm p-2 bg-emerald-50 rounded">
                  <span class="font-medium text-emerald-900">${t.topic}</span>
                  <span class="font-bold text-emerald-700">${t.accuracy}% (${t.correct}/${t.total})</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="card">
          <h3 class="font-bold text-navy mb-3">Attention Needed (&lt;75% Accuracy)</h3>
          ${topicBreakdown.needPractice.length === 0 ? '<div class="text-secondary text-sm">No weak areas identified. Great job!</div>' : `
            <div class="space-y-2">
              ${topicBreakdown.needPractice.map(t => `
                <div class="flex justify-between items-center text-sm p-2 bg-red-50 rounded">
                  <span class="font-medium text-red-900">${t.topic}</span>
                  <span class="font-bold text-red-700">${t.accuracy}% (${t.correct}/${t.total})</span>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
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
}

window.AdminController = AdminController;
