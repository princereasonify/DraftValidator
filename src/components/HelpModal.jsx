import './HelpModal.css';

const SECTIONS = [
  {
    id: 'overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ),
    title: 'Overview',
    content: (
      <>
        <p>
          <strong>Draft Validator</strong> is an internal review portal for educators to validate and refine AI-generated learning plans against the original textbook content. The portal lets you review each topic's modified teaching chunk side-by-side with the original textbook passage, edit objectives, add comments, and export a finalised plan.
        </p>
        <HelpSteps steps={[
          'Sign in with your educator credentials.',
          'Select Board → Medium → Standard → Subject → Chapter.',
          'The main screen opens: PDF on the left, Learning Plan on the right.',
          'Review, edit, validate and export the plan.',
        ]} />
      </>
    ),
  },
  {
    id: 'login',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    ),
    title: 'Login',
    content: (
      <>
        <p>Open the portal URL. You will see the Sign In screen.</p>
        <HelpList items={[
          'Enter your registered email address and password.',
          'Click Sign In. Only accounts with the Educator role can access this portal.',
          'Your session is remembered — refreshing the page will not log you out.',
          'To sign out, click the sign-out icon (→) in the top-right corner of any screen.',
        ]} />
        <HelpNote>If you see "Login failed", check your credentials or contact your administrator.</HelpNote>
      </>
    ),
  },
  {
    id: 'selection',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    ),
    title: 'Content Selection',
    content: (
      <>
        <p>After login, the <strong>Select Content to Review</strong> screen appears. Choose your content in order — each dropdown unlocks when the one above it is filled.</p>
        <HelpTable rows={[
          ['Board',    'The curriculum board (e.g. CBSE, ICSE).'],
          ['Medium',   'The language medium (e.g. English, Hindi).'],
          ['Standard', 'The grade / class (e.g. 7, 8).'],
          ['Subject',  'The subject (e.g. Science, Mathematics).'],
          ['Chapter',  'The specific chapter to review.'],
        ]} />
        <p>Click <HelpBadge>Open Draft Validator</HelpBadge> once all five selections are made. To change the chapter later, click <HelpBadge>Change</HelpBadge> in the header.</p>
      </>
    ),
  },
  {
    id: 'layout',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
    ),
    title: 'Main Layout',
    content: (
      <>
        <p>The main screen is split into two resizable panels:</p>
        <HelpTable rows={[
          ['Left — Textbook PDF',   'The original textbook rendered as a PDF. Scroll, zoom and navigate pages to read source content.'],
          ['Divider',               'Drag the vertical bar left or right to resize the two panels (between 20 % and 80 % of the screen).'],
          ['Right — Learning Plan', 'The AI-drafted learning plan. Scroll to browse modules, segments and topics.'],
        ]} />
        <HelpNote>The plan header and toolbar stay pinned at the top as you scroll through the plan content.</HelpNote>
      </>
    ),
  },
  {
    id: 'toolbar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
    ),
    title: 'Toolbar',
    content: (
      <>
        <HelpTable rows={[
          ['Search',   'Type to filter topics by name, ID or chunk text. Clear with ✕.'],
          ['Undo / Redo', 'Step back or forward through every edit. Keyboard: Ctrl+Z / Ctrl+Shift+Z (or ⌘ on Mac). Undoes all plan changes except comments.'],
          ['Examples', 'Toggle the chapter Examples panel above the plan content.'],
          ['+ Module', 'Add a new module to the plan.'],
          ['Validate', 'Run automated checks on the plan (see Validation section).'],
          ['History',  'Open the version history panel to restore a previous snapshot.'],
          ['Export',   'Download the approved plan as a JSON file.'],
        ]} />
      </>
    ),
  },
  {
    id: 'structure',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    ),
    title: 'Plan Structure',
    content: (
      <>
        <p>The plan is organised in a three-level hierarchy:</p>
        <HelpSteps steps={[
          'Module — A major chapter division (e.g. "Module 1: Matter Around Us").',
          'Segment — A sub-division within a module (e.g. "Segment A: States of Matter").',
          'Topic — A single teaching unit within a segment. This is where all the editing happens.',
        ]} />
        <p>Each level can be collapsed/expanded using the arrow button on its header. Collapsed cards show only the title and key metadata.</p>
      </>
    ),
  },
  {
    id: 'topic',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    ),
    title: 'Editing Topics',
    content: (
      <>
        <p>Each topic card contains the following editable sections:</p>
        <HelpTable rows={[
          ['Topic Name',      'Click to edit inline. Press Enter or click away to save.'],
          ['Topic Type',      'Pill buttons: CONCEPT · EXPERIMENT · PRACTICE · INTERACTIVE · REVIEW (Science) or WORKED_EXAMPLE · APPLICATION (Math). Click to toggle.'],
          ['Bloom\'s Level',  'Colour-coded badge (Remember → Create). Click to cycle through all six levels.'],
          ['Modified Chunk',  'The AI-drafted teaching text. Edit freely — this is the core content being validated. Structured with HOOK / RECALL / CORE / VISUAL BRIDGE sections.'],
          ['Original Chunk',  'Read-only reference showing the original textbook passage for comparison.'],
          ['Objectives',      'List of learning objectives. Click + to add, click any objective to edit or remove it.'],
          ['Media Intent',    'Planned media items (images, videos, diagrams). Click + to add details.'],
          ['Comments',        'Leave reviewer notes attached to a specific topic. Replies and resolve actions are supported.'],
        ]} />
        <HelpNote>The Modified and Original chunk boxes are always the same height so you can compare them line-by-line without scrolling one side more than the other.</HelpNote>
      </>
    ),
  },
  {
    id: 'actions',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
    ),
    title: 'Topic Actions',
    content: (
      <>
        <p>Hover over a topic card header to reveal action buttons on the right:</p>
        <HelpTable rows={[
          ['↑ / ↓ Reorder',  'Move the topic up or down within its segment.'],
          ['Split',           'Split this topic into two separate topics at a chosen paragraph boundary.'],
          ['Merge',           'Merge this topic with an adjacent topic in the same segment.'],
          ['Move',            'Move the topic to a different segment or module.'],
          ['Duplicate',       'Create an exact copy of the topic below the current one.'],
          ['Delete',          'Permanently remove the topic (supports Undo).'],
        ]} />
        <p>Similar Reorder / Move / Delete actions are available on Segment and Module headers.</p>
      </>
    ),
  },
  {
    id: 'validation',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
    ),
    title: 'Validation',
    content: (
      <>
        <p>Click <HelpBadge>Validate</HelpBadge> in the toolbar to run automated checks. A panel slides in from the right showing:</p>
        <HelpList items={[
          'Errors (red) — issues that must be fixed before export (e.g. missing modified chunk, empty objectives).',
          'Warnings (yellow) — recommendations that should be reviewed.',
          'Distributions — topic type and Bloom\'s level breakdowns to check curriculum balance.',
        ]} />
        <p>The Validate button badge updates to show the error count after each run. Fix issues, then re-run validation until the badge shows a green ✓.</p>
      </>
    ),
  },
  {
    id: 'comments',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
    ),
    title: 'Comments',
    content: (
      <>
        <p>Each topic has a Comments section at the bottom of its card.</p>
        <HelpList items={[
          'Click the speech-bubble icon to expand the comments area.',
          'Type a comment and press Enter or click Send.',
          'Reply to any comment using the Reply button under it.',
          'Click Resolve to mark a comment as addressed — it will be greyed out.',
          'The toolbar shows a badge with the total number of unresolved comments.',
        ]} />
      </>
    ),
  },
  {
    id: 'history',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
    title: 'Version History',
    content: (
      <>
        <p>The plan automatically saves a snapshot each time a version is explicitly created. Click <HelpBadge>History</HelpBadge> to open the version list.</p>
        <HelpList items={[
          'Each entry shows the version label and timestamp.',
          'Click Restore on any entry to roll the plan back to that snapshot.',
          'Restoring a version is itself undoable with Ctrl+Z.',
        ]} />
        <HelpNote>Undo/Redo (Ctrl+Z / Ctrl+Shift+Z) works independently from version history and covers up to 50 individual edits within your current session.</HelpNote>
      </>
    ),
  },
  {
    id: 'examples',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    ),
    title: 'Chapter Examples',
    content: (
      <>
        <p>Click <HelpBadge>Examples</HelpBadge> in the toolbar to toggle the examples panel above the plan. This panel lists real-world examples attached to the chapter.</p>
        <HelpList items={[
          'Each example has a theme, description, scope level (chapter / module / segment / topic) and linked topic IDs.',
          'Click any field to edit it inline.',
          'Change the scope using the dropdown on the example card.',
          'Click + Add Example to create a new one.',
          'Click ✕ on an example to delete it.',
        ]} />
      </>
    ),
  },
  {
    id: 'export',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    ),
    title: 'Export',
    content: (
      <>
        <p>When you are satisfied with the plan, click <HelpBadge>Export</HelpBadge> in the toolbar.</p>
        <HelpList items={[
          'A JSON file is downloaded automatically to your computer.',
          'The file name is based on the plan ID (e.g. sci7_ch1_approved.json).',
          'It is recommended to run Validate and resolve all errors before exporting.',
          'The exported JSON can be uploaded back to the content management system.',
        ]} />
      </>
    ),
  },
  {
    id: 'shortcuts',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/></svg>
    ),
    title: 'Keyboard Shortcuts',
    content: (
      <>
        <HelpTable rows={[
          ['Ctrl + Z  (⌘Z)',         'Undo last change'],
          ['Ctrl + Shift + Z  (⌘⇧Z)', 'Redo'],
          ['Ctrl + Y  (⌘Y)',          'Redo (alternative)'],
          ['Enter (in inline edit)',   'Save the edited field'],
          ['Escape (in inline edit)',  'Cancel edit without saving'],
        ]} />
        <HelpNote>Undo/Redo is disabled when the cursor is inside a text input or textarea so your typing is not interrupted.</HelpNote>
      </>
    ),
  },
];

/* ── Helper sub-components ─────────────────────────── */
function HelpList({ items }) {
  return (
    <ul className="help-list">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  );
}

function HelpSteps({ steps }) {
  return (
    <ol className="help-steps">
      {steps.map((s, i) => <li key={i}>{s}</li>)}
    </ol>
  );
}

function HelpTable({ rows }) {
  return (
    <table className="help-table">
      <tbody>
        {rows.map(([term, desc], i) => (
          <tr key={i}>
            <td className="help-table__term">{term}</td>
            <td className="help-table__desc">{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HelpNote({ children }) {
  return (
    <div className="help-note">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {children}
    </div>
  );
}

function HelpBadge({ children }) {
  return <span className="help-badge">{children}</span>;
}

/* ── Main modal ────────────────────────────────────── */
export default function HelpModal({ onClose }) {
  return (
    <div className="help-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="help-modal">
        {/* Header */}
        <div className="help-modal__header">
          <div className="help-modal__title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            User Manual — Draft Validator
          </div>
          <button className="help-modal__close" onClick={onClose} aria-label="Close help">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="help-modal__body">
          {/* Sidebar nav */}
          <nav className="help-nav">
            {SECTIONS.map(s => (
              <a key={s.id} href={`#help-${s.id}`} className="help-nav__item">
                {s.icon}
                {s.title}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div className="help-content">
            {SECTIONS.map(s => (
              <section key={s.id} id={`help-${s.id}`} className="help-section">
                <div className="help-section__heading">
                  {s.icon}
                  <h2>{s.title}</h2>
                </div>
                <div className="help-section__body">
                  {s.content}
                </div>
              </section>
            ))}
            <div className="help-footer">
              Draft Validator · Internal Educator Portal · {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
