import { useMemo } from 'react'
import type { RecurringSchedule, LessonInstance, StudentTeacherMatch } from '../lib/database.types'
import { generateLessonDates, format, isSameDay, parseISO } from '../utils/calendar'
import { convertTime } from '../utils/timezone'
import type { LessonStatus } from '../lib/constants'

export interface CalendarLesson {
  date: Date
  dateStr: string
  dayOfWeek: number
  startTime: string
  endTime: string
  scheduleId: string
  matchId: string
  teacherId: string
  teacherName: string
  studentName: string
  teacherTimezone: string
  instanceId: string | null
  status: LessonStatus
  actualDate: string | null
  rescheduledFrom: string | null
}

export function useCalendarData(
  matches: (StudentTeacherMatch & { teacher_name: string; student_name: string; teacher_timezone: string })[],
  schedules: RecurringSchedule[],
  instances: LessonInstance[],
  rangeStart: Date,
  rangeEnd: Date,
  viewerTimezone: string,
) {
  return useMemo(() => {
    const lessons: CalendarLesson[] = []

    for (const match of matches) {
      const matchSchedules = schedules.filter((s) => s.match_id === match.id && s.is_active)
      const teacherTZ = match.teacher_timezone

      for (const schedule of matchSchedules) {
        const dates = generateLessonDates(schedule.day_of_week, rangeStart, rangeEnd)

        for (const date of dates) {
          const dateStr = format(date, 'yyyy-MM-dd')
          const instance = instances.find(
            (i) => i.schedule_id === schedule.id && i.original_date === dateStr
          )

          // If rescheduled, this date is void — the new date will be added separately
          if (instance?.status === 'rescheduled') {
            const startTime = instance.actual_start_time ?? schedule.start_time
            const endTime = instance.actual_end_time ?? schedule.end_time
            const actualDateStr = instance.actual_date

            // Convert from teacher TZ to viewer TZ
            let displayDateStr = actualDateStr
            let displayStart = startTime
            let displayEnd = endTime

            if (teacherTZ !== viewerTimezone) {
              const convStart = convertTime(startTime, actualDateStr, teacherTZ, viewerTimezone)
              const convEnd = convertTime(endTime, actualDateStr, teacherTZ, viewerTimezone)
              displayDateStr = convStart.dateStr
              displayStart = convStart.time
              displayEnd = convEnd.time
            }

            const displayDate = parseISO(displayDateStr)
            if (displayDate >= rangeStart && displayDate <= rangeEnd) {
              lessons.push({
                date: displayDate,
                dateStr: displayDateStr,
                dayOfWeek: schedule.day_of_week,
                startTime: displayStart,
                endTime: displayEnd,
                scheduleId: schedule.id,
                matchId: match.id,
                teacherId: match.teacher_id,
                teacherName: match.teacher_name,
                studentName: match.student_name,
                teacherTimezone: teacherTZ,
                instanceId: instance.id,
                status: 'rescheduled',
                actualDate: instance.actual_date,
                rescheduledFrom: instance.original_date,
              })
            }
            continue
          }

          // If cancelled, skip entirely
          if (instance?.status === 'cancelled') continue

          const startTime = schedule.start_time
          const endTime = schedule.end_time

          // Convert from teacher TZ to viewer TZ
          let displayDateStr = dateStr
          let displayStart = startTime
          let displayEnd = endTime

          if (teacherTZ !== viewerTimezone) {
            const convStart = convertTime(startTime, dateStr, teacherTZ, viewerTimezone)
            const convEnd = convertTime(endTime, dateStr, teacherTZ, viewerTimezone)
            displayDateStr = convStart.dateStr
            displayStart = convStart.time
            displayEnd = convEnd.time
          }

          const displayDate = parseISO(displayDateStr)

          lessons.push({
            date: displayDate,
            dateStr: displayDateStr,
            dayOfWeek: schedule.day_of_week,
            startTime: displayStart,
            endTime: displayEnd,
            scheduleId: schedule.id,
            matchId: match.id,
            teacherId: match.teacher_id,
            teacherName: match.teacher_name,
            studentName: match.student_name,
            teacherTimezone: teacherTZ,
            instanceId: instance?.id ?? null,
            status: (instance?.status as LessonStatus) ?? 'scheduled',
            actualDate: instance?.actual_date ?? null,
            rescheduledFrom: instance?.rescheduled_from ?? null,
          })
        }
      }
    }

    return lessons.sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [matches, schedules, instances, rangeStart, rangeEnd, viewerTimezone])
}

export function getLessonsForDay(lessons: CalendarLesson[], day: Date): CalendarLesson[] {
  return lessons.filter((l) => isSameDay(l.date, day))
}
