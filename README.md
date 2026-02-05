# Darsii

A lesson scheduling platform for students and teachers. Students book recurring lessons, teachers manage availability, and both sides track attendance and payments. Supports English and Arabic with full RTL, plus automatic timezone conversion.

## Features

- **Role-based access** -- Students, teachers, and a superuser admin role
- **Calendar dashboard** -- Month and week views with lesson cards showing status
- **Recurring schedules** -- Students set up weekly lessons with their matched teachers
- **Teacher availability** -- Teachers mark busy times on a 24-hour, 7-day grid; everything else is available
- **Rescheduling** -- 5-week lookahead calendar with slot conflict detection
- **Timezone support** -- Auto-detected per user, overridable from the header; all times convert between teacher and student timezones
- **Bilingual** -- English and Arabic with RTL layout switching
- **Payment tracking** -- Monthly billing periods with mark-as-paid workflow
- **Admin panel** -- Create and manage student-teacher matches

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v4 |
| Database & Auth | Supabase (Postgres, Auth, Row-Level Security) |
| Hosting | Cloudflare Pages |
| Routing | React Router v7 |

## Database Schema

```
profiles
  id (uuid, FK -> auth.users)
  email (text)
  display_name (text)
  role (text: 'student' | 'teacher')
  is_superuser (boolean)
  timezone (text, IANA identifier)

teacher_availability
  id (uuid)
  teacher_id (uuid, FK -> profiles)
  day_of_week (int, 0=Sun..6=Sat)
  start_time (text, "HH:MM")
  end_time (text, "HH:MM")

student_teacher_matches
  id (uuid)
  student_id (uuid, FK -> profiles)
  teacher_id (uuid, FK -> profiles)
  is_active (boolean)
  matched_at (timestamp)

recurring_schedules
  id (uuid)
  match_id (uuid, FK -> student_teacher_matches)
  day_of_week (int)
  start_time (text)
  end_time (text)
  is_active (boolean)

lesson_instances
  id (uuid)
  schedule_id (uuid, FK -> recurring_schedules)
  original_date (date)
  actual_date (date)
  actual_start_time (text)
  actual_end_time (text)
  status (text: scheduled | completed | missed | rescheduled | cancelled)
  rescheduled_from (date)

payments
  id (uuid)
  match_id (uuid, FK -> student_teacher_matches)
  billing_period_start (date)
  billing_period_end (date)
  lessons_count (int)
  paid_at (timestamp)
  marked_paid_by (uuid, FK -> profiles)
```

## Timezone System

All times in the database are stored in the **teacher's timezone**. Conversion happens at the UI boundary:

- **Student viewing teacher's lessons** -- times convert from teacher TZ to student TZ
- **Student booking a slot** -- selected time converts from student TZ back to teacher TZ before saving
- **Teacher viewing own data** -- no conversion (times are already in their timezone)
- **Timezone detection** -- auto-detected via `Intl.DateTimeFormat` on first login, saved to profile
- **Manual override** -- timezone selector in the header, updates immediately

The conversion handles day-of-week shifts across midnight (e.g., a Monday 11 PM lesson in New York appears as Tuesday 6 AM in Damascus).

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Cloudflare](https://cloudflare.com) account (for deployment)

### 1. Clone and install

```bash
git clone https://github.com/olsisadiku/calendly.git
cd calendly
npm install
```

### 2. Set up Supabase

Create a Supabase project and run the migrations. The app needs these tables (see schema above). You can find the migration history via the Supabase dashboard or apply them manually.

Enable **Google OAuth** in Supabase Auth settings if you want Google sign-in. Set the redirect URL to `http://localhost:5173/auth/callback` for local development.

### 3. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Both values are from your Supabase project's **Settings > API** page. The anon key is the public key (safe for client-side use with RLS enabled).

### 4. Set up a superuser

The admin panel is gated behind the `is_superuser` flag on the `profiles` table. After signing up, set your account as superuser directly in the database:

```sql
UPDATE profiles SET is_superuser = true WHERE email = 'your-email@example.com';
```

### 5. Run locally

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Deployment (Cloudflare Pages)

### Option A: GitHub integration (recommended)

1. Go to the [Cloudflare Dashboard](https://dash.cloudflare.com) > **Workers & Pages** > **Create**
2. Select **Pages** > **Connect to Git** > pick this repo
3. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Deploy -- every push to `main` auto-deploys

After deploying, update the Google OAuth redirect URL in Supabase to include your production domain: `https://your-domain.pages.dev/auth/callback`.

### Option B: Manual deploy via CLI

```bash
npx wrangler login
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run deploy
```

## Project Structure

```
src/
  components/
    auth/           -- Login form, Google sign-in button
    calendar/       -- CalendarGrid, CalendarDay, CalendarHeader, LessonCard, RescheduleModal
    layout/         -- AppLayout, Header (with timezone selector), Sidebar
    payments/       -- PaymentHistory, PaymentReminderModal, PaymentStatusBadge
    ui/             -- Button, Input, Select, Modal, Badge, Spinner, Toast, TimezoneSelector
  contexts/
    AuthContext     -- Supabase session, profile, sign-in/out
    LanguageContext  -- EN/AR locale, RTL direction, translation function
  hooks/
    useProfile      -- Role, timezone, display name
    useCalendarData -- Transforms schedules + instances into calendar lessons with TZ conversion
    useRecurringSchedule -- CRUD for recurring lesson schedules
    useTeacherAvailability -- CRUD for teacher busy times
    useLessonInstances -- Lesson instance queries
    usePayments     -- Payment record queries
  lib/
    supabase        -- Supabase client initialization
    database.types  -- Generated TypeScript types for all tables
    translations    -- EN + AR translation strings
    constants       -- Day names, lesson status enum
  pages/
    LoginPage       -- Auth page with Google + email/password
    RoleSelectionPage -- First-time role picker
    DashboardPage   -- Calendar views + lesson management
    SchedulePage    -- Student sets up recurring lessons
    AvailabilityPage -- Teacher marks busy times
    AdminPage       -- Superuser match management
  utils/
    timezone        -- detectTimezone, convertTime, convertDayAndTime, getSupportedTimezones
    calendar        -- date-fns wrappers, time formatting, lesson date generation
    billing         -- Billing period calculation
    cn              -- Class name utility
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build |
| `npm run preview` | Preview production build locally |
| `npm run deploy` | Build and deploy to Cloudflare Pages |
| `npm run lint` | Run ESLint |

## License

MIT
