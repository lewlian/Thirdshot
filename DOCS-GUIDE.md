# Documentation Guide - How to Use Your Project Docs

This guide explains how to use the documentation system for tracking features and planning future work with Claude.

---

## 🤖 Claude Workflow Automation

**Good news!** Claude now automatically follows the documentation workflow thanks to custom instructions.

**What this means:**
- When you request a new feature, Claude will **automatically** add it to PRD.md first
- Claude will ask for your approval before implementing
- Claude will update FEATURES.md after completion
- You just describe what you want - Claude handles the docs!

**Quick Reference Files:**
- [`.claude/instructions`](.claude/instructions) - Rules Claude follows
- [`.claude/QUICK_START.md`](.claude/QUICK_START.md) - Template prompts to copy/paste
- [`.claude/CHEATSHEET.md`](.claude/CHEATSHEET.md) - One-page reference (bookmark this!)

---

## Document Overview

Your project now has 7 documentation files:

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [README.md](./README.md) | Project overview, setup, development | Onboarding new developers, quick reference |
| [FEATURES.md](./FEATURES.md) | Track implemented features | After completing features, before deployment |
| [PRD.md](./PRD.md) | Plan future features, task lists | When planning new features or improvements |
| [DOCS-GUIDE.md](./DOCS-GUIDE.md) | This file - how to use the docs | When you forget how to use the system 😊 |
| [`.claude/instructions`](.claude/instructions) | Rules for Claude to follow | Setup once, forget about it |
| [`.claude/QUICK_START.md`](.claude/QUICK_START.md) | Quick prompt templates | Copy/paste when requesting features |
| [`.claude/CHEATSHEET.md`](.claude/CHEATSHEET.md) | One-page reference | Bookmark for quick access |

---

## Workflow for Building Features with Claude

### 1. Planning a New Feature

**Start Here:** [PRD.md](./PRD.md)

1. Check if the feature is already in the PRD backlog
2. If not, add it using the feature request template
3. Assign a priority (High/Medium/Low)
4. Write a clear description and user story

**Example:**
```markdown
### Feature: User Profile Avatars
**Requested By:** Sean
**Date:** 2026-01-22
**Priority:** Medium
**Status:** New

**Description:**
Allow users to upload profile avatars so they can personalize their accounts.

**User Story:**
As a user, I want to upload a profile picture so that my account feels more personal and I'm recognizable to staff.
```

---

### 2. Creating Task List for Claude

**Important:** Claude works best with detailed task lists.

When adding a feature to PRD, include a task list like this:

```markdown
## Task: Implement User Profile Avatars

### Context
Users want to personalize their profiles with avatars.

### Requirements
1. Upload UI:
   - Add avatar upload button to profile page
   - Support JPG, PNG, WebP (max 5MB)
   - Image preview before upload
   - Crop/resize to 200x200px
2. Storage:
   - Use Supabase Storage for images
   - Generate unique filename (userId + timestamp)
   - Store avatar URL in User table
3. Display:
   - Show avatar in header when logged in
   - Show avatar on booking confirmations
   - Show default avatar icon if none uploaded
4. Validation:
   - Check file type and size
   - Virus scan (if applicable)
   - Delete old avatar when new one uploaded

### Acceptance Criteria
- [ ] Users can upload avatars from profile page
- [ ] Avatars display throughout the app
- [ ] File validation works correctly
- [ ] Old avatars cleaned up on replacement
- [ ] Mobile-responsive upload UI

### Files to Create/Modify
- `src/app/profile/page.tsx` - Add upload UI
- `src/lib/actions/user.ts` - Add avatar upload action
- `src/lib/supabase/storage.ts` - Storage utilities
- Database: Add `avatarUrl` to User table
- `src/components/layout/header.tsx` - Display avatar
```

---

### 3. Building the Feature with Claude

**Prompt Template:**

```
I want to implement [Feature Name] from PRD.md. Here's the task list:

[Copy the entire task list from PRD]

Please help me implement this feature step by step.
```

**Example:**
```
I want to implement User Profile Avatars from PRD.md. Here's the task list:

[Paste the full task list here]

Please help me implement this feature step by step.
```

Claude will then:
1. Read the task list
2. Explore relevant files
3. Ask clarifying questions
4. Implement the feature systematically
5. Test and verify

---

### 4. After Completing a Feature

**Update FEATURES.md:**

1. Add the new feature to the relevant section
2. Mark it as ✅ COMPLETED
3. Add implementation date
4. List key files created/modified
5. Document any important technical details

**Update PRD.md:**

1. Change feature status from "Planned" to "Completed"
2. Move it to the "Recent Completions" section (optional)

**Example Update to FEATURES.md:**
```markdown
### ✅ User Profile Avatars
**Status:** COMPLETED
**Date Added:** 2026-01-25
**Files:** `src/app/profile/*`, `src/lib/supabase/storage.ts`

**Features:**
- Upload avatar images (JPG, PNG, WebP)
- Automatic resize to 200x200px
- Display throughout app (header, bookings)
- Default avatar for users without upload

**Technical Details:**
- Uses Supabase Storage bucket `avatars`
- Filename format: `{userId}_{timestamp}.{ext}`
- Max file size: 5MB
- Auto-cleanup of old avatars

**Key Files:**
- `src/app/profile/page.tsx` - Upload UI
- `src/lib/actions/user.ts` - Upload action
- `src/lib/supabase/storage.ts` - Storage helpers
```

---

## Quick Reference

### When to Update Each Document

| Situation | Update This |
|-----------|-------------|
| Just finished building a feature | FEATURES.md ✅ |
| Want to plan a new feature | PRD.md (add to backlog) |
| Need to onboard someone new | README.md |
| Want Claude to build something | PRD.md (create task list) |
| Discovered technical debt | PRD.md (technical debt section) |
| App crashes in production | README.md (add to known issues) |

---

## Tips for Working with Claude

### ✅ Do This:
- **Be specific** in task lists (which files, what exactly to do)
- **Include context** (why the feature is needed)
- **List acceptance criteria** (how to verify it works)
- **Reference existing patterns** ("Similar to how booking works...")
- **Ask Claude to read PRD** before starting work

### ❌ Avoid This:
- Vague requests ("make it better")
- No acceptance criteria
- Forgetting to update FEATURES.md after completion
- Skipping the planning step for complex features

---

## Example Workflow: Full Feature Lifecycle

Let's walk through adding "Email Reminders" feature:

### Step 1: Add to PRD (5 min)
```markdown
### Feature: 24-Hour Booking Reminders
**Priority:** High
**Status:** Planned

[Write description, user story, task list]
```

### Step 2: Ask Claude to Implement (30-60 min)
```
I want to implement 24-Hour Booking Reminders from PRD.md.

[Paste task list]

Please implement this feature.
```

### Step 3: Test the Feature (15 min)
- Manually test reminder emails
- Check cron job runs
- Verify edge cases

### Step 4: Update FEATURES.md (5 min)
```markdown
### ✅ Email Reminders
**Status:** COMPLETED
**Date:** 2026-01-25
[Document implementation]
```

### Step 5: Update PRD.md (2 min)
```markdown
**Status:** Completed ✅
```

---

## Maintaining Your Documentation

### Weekly Maintenance
- Review PRD backlog, reprioritize if needed
- Archive completed features from PRD to FEATURES
- Add any new ideas or bugs discovered

### Monthly Review
- Update README with any new setup steps
- Review technical debt items
- Check if any features are blocked
- Update roadmap priorities

---

## Templates

### Feature Request Template (for PRD.md)
```markdown
### Feature: [Name]
**Requested By:** [Name]
**Date:** [YYYY-MM-DD]
**Priority:** [High/Medium/Low]
**Status:** [New/Planned/In Progress/Completed]

**Description:**
[Clear explanation]

**User Story:**
As a [user type], I want [goal] so that [benefit].

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Task List for Claude:**
## Task: [Name]

### Context
[Why this is needed]

### Requirements
1. [Detailed requirement]
2. [Another requirement]

### Acceptance Criteria
- [ ] Testable criterion

### Files to Create/Modify
- `path/to/file.ts` - Description
```

### Feature Documentation Template (for FEATURES.md)
```markdown
### ✅ [Feature Name]
**Status:** COMPLETED
**Date Added:** [YYYY-MM-DD]
**Files:** `src/path/*`

**Features:**
- Feature point 1
- Feature point 2

**Technical Details:**
- Important implementation note
- Architecture decision

**Key Files:**
- `src/file.ts` - Purpose
```

---

## Need Help?

If you're unsure what to do:
1. Check this guide first
2. Look at existing examples in FEATURES.md and PRD.md
3. Ask Claude: "How should I document [X] in the project docs?"

---

**Remember:** These docs are living documents. Keep them updated as your project evolves!
