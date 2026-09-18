# Question Import Guide - Finance Escape Room CMS

This guide explains how to prepare and bulk-import finance questions into the **Finance Escape Room** Content Management System.

## CSV File Columns Specification

| Column Header | Required | Valid Values / Example | Description |
| :--- | :---: | :--- | :--- |
| **Level** | Yes | `1`, `2`, `3`, `4`, `5` | The career progression level (1 = Campus, 5 = Partner) |
| **Room** | Yes | `1.1`, `1.2`, `2.1`, etc. | The target room ID matching the room configuration |
| **RoomName** | Optional | `Financial Statements Basics` | Descriptive name of the room |
| **Topic** | Yes | `Balance Sheet`, `Liquidity Ratios`, etc. | Finance syllabus sub-topic |
| **Difficulty**| Yes | `easy`, `medium`, `hard` | Question complexity setting |
| **Type** | Yes | `multiple_choice`, `scenario` | Question layout type |
| **Company** | Recommended | `Reliance Industries`, `TCS`, `HDFC Bank` | Real Indian entity contextualizing the question |
| **Sector** | Optional | `IT`, `Banking`, `FMCG`, `Auto`, `Infra` | Industry vertical |
| **Question** | Yes | Text string | Clear, rigorous finance interview question prompt |
| **OptionA** | Yes | Text string | First option |
| **OptionB** | Yes | Text string | Second option |
| **OptionC** | Yes | Text string | Third option |
| **OptionD** | Yes | Text string | Fourth option |
| **Correct** | Yes | `0`, `1`, `2`, or `3` (or `A`, `B`, `C`, `D`) | 0-indexed integer or letter pointing to correct option |
| **Explanation**| Yes | Text string (min 30 words) | Clear pedagogical derivation and conceptual rationale |
| **Example** | Recommended | Text string | Real Indian data/benchmarks with ₹ values in Cr/L |
| **InterviewTip**| Recommended | Text string | Direct advice from Wall St / Dalal St interviewers |
| **Tags** | Optional | Semicolon or comma separated | `ebitda;valuation;it` |

## Indian Market Conventions

1. **Currency**: Always use `₹` or `Rs.` with Lakhs (`L`) and Crores (`Cr`).
2. **Formatting**: Wrap fields with commas or quotes inside standard double quotes `"..."`.
3. **Escapes**: If your text contains double quotes inside, escape them as `""`.
4. **Encoding**: Save your file in standard **UTF-8** format to maintain `₹` and special characters.

## Step-by-Step Import Process in Admin Dashboard

1. Navigate to `/admin.html` (or click **CMS / Admin** in the main game).
2. Enter the admin credentials (default password: `finance123`).
3. Click the **Import / Export** tab in the top navigation.
4. Click **Download CSV Template** to start from a pre-formatted file.
5. Populate your questions and drag the CSV file onto the upload dropzone.
6. The CMS validation engine will verify column headers, row counts, and valid answer indexes.
7. Click **Preview & Validate** to check how the questions will render.
8. Choose **Publish Immediately** or **Save as Draft**, then click **Execute Import**.
