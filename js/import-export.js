/**
 * Import and Export Utility for CSV and JSON
 * Handles parsing, robust escaping, validation, and file downloads
 */

class ImportExportManager {
  /**
   * Parse CSV string into array of objects
   */
  static parseCSV(csvText) {
    const lines = [];
    let currentLine = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
      const char = csvText[i];
      const nextChar = csvText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentLine.push(currentField.trim());
        currentField = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++; // CRLF
        currentLine.push(currentField.trim());
        if (currentLine.some(f => f.length > 0)) {
          lines.push(currentLine);
        }
        currentLine = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (currentField || currentLine.length > 0) {
      currentLine.push(currentField.trim());
      if (currentLine.some(f => f.length > 0)) {
        lines.push(currentLine);
      }
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.trim().toLowerCase());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      const obj = {};
      headers.forEach((h, colIndex) => {
        obj[h] = row[colIndex] || '';
      });
      result.push(obj);
    }

    return result;
  }

  /**
   * Validate parsed rows and map to question objects
   */
  static validateAndMapQuestions(parsedRows) {
    const validQuestions = [];
    const errors = [];

    parsedRows.forEach((row, index) => {
      const rowNum = index + 2; // header is row 1
      const rowErrors = [];

      const level = parseInt(row.level, 10);
      if (isNaN(level) || level < 1 || level > 5) {
        rowErrors.push('Level must be a number between 1 and 5');
      }

      const room = row.room?.trim();
      if (!room) {
        rowErrors.push('Room ID is required (e.g. 1.1)');
      }

      const questionText = row.question?.trim();
      if (!questionText || questionText.length < 5) {
        rowErrors.push('Question text is missing or too short');
      }

      const optA = row.optiona?.trim();
      const optB = row.optionb?.trim();
      const optC = row.optionc?.trim();
      const optD = row.optiond?.trim();

      const options = [optA, optB, optC, optD].filter(Boolean);
      if (options.length < 2) {
        rowErrors.push('At least 2 non-empty options are required');
      }

      let correctIndex = -1;
      const rawCorrect = String(row.correct || '').trim().toUpperCase();
      if (['0', '1', '2', '3'].includes(rawCorrect)) {
        correctIndex = parseInt(rawCorrect, 10);
      } else if (['A', 'B', 'C', 'D'].includes(rawCorrect)) {
        correctIndex = rawCorrect.charCodeAt(0) - 65;
      }

      if (correctIndex < 0 || correctIndex >= options.length) {
        rowErrors.push(`Correct index "${rawCorrect}" is invalid for ${options.length} options`);
      }

      const explanation = row.explanation?.trim() || 'No explanation provided.';

      if (rowErrors.length > 0) {
        errors.push({ rowNumber: rowNum, errors: rowErrors, snippet: questionText || 'Empty Question' });
      } else {
        validQuestions.push({
          id: `q_imp_${Date.now()}_${index}`,
          level: level || 1,
          room: room || '1.1',
          roomName: row.roomname?.trim() || `Room ${room}`,
          topic: row.topic?.trim() || 'General Finance',
          difficulty: ['easy', 'medium', 'hard'].includes(row.difficulty?.toLowerCase()) ? row.difficulty.toLowerCase() : 'medium',
          type: row.type?.trim() || 'multiple_choice',
          company: row.company?.trim() || 'Indian Enterprise',
          sector: row.sector?.trim() || 'General',
          question: questionText,
          options,
          correctAnswer: correctIndex,
          explanation,
          example: row.example?.trim() || '',
          interviewTip: row.interviewtip?.trim() || '',
          tags: row.tags ? row.tags.split(';').map(t => t.trim()) : [],
          custom: true,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            author: 'csv-import',
            published: true
          }
        });
      }
    });

    return { validQuestions, errors };
  }

  /**
   * Convert questions array to CSV format
   */
  static exportToCSV(questions) {
    const headers = [
      'Level', 'Room', 'RoomName', 'Topic', 'Difficulty', 'Type',
      'Company', 'Sector', 'Question', 'OptionA', 'OptionB', 'OptionC', 'OptionD',
      'Correct', 'Explanation', 'Example', 'InterviewTip', 'Tags'
    ];

    const escapeField = (text) => {
      if (text === null || text === undefined) return '""';
      const str = String(text);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return `"${str}"`;
    };

    const rows = questions.map(q => {
      const optA = q.options[0] || '';
      const optB = q.options[1] || '';
      const optC = q.options[2] || '';
      const optD = q.options[3] || '';
      const tags = Array.isArray(q.tags) ? q.tags.join(';') : (q.tags || '');

      return [
        q.level || 1,
        escapeField(q.room || '1.1'),
        escapeField(q.roomName || ''),
        escapeField(q.topic || ''),
        escapeField(q.difficulty || 'medium'),
        escapeField(q.type || 'multiple_choice'),
        escapeField(q.company || ''),
        escapeField(q.sector || ''),
        escapeField(q.question || ''),
        escapeField(optA),
        escapeField(optB),
        escapeField(optC),
        escapeField(optD),
        q.correctAnswer ?? 0,
        escapeField(q.explanation || ''),
        escapeField(q.example || ''),
        escapeField(q.interviewTip || ''),
        escapeField(tags)
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }

  /**
   * Trigger browser file download
   */
  static triggerDownload(filename, content, mimeType = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

window.ImportExportManager = ImportExportManager;
