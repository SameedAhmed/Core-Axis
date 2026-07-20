# 🤖 AI Financial Analyst Sub-Module — Complete Technical & Functional Documentation

> **DigiXCRM Core-Axis Platform**  
> *Module:* Finance → AI Analyst (`/dashboard/finance/analyst`)  
> *Engine:* In-Process Core-Axis Intelligence Engine (No API Key Required)  
> *Status:* ✅ Fully Implemented & Deployed  

---

## 📌 Executive Overview

The **AI Financial Analyst** sub-module empowers business owners and CFOs to upload financial documents—ranging from structured ledger spreadsheets to unstructured P&L text and PDF statements—and receive instant, automated predictive intelligence regarding:
1. **Overall Business Financial State**: Is the business operating in **Profit**, **Break-Even**, or **Loss**?
2. **Department-Level Directives**: 
   - Which departments should be **closed or divested** because they are bleeding capital or generating zero revenue?
   - Which departments require **restructuring** to achieve profitability?
   - Which departments deserve **more investment** because of high ROI and efficiency?
3. **Advanced Financial Metrics**: 12+ computed KPIs including Business Health Score (0–100), Risk Level, Margins, Concentration Risk (HHI), Break-Even threshold, and Cash Burn Rate.

---

## 🚀 Key Features & Multi-Format Document Support

### 1. Multi-Format Document Ingestion
- **CSV Spreadsheets (`.csv`)**: Parsed via `papaparse` for high-speed transaction mapping.
- **Excel Workbooks (`.xlsx`, `.xls`)**: Parsed via `xlsx` (SheetJS) with multi-sheet support and column auto-mapping (`Department`, `Amount`, `Type`, `Category`, `Date`).
- **PDF Financial Statements (`.pdf`)**: Text extracted server-side via `pdf-parse` and processed through local semantic MiniLM NLP embeddings.
- **Raw Text / Copy-Paste**: Direct paste box for P&L notes, ledger line items, or meeting transcripts.

### 2. Local AI Financial Intelligence Engine (No External API Required)
Runs 100% in-process within Node.js without requiring external API keys (e.g., OpenAI or Gemini):
- **Semantic NLP Classifier**: Uses `@xenova/transformers` (`Xenova/all-MiniLM-L6-v2`) to embed text lines and classify items as *Revenue* or *Expense* based on cosine similarity against financial concept anchors.
- **Department Entity Extractor**: Recognizes 50+ department keywords across Sales, Marketing, Engineering, HR, Operations, Finance, Support, Legal, IT, R&D, Admin, etc.
- **Advanced KPI Computation**: Calculates Gross Margin, Operating Margin, Net Profit Margin, Expense Ratio, Herfindahl-Hirschman Revenue Concentration Index (HHI), Break-Even Point, Cash Burn Rate, and Composite Health Score.
- **CFO Rule-Based Expert System (25+ Rules)**: Multi-factor triage model that classifies departments into 4 directive tiers (`INVEST`, `HOLD`, `RESTRUCTURE`, `CLOSE`) and assigns risk levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
- **Natural Language Generation (NLG)**: Generates human-grade executive summaries, custom per-department action plans, and numbered strategic advice cards using a dynamic 200+ sentence fragment pool.

### 3. Glassmorphic UI Dashboard
- **Overview Tab**: Status badge, Revenue/Expense/Net Cash Flow KPI cards, Risk Level indicator, Recharts bar chart, and AI Executive Summary with risk factors.
- **Department Performance Tab**: Detailed table showing Revenue, Expense, Net Profit, ROI %, Health Score, and color-coded Action Badges.
- **AI Recommendations Tab**: Departmental action plans + Numbered CFO Strategic Advice cards.
- **Advanced Metrics Tab**: Radial Business Health Score gauge, Analysis Confidence meter, and 8 financial KPI cards.
- **Saved Run History**: Persists analyses to PostgreSQL with click-to-load and delete features.

---

## 🛠️ Complete File Map

| File Path | Description |
|---|---|
| [`src/lib/ai/financial-intelligence.ts`](file:///c:/Users/SG/Desktop/Core-Axis/src/lib/ai/financial-intelligence.ts) | **Core AI Engine**: Semantic MiniLM classifier, KPI computer, expert rules system, NLG narrative generator, and confidence scorer. |
| [`src/lib/actions/finance-analyst.ts`](file:///c:/Users/SG/Desktop/Core-Axis/src/lib/actions/finance-analyst.ts) | **Server Actions**: `analyzeFinancialData()`, `extractPdfText()`, `saveFinancialReport()`, `getFinancialReports()`, `deleteFinancialReport()`. |
| [`src/app/dashboard/finance/analyst/page.tsx`](file:///c:/Users/SG/Desktop/Core-Axis/src/app/dashboard/finance/analyst/page.tsx) | **Frontend Dashboard**: Glassmorphic UI container with multi-format upload support, Recharts bar chart, Health Score gauge, and 4 results tabs. |
| [`src/components/layout/sidebar.tsx`](file:///c:/Users/SG/Desktop/Core-Axis/src/components/layout/sidebar.tsx) | **Sidebar Navigation**: Registered "AI Analyst" route with `Sparkles` icon under the Finance menu group. |
| [`prisma/schema.prisma`](file:///c:/Users/SG/Desktop/Core-Axis/prisma/schema.prisma) | **Database Schema**: `FinancialReport` model storing workspace analysis records. |

---

## 🗄️ Database Schema (`prisma/schema.prisma`)

```prisma
model FinancialReport {
  id              String    @id @default(cuid())
  name            String
  status          String    // "PROFIT" | "LOSS" | "BREAKEVEN"
  revenue         Float
  expenses        Float
  netProfit       Float
  departments     Json      // Array of DepartmentMetric objects
  recommendations Json      // Object containing executiveSummary, action plans & strategic advice
  workspaceId     String
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([workspaceId])
}
```

---

## 💡 How to Run & Verify

1. Start the server (if not already running):
   ```bash
   npm run dev
   ```
2. Navigate to **http://localhost:3000/dashboard/finance/analyst** in your browser.
3. Choose an input method:
   - **CSV / Excel / PDF Upload**: Drag and drop a `.csv`, `.xlsx`, `.xls`, or `.pdf` file.
   - **Raw Text / P&L**: Paste unstructured profit & loss notes.
4. Click **"Analyze Financials"** to generate the AI financial report.
5. Save the report to persist it in the **Saved Run History** list.
