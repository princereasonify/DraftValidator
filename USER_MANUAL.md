# Draft Validator — User Manual

> **Internal Educator Portal** | Review and validate AI-generated learning plans against original textbook content.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Login](#2-login)
3. [Content Selection](#3-content-selection)
4. [Main Layout](#4-main-layout)
5. [Toolbar](#5-toolbar)
6. [Plan Structure](#6-plan-structure)
7. [Editing Topics](#7-editing-topics)
8. [Topic Actions](#8-topic-actions)
9. [Validation](#9-validation)
10. [Comments](#10-comments)
11. [Version History](#11-version-history)
12. [Chapter Examples](#12-chapter-examples)
13. [Export](#13-export)
14. [Keyboard Shortcuts](#14-keyboard-shortcuts)

---

## 1. Overview

**Draft Validator** is an internal review portal for educators to validate and refine AI-generated learning plans against the original textbook content.

The portal lets you:
- View the original textbook PDF alongside the drafted learning plan
- Review each topic's **modified teaching chunk** side-by-side with the **original textbook passage**
- Edit objectives, media intent, and topic metadata
- Leave reviewer comments and resolve them
- Run automated validation checks
- Export the finalised plan as a JSON file

### Quick Start

1. Sign in with your educator credentials.
2. Select **Board → Medium → Standard → Subject → Chapter**.
3. The main screen opens — PDF on the left, Learning Plan on the right.
4. Review, edit, validate and export the plan.

---

## 2. Login

Open the portal URL. You will see the **Sign In** screen.

- Enter your registered **email address** and **password**.
- Click **Sign In**. Only accounts with the **Educator** role can access this portal.
- Your session is remembered — refreshing the page will not log you out.
- To sign out, click the **sign-out icon (→)** in the top-right corner of any screen.

> **Note:** If you see "Login failed", check your credentials or contact your administrator.

---

## 3. Content Selection

After login, the **Select Content to Review** screen appears. Choose your content in order — each dropdown unlocks when the one above it is filled.

| Dropdown | Description |
|----------|-------------|
| **Board** | The curriculum board (e.g. CBSE, ICSE) |
| **Medium** | The language medium (e.g. English, Hindi) |
| **Standard** | The grade / class (e.g. 7, 8) |
| **Subject** | The subject (e.g. Science, Mathematics) |
| **Chapter** | The specific chapter to review |

Click **Open Draft Validator** once all five selections are made.

To change the chapter later, click **Change** in the header — this returns you to the selection screen without logging you out.

---

## 4. Main Layout

The main screen is split into two resizable panels:

| Panel | Description |
|-------|-------------|
| **Left — Textbook PDF** | The original textbook rendered as a PDF. Scroll, zoom and navigate pages to read source content. |
| **Divider (drag bar)** | Drag the vertical bar left or right to resize the two panels (between 20% and 80% of the screen). |
| **Right — Learning Plan** | The AI-drafted learning plan. Scroll to browse modules, segments and topics. |

> **Note:** The plan header and toolbar stay pinned at the top as you scroll through the plan content.

---

## 5. Toolbar

The toolbar sits at the top of the Learning Plan panel.

| Button | Description |
|--------|-------------|
| **Search** | Type to filter topics by name, ID or chunk text. Clear with ✕. |
| **Undo** | Step back through edits. Keyboard: `Ctrl+Z` / `⌘Z`. |
| **Redo** | Step forward through edits. Keyboard: `Ctrl+Shift+Z` / `⌘⇧Z`. |
| **Examples** | Toggle the chapter Examples panel above the plan content. |
| **+ Module** | Add a new module to the plan. |
| **Validate** | Run automated checks on the plan (see [Validation](#9-validation)). |
| **History** | Open the version history panel to restore a previous snapshot. |
| **Export** | Download the approved plan as a JSON file. |

---

## 6. Plan Structure

The plan is organised in a three-level hierarchy:

```
Module
  └── Segment
        └── Topic
```

| Level | Description |
|-------|-------------|
| **Module** | A major chapter division (e.g. "Module 1: Matter Around Us") |
| **Segment** | A sub-division within a module (e.g. "Segment A: States of Matter") |
| **Topic** | A single teaching unit within a segment — this is where all editing happens |

Each level can be **collapsed / expanded** using the arrow button on its header. Collapsed cards show only the title and key metadata.

---

## 7. Editing Topics

Each topic card contains the following editable sections:

| Field | How to Edit |
|-------|-------------|
| **Topic Name** | Click to edit inline. Press `Enter` or click away to save. |
| **Topic Type** | Pill buttons: `CONCEPT` · `EXPERIMENT` · `PRACTICE` · `INTERACTIVE` · `REVIEW` (Science) or `WORKED_EXAMPLE` · `APPLICATION` (Math). Click to toggle. |
| **Bloom's Level** | Colour-coded badge (Remember → Create). Click to cycle through all six levels. |
| **Modified Chunk** | The AI-drafted teaching text. Edit freely — this is the core content being validated. Structured with HOOK / RECALL / CORE / VISUAL BRIDGE sections. |
| **Original Chunk** | Read-only reference showing the original textbook passage for comparison. |
| **Objectives** | List of learning objectives. Click **+** to add, click any objective to edit or remove it. |
| **Media Intent** | Planned media items (images, videos, diagrams). Click **+** to add details. |
| **Comments** | Leave reviewer notes attached to a specific topic. Replies and resolve actions are supported. |

> **Note:** The Modified and Original chunk boxes are always the same height so you can compare them line-by-line without scrolling one side more than the other.

### Bloom's Taxonomy Levels

| Level | Colour | Meaning |
|-------|--------|---------|
| Remember | Amber | Recall facts and basic concepts |
| Understand | Blue | Explain ideas or concepts |
| Apply | Green | Use information in new situations |
| Analyse | Purple | Draw connections among ideas |
| Evaluate | Red | Justify a decision or course of action |
| Create | Indigo | Produce original work |

---

## 8. Topic Actions

Hover over a topic card header to reveal action buttons on the right:

| Action | Description |
|--------|-------------|
| **↑ / ↓ Reorder** | Move the topic up or down within its segment |
| **Split** | Split this topic into two at a chosen paragraph boundary |
| **Merge** | Merge this topic with an adjacent topic in the same segment |
| **Move** | Move the topic to a different segment or module |
| **Duplicate** | Create an exact copy of the topic below the current one |
| **Delete** | Permanently remove the topic (supports Undo) |

Similar **Reorder / Move / Delete** actions are available on **Segment** and **Module** headers.

### Split a Topic

1. Click **Split** on the topic you want to divide.
2. In the modal, choose the paragraph where the split should occur.
3. Assign a name and type to the new second topic.
4. Click **Confirm Split**.

### Merge Two Topics

1. Click **Merge** on one of the topics.
2. Select the adjacent topic to merge with.
3. Review the combined content in the preview.
4. Click **Confirm Merge**.

---

## 9. Validation

Click **Validate** in the toolbar to run automated checks. A panel slides in showing:

- **Errors** (red) — must be fixed before export (e.g. missing modified chunk, empty objectives).
- **Warnings** (yellow) — recommendations that should be reviewed.
- **Distributions** — topic type and Bloom's level breakdowns to check curriculum balance.

The **Validate** button badge updates to show the error count after each run. Fix issues, then re-run validation until the badge shows a green **✓**.

### Common Validation Errors

| Error | Fix |
|-------|-----|
| Modified chunk is empty | Add teaching content to the Modified Chunk field |
| No learning objectives | Add at least one objective to the topic |
| Invalid topic type | Select a valid type pill for the topic |
| Missing Bloom's level | Click the Bloom's badge and select a level |

---

## 10. Comments

Each topic has a **Comments** section at the bottom of its card.

1. Click the **speech-bubble icon** to expand the comments area.
2. Type a comment and press `Enter` or click **Send**.
3. Click **Reply** under any comment to respond to it.
4. Click **Resolve** to mark a comment as addressed — it will be greyed out.
5. The toolbar shows a badge with the total number of **unresolved comments**.

---

## 11. Version History

The plan can be snapshotted at any point. Click **History** in the toolbar to open the version list.

- Each entry shows the **version label** and **timestamp**.
- Click **Restore** on any entry to roll the plan back to that snapshot.
- Restoring a version is itself undoable with `Ctrl+Z`.

### Undo/Redo vs. Version History

| Feature | Scope | Limit |
|---------|-------|-------|
| **Undo / Redo** | Every individual edit in the current session | Last 50 actions |
| **Version History** | Named snapshots saved manually | Unlimited |

> **Note:** Undo/Redo does not affect comments — only plan structure and content edits.

---

## 12. Chapter Examples

Click **Examples** in the toolbar to toggle the examples panel above the plan.

This panel lists real-world examples attached to the chapter.

- Each example has a **theme**, **description**, **scope level** and **linked topic IDs**.
- Click any field to **edit it inline**.
- Change the scope using the **dropdown** on the example card (`chapter` / `module` / `segment` / `topic`).
- Click **+ Add Example** to create a new one.
- Click **✕** on an example to delete it.

---

## 13. Export

When you are satisfied with the plan:

1. Run **Validate** and resolve all errors.
2. Click **Export** in the toolbar.
3. A JSON file is downloaded automatically to your computer.
4. The file name is based on the plan ID (e.g. `sci7_ch1_approved.json`).
5. The exported JSON can be uploaded back to the content management system.

---

## 14. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + Z` &nbsp;/&nbsp; `⌘Z` | Undo last change |
| `Ctrl + Shift + Z` &nbsp;/&nbsp; `⌘⇧Z` | Redo |
| `Ctrl + Y` &nbsp;/&nbsp; `⌘Y` | Redo (alternative) |
| `Enter` (in inline edit) | Save the edited field |
| `Escape` (in inline edit) | Cancel edit without saving |

> **Note:** Undo / Redo is disabled when the cursor is inside a text input or textarea so your typing is not interrupted.

---

*Draft Validator · Internal Educator Portal · © 2026 Reasonify*
