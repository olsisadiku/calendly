export const SUPERUSER_EMAIL = 'sadikuolsi2001@gmail.com'

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

export const LESSON_STATUSES = {
  scheduled: 'scheduled',
  completed: 'completed',
  missed: 'missed',
  rescheduled: 'rescheduled',
  cancelled: 'cancelled',
} as const

export type LessonStatus = (typeof LESSON_STATUSES)[keyof typeof LESSON_STATUSES]
