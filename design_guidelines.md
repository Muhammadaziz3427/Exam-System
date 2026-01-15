# CD-IELTS Platform Design Guidelines

## Design Approach: Educational System Reference

**Chosen Framework**: Material Design principles adapted for educational testing, inspired by Cambridge Assessment and Duolingo's professional exam interfaces.

**Rationale**: Exam platforms demand clarity, hierarchy, and trust. The design prioritizes information density, cognitive load management, and professional credibility over visual flair.

---

## Typography System

**Primary Font**: Inter (Google Fonts) - excellent readability for extended reading passages
**Secondary Font**: Roboto Mono - for question numbers, timers, scores

**Hierarchy**:
- Headers: font-bold text-2xl to text-4xl
- Reading passages: text-base leading-relaxed (16px, 1.75 line-height)
- Questions: font-medium text-lg
- Instructions: text-sm text-gray-600
- Buttons/Actions: font-semibold text-sm uppercase tracking-wide

---

## Layout System

**Spacing Primitives**: Use Tailwind units of 3, 4, 6, 8, 12 for consistency
- Component padding: p-6 or p-8
- Section spacing: mb-8, mt-12
- Card gaps: gap-6
- Form fields: space-y-4

**Container Strategy**:
- Dashboard max-width: max-w-7xl mx-auto
- Reading passages: No max-width constraints (full 50% viewport)
- Forms: max-w-2xl

---

## Core Components

### 1. 50/50 Split-Screen Reading View (Critical Feature)

**Layout**: Two equal panels, fixed split, no resize
```
- Left Panel (50vw): Reading passage with vertical scroll
  - White background, p-12
  - Passage title: text-3xl font-bold mb-8
  - Body text: text-base leading-relaxed max-w-prose
  - Paragraph spacing: mb-6
  
- Right Panel (50vw): Questions with independent scroll
  - Light grey background (use subtle contrast)
  - p-8
  - Question cards: white bg, p-6, rounded-lg, shadow-sm, mb-4
  - Question numbering: Circular badges (h-8 w-8)
  - Radio/checkbox inputs: Large touch targets (h-5 w-5)
```

**Top Bar** (spans full width above split):
- Timer: Fixed right, font-mono text-lg font-bold
- Progress: "Question 3 of 40" center
- Navigation: "Previous/Next" buttons
- Exit button: Top-left

### 2. Teacher Dashboard

**Hero Section**: No large hero image - use stats banner instead
- Compact header (h-24) with platform branding left, teacher profile right
- Quick stats bar below header: 4-column grid showing active students, tests assigned, completion rate, average scores
- Each stat: Card with icon, large number (text-4xl), label below

**Main Dashboard Layout**: 3-column grid (lg:grid-cols-3 gap-6)

**Left Column** (col-span-2):
- Recent Test Results: Table with student names, test types, scores, date
- Upcoming Tests: Timeline view showing scheduled assessments

**Right Column**:
- Quick Actions: Vertical button stack (Assign Test, View Students, Create Report)
- Student Performance Chart: Bar/line graph showing trends
- Recent Activity Feed: Chronological list

### 3. Admin Test Builder

**Layout**: Two-panel builder (not 50/50, asymmetric 40/60)

**Left Sidebar** (40%):
- Test Metadata Form: Title, description, duration, difficulty
- Question Bank: Scrollable list of created questions
- Add Question Button: Prominent, sticky at bottom

**Right Panel** (60%):
- Question Editor: Large textarea for passage content
- Question Type Selector: Tabs (Multiple Choice, True/False, Matching, etc.)
- Answer Options Builder: Dynamic form fields
- Preview Mode Toggle: Shows student view

**Navigation**: Top toolbar with Save Draft, Publish, Preview Test buttons

---

## Navigation Structure

**Student View**:
- Top navbar: Logo left, Dashboard, My Tests, Progress, Settings, Profile avatar right
- Sidebar unnecessary - keep horizontal

**Teacher Dashboard**:
- Vertical sidebar (w-64): Dashboard, Students, Tests, Reports, Analytics, Settings
- Main content area: Remaining space with max-w-7xl

**Admin Panel**:
- Same sidebar pattern as teacher with additional Admin Tools section

---

## Form Components

**Input Fields**:
- Height: h-12
- Padding: px-4
- Border: 2px solid with focus ring
- Labels: font-medium mb-2 block

**Buttons**:
- Primary: px-8 py-3 rounded-lg font-semibold
- Secondary: Same size, outlined variant
- Icon buttons: h-10 w-10 rounded-full

**Cards**:
- Shadow: shadow-sm with hover:shadow-md transition
- Borders: rounded-lg
- Padding: p-6

---

## Images

**No Hero Images**: This is a professional exam platform - lead with functionality.

**Profile Images**: Teacher/student avatars - circular, 40px diameter in navbars, 80px in profile sections

**Illustrations**: Use simple, professional line illustrations for:
- Empty states ("No tests assigned yet")
- Error pages
- Onboarding screens

**Icons**: Heroicons (outline style) via CDN - consistent 24px throughout

---

## Key Interactions

**Test Taking**:
- Clear "Flag for Review" button on each question
- Automatic answer saving (no save button needed)
- Modal confirmation before submitting test

**Dashboard**:
- Sortable tables with clear column headers
- Hover states on cards: slight elevation increase
- Loading states: Skeleton screens for data-heavy sections

**Minimal Animation**: Only use for:
- Page transitions: Smooth fade (200ms)
- Dropdown menus: Slide down (150ms)
- Success notifications: Slide in from top

---

## Accessibility

- Keyboard navigation for entire test-taking flow
- ARIA labels on all interactive elements
- High contrast text ratios (WCAG AAA for passage text)
- Focus indicators: 3px outline offset by 2px