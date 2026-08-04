# Notevoro Database Migrations

Production-ready PostgreSQL/Supabase database architecture for Notevoro SaaS platform.

## Overview

This migration system provides a modular, scalable database architecture designed to support hundreds of thousands of users across three workspaces:
- Student Workspace
- Educator Workspace  
- Work & Personal Workspace

## Migration Structure

Migrations are organized by domain and must be run in numerical order:

### Core Migrations (Required)

1. **001_auth.sql** - Authentication & User Management
   - Tables: profiles, user_settings, user_preferences, user_stats, activity_log
   - Functions: create_profile, initialize_user_records, log_activity, update_user_stats
   - Triggers: Auto-create user records on signup

2. **002_billing.sql** - Billing & Subscription System
   - Tables: usage_limits, subscriptions, payments, payment_attempts, refunds, webhook_events, subscription_history
   - Functions: get_user_subscription, create_or_update_subscription, cancel_subscription, create_payment, update_payment_status, create_refund, log_webhook_event
   - Supports: Razorpay, Stripe, PayPal

3. **003_usage.sql** - Event-Based Usage Engine
   - Tables: usage_events, daily_usage_cache, monthly_usage_cache
   - Functions: record_usage_event, get_daily_usage, get_monthly_usage, check_usage_limit, get_user_usage_limits, aggregate_daily_to_monthly, cleanup_old_usage_events
   - Server-side usage tracking for all AI features

4. **004_ai_workspace.sql** - AI Workspace
   - Tables: conversations, messages, attachments, artifacts, tool_calls, sources, citations, memories, generated_images, web_results, youtube_results
   - Functions: create_conversation, add_message, store_memory, get_user_memories, archive_conversation
   - Multi-modal AI with proper data relationships

5. **005_notes.sql** - Notes System
   - Tables: folders, notes, note_versions, note_tags, note_tag_relations, note_files
   - Functions: create_folder, create_note, update_note, create_tag, add_tag_to_note, add_file_to_note, restore_note_version, archive_note, trash_note, delete_note_permanently
   - Google Docs-style with version history

6. **006_learning.sql** - Learning System
   - Tables: flashcard_sets, flashcards, quiz_sets, quiz_questions, practice_tests, test_results, atlas_sessions, atlas_steps, atlas_progress, presentations, research_reports, study_guides
   - Functions: create_flashcard_set, add_flashcard, update_flashcard_review, create_quiz_set, create_practice_test, submit_test_result, create_atlas_session, create_presentation, create_research_report
   - Spaced repetition for flashcards

7. **007_storage.sql** - File Storage System
   - Tables: files, storage_usage, storage_logs
   - Functions: register_file, delete_file, get_user_storage_usage, log_file_access, cleanup_deleted_files, recalculate_storage_usage
   - Track file ownership and storage quotas

8. **008_calendar.sql** - Calendar System
   - Tables: events, reminders, recurring_events
   - Functions: create_event, create_reminder, create_recurring_event, generate_recurring_events, get_events_for_range, mark_reminder_sent, dismiss_reminder
   - Designed for future calendar syncing

9. **010_rls.sql** - Row Level Security
- Helper functions: is_owner, is_admin, is_premium, is_teacher, is_employee, is_org_member, current_user_id
- Security policies for all tables
- Server-side only - never trust client

### Future Modules (Optional)

10. **009_future_modules.sql** - Future Workspace Modules
    - Organizations, employees, classrooms, assignments, analytics, shared workspaces, collaboration
    - Designed for future expansion without schema redesign

### Note on Indexes, Functions, and Triggers
Indexes, functions, and triggers are included within each domain-specific migration file (001-010) rather than in separate files. This keeps related functionality together and makes each migration self-contained.

## Running Migrations

### Development

Run migrations in order using Supabase SQL Editor:

```bash
# Run each migration file in numerical order
001_auth.sql
002_billing.sql
003_usage.sql
004_ai_workspace.sql
005_notes.sql
006_learning.sql
007_storage.sql
008_calendar.sql
010_rls.sql
```

### Production

Use a migration tool like Supabase Migrations or a custom script:

```bash
# Example using Supabase CLI
supabase db push
```

## Key Design Principles

### 1. Fully Normalized
- No data duplication
- Proper foreign key relationships
- Correct ON DELETE behavior

### 2. Modular & Maintainable
- Each migration is self-contained
- Clear separation of concerns
- Easy to extend without breaking existing code

### 3. Highly Performant
- Comprehensive indexing strategy
- Optimized for common query patterns
- Efficient joins and lookups

### 4. Secure
- Row Level Security on all tables
- Helper functions for common checks
- Server-side validation only
- No client-controlled billing or usage

### 5. Future-Proof
- Designed for international launch
- Supports multiple payment providers
- Ready for organization features
- Extensible for new workspaces

## Important Notes

### OAuth Fix

The original OAuth issue was caused by schema mismatch between the `profiles` table and the profile creation functions. The new schema in `001_auth.sql` fixes this by including all columns in the INSERT statements.

### Usage Tracking

All AI features must record usage events using `record_usage_event()`. This is enforced server-side and cannot be bypassed by the client.

### Storage Quotas

Storage is tracked per user with category-based breakdowns. The system automatically enforces limits based on subscription plan.

### Version History

Notes have full version history. Old versions are never deleted, allowing for complete audit trails and restore functionality.

### Spaced Repetition

Flashcards use a simplified SM-2 algorithm for spaced repetition. The `update_flashcard_review()` function handles the scheduling.

## Scheduled Jobs

The following functions should be run as scheduled jobs:

1. `aggregate_daily_to_monthly(p_date)` - Run daily to aggregate usage data
2. `cleanup_old_usage_events(p_days_to_keep)` - Run weekly to clean up old events
3. `cleanup_deleted_files(p_days_to_keep)` - Run weekly to clean up deleted files
4. `generate_recurring_events(p_recurring_event_id)` - Run daily to generate recurring events

## Rollback Strategy

Each migration should include rollback comments for manual rollback if needed. For production, consider using a migration tool with built-in rollback support.

## Testing

Before deploying to production:

1. Test all migrations in a staging environment
2. Verify RLS policies work correctly
3. Test all helper functions
4. Verify indexing improves performance
5. Test scheduled jobs
6. Verify OAuth flow works correctly

## Support

For issues or questions about the database schema, refer to the individual migration files which contain detailed inline documentation.
