# 🏢 Finance Escape Room - From Campus to Corner Office

An interactive, production-ready finance learning game and interview preparation platform designed specifically for Indian management graduates (IIM, ISB, FMS, XLRI) and ambitious finance students preparing for high-stakes interviews in **Investment Banking**, **Private Equity**, **Corporate Finance**, and **Strategic Consulting**.

---

## 🌟 Key Highlights & Unique Features

1. **100% Indian Corporate Context**:
   - Built around real Indian bellwethers: **Reliance Industries, TCS, HDFC Bank, ITC, Infosys, Adani Group, Tata Motors, Bharti Airtel, and Maruti Suzuki**.
   - Strict Indian currency conventions: **₹ values in Crores and Lakhs** (e.g. ₹2,25,000 Cr, ₹121 Lakhs), reflecting NSE/BSE market dynamics and Indian banking liquidity norms (Tandon committee norms, RBI guidelines).
2. **5-Level, 15-Room Career Progression**:
   - **Level 1: Campus Recruitment** (Intern Level): Financial Statements Basics, Financial Ratios & Metrics, Time Value of Money.
   - **Level 2: First Round Interview** (Analyst Level): Working Capital Management, Valuation Fundamentals, Cost of Capital (CAPM & WACC).
   - **Level 3: Technical Round** (Associate Level): Financial Modeling, Investment Analysis (DCF & Terminal Value), Corporate Finance Decisions.
   - **Level 4: Case Study Round** (Senior Associate Level): M&A Fundamentals (Accretion/Dilution), Risk Management, Strategic Finance.
   - **Level 5: Partner Interview** (VP & MD Level): Advanced SOTP Valuation, Capital Structure Optimization, Final Partner Curveball Challenge.
3. **Built-in Content Management System (CMS)**:
   - Dedicated administrative dashboard accessible at `/admin.html`.
   - Comprehensive question authoring form with live preview, duplicate detection, and tag indexing.
   - Robust **CSV and JSON bulk import/export wizard** with validation error reporting and downloadable templates.
4. **Google AI Studio (Gemini) Integration**:
   - **Personalized Wrong Answer Feedback**: Analyzes student's choice, explains the mistake, and provides an intuitive Indian corporate analogy and Dalal Street interview tip.
   - **Progressive 3-Tier Hint System**: Concept hint (-5 pts) → Option elimination hint → Calculation formula & step 1 walkthrough.
   - **Dynamic Similar Question Generator**: Generates parallel questions on the same financial concept with different Indian firms and numbers.
5. **No-Timer, Understanding-Focused Pedagogy**:
   - Stress-free learning experience encouraging deep mastery rather than hasty guessing.
   - Automatic routing of missed questions into the **Review Vault** for spaced repetition.
6. **Zero External Framework Overhead**:
   - Crafted in vanilla HTML5, CSS3, and ES6+ JavaScript. Clean, fast, and accessible across mobile, tablet, and desktop viewports.

---

## 📂 File Architecture

```
finance-escape-room/
├── index.html              # Main candidate game interface
├── admin.html              # Content Management System (CMS) portal
├── style.css               # Main game theme (Bloomberg Terminal meets Duolingo)
├── admin-style.css         # CMS dashboard and table styling
├── server.ts               # Full-stack Express server with Gemini AI endpoint
│
├── js/
│   ├── config.js           # Scoring constants, thresholds, currency formatters
│   ├── progress.js         # LocalStorage persistence, achievements, unlock checks
│   ├── questions.js        # Repository merging default & custom questions, Fisher-Yates
│   ├── stats.js            # Analytical engine (accuracy, strong/weak areas, recs)
│   ├── vault.js            # Review Vault manager, filtering, spaced repetition
│   ├── ai-handler.js       # Google AI Studio API integration & prompt engineering
│   ├── import-export.js    # CSV & JSON parser, validator, file downloader
│   ├── admin.js            # CMS controller, CRUD, search/filtering, live preview
│   └── game.js             # Core gameplay loop, card selections, modal animations
│
├── data/
│   ├── questions-default.json    # Default question bank (Indian corporate context)
│   ├── rooms-config.json         # 5 levels & 15 rooms hierarchy and unlock rules
│   ├── achievements.json         # Achievement definitions, conditions, and rewards
│   └── templates/
│       ├── question-template.csv # Pre-formatted CSV template for bulk imports
│       └── import-guide.md       # Comprehensive guide on CSV headers and formatting
│
└── README.md               # Project documentation
```

---

## 🚀 Getting Started & Local Setup

### 1. Requirements
- Node.js (v18+ recommended)
- npm or yarn

### 2. Installation
```bash
# Clone or navigate to the workspace
npm install
```

### 3. Environment Variables
Create or verify your `.env` file in the project root:
```env
GEMINI_API_KEY="your-google-ai-studio-api-key"
```

### 4. Running Development Server
```bash
npm run dev
```
The server will boot on `http://localhost:3000`.
- Main Game: `http://localhost:3000/`
- CMS Admin: `http://localhost:3000/admin.html` (Default Password: `finance123`)

---

## 🤖 Google AI Studio Setup

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a free API key.
2. In the AI Studio container or local `.env`, set `GEMINI_API_KEY="AIzaSy..."`.
3. Alternatively, candidates can click the **⚙️ Settings** icon in the game header and paste their custom key directly into LocalStorage.

---

## 🛠️ CMS Question Authoring & CSV Import

### Adding Questions in UI
1. Navigate to `/admin.html`.
2. Enter the admin password (`finance123`).
3. Click **+ Add Question**.
4. Fill in Level, Room, Topic, Company, Question prompt, and 4 Options.
5. Utilize the **✨ AI Enhance Explanation** and **✨ AI Generate Tip** buttons to enrich the learning content.
6. Click **Publish Question ✓**.

### Bulk CSV Import
1. Navigate to the **Import / Export** tab in the CMS.
2. Click **Download CSV Template** to review the format.
3. Drag & drop your completed `.csv` file into the upload dropzone.
4. The system validates all rows and provides instant feedback before publishing.

---

## 🏆 Scoring & Game Rules
- **Passing Accuracy**: 80% per room.
- **Easy Question**: 50 base points.
- **Medium Question**: 100 base points.
- **Hard Question**: 150 base points.
- **First Attempt Bonus**: 2.0x multiplier.
- **Streak Bonus (5+ in a row)**: 1.5x multiplier.
- **Hint Penalty**: -5 points per hint.
- **Room Escape Bonus**: +200 bonus points upon clearing a room.

---

## 📜 License
MIT License. Built for finance learners, B-school students, and faculty educators.
