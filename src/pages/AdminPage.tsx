import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, StudentTeacherMatch } from '../lib/database.types'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { toast } from '../components/ui/Toast'
import { cn } from '../utils/cn'
import { useLanguage } from '../contexts/LanguageContext'

type MatchWithNames = StudentTeacherMatch & {
  student: Pick<Profile, 'display_name' | 'email'>
  teacher: Pick<Profile, 'display_name' | 'email'>
}

export function AdminPage() {
  const { t } = useLanguage()
  const [students, setStudents] = useState<Profile[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [matches, setMatches] = useState<MatchWithNames[]>([])
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const [studentsRes, teachersRes, matchesRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'student').order('display_name'),
      supabase.from('profiles').select('*').eq('role', 'teacher').order('display_name'),
      supabase
        .from('student_teacher_matches')
        .select('*, student:profiles!student_teacher_matches_student_id_fkey(display_name, email), teacher:profiles!student_teacher_matches_teacher_id_fkey(display_name, email)')
        .order('matched_at', { ascending: false }),
    ])

    setStudents(studentsRes.data ?? [])
    setTeachers(teachersRes.data ?? [])
    setMatches((matchesRes.data as unknown as MatchWithNames[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const createMatch = async () => {
    if (!selectedStudent || !selectedTeacher) return

    const existing = matches.find(
      (m) => m.student_id === selectedStudent && m.teacher_id === selectedTeacher && m.is_active
    )
    if (existing) {
      toast(t('matchAlreadyExists'), 'error')
      return
    }

    const { error } = await supabase.from('student_teacher_matches').insert({
      student_id: selectedStudent,
      teacher_id: selectedTeacher,
    })

    if (error) {
      toast(t('failedToCreateMatch'), 'error')
      return
    }

    toast(t('matchCreated'), 'success')
    setSelectedStudent(null)
    setSelectedTeacher(null)
    fetchData()
  }

  const toggleMatch = async (matchId: string, isActive: boolean) => {
    await supabase
      .from('student_teacher_matches')
      .update({ is_active: !isActive })
      .eq('id', matchId)
    fetchData()
  }

  const deleteMatch = async (matchId: string) => {
    await supabase.from('student_teacher_matches').delete().eq('id', matchId)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-warm-900">{t('adminPanel')}</h1>
        <p className="mt-1 text-warm-500">{t('matchStudentsWithTeachers')}</p>
      </div>

      {/* Match Creator */}
      <div className="bg-white rounded-xl border border-warm-100 shadow-card p-6 mb-8">
        <h2 className="font-display text-lg font-semibold text-warm-900 mb-4">{t('createNewMatch')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">{t('student')}</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-warm-900"
              value={selectedStudent ?? ''}
              onChange={(e) => setSelectedStudent(e.target.value || null)}
            >
              <option value="">{t('selectStudent')}...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.display_name ?? s.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-warm-700 mb-1">{t('teacher')}</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-warm-200 bg-white text-warm-900"
              value={selectedTeacher ?? ''}
              onChange={(e) => setSelectedTeacher(e.target.value || null)}
            >
              <option value="">{t('selectTeacher')}...</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.display_name ?? teacher.email}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={createMatch}
            disabled={!selectedStudent || !selectedTeacher}
          >
            {t('createMatch')}
          </Button>
        </div>
      </div>

      {/* Existing Matches */}
      <div className="bg-white rounded-xl border border-warm-100 shadow-card">
        <div className="px-6 py-4 border-b border-warm-100">
          <h2 className="font-display text-lg font-semibold text-warm-900">
            {t('activeMatches')} ({matches.filter((m) => m.is_active).length})
          </h2>
        </div>
        {matches.length === 0 ? (
          <div className="p-8 text-center text-warm-400">{t('noMatchesYet')}</div>
        ) : (
          <div className="divide-y divide-warm-50">
            {matches.map((match, i) => (
              <div
                key={match.id}
                className={cn(
                  'flex items-center justify-between px-6 py-4 animate-slide-up',
                  !match.is_active && 'opacity-50'
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-sm font-medium text-warm-800">
                      {match.student?.display_name ?? 'Unknown'}
                    </span>
                    <span className="mx-2 text-warm-300">&rarr;</span>
                    <span className="text-sm font-medium text-warm-800">
                      {match.teacher?.display_name ?? 'Unknown'}
                    </span>
                  </div>
                  <Badge variant={match.is_active ? 'success' : 'default'}>
                    {match.is_active ? t('active') : t('inactive')}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleMatch(match.id, match.is_active)}
                  >
                    {match.is_active ? t('deactivate') : t('activate')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => deleteMatch(match.id)}
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Lists */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
        <div className="bg-white rounded-xl border border-warm-100 shadow-card p-6">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">
            {t('students')} ({students.length})
          </h3>
          <div className="space-y-2">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
                  {s.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-warm-800">{s.display_name ?? t('unnamed')}</p>
                  <p className="text-xs text-warm-400">{s.email}</p>
                </div>
              </div>
            ))}
            {students.length === 0 && <p className="text-sm text-warm-400">{t('noStudentsYet')}</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-warm-100 shadow-card p-6">
          <h3 className="font-display text-lg font-semibold text-warm-900 mb-4">
            {t('teachers')} ({teachers.length})
          </h3>
          <div className="space-y-2">
            {teachers.map((teacher) => (
              <div key={teacher.id} className="flex items-center gap-3 py-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                  {teacher.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-medium text-warm-800">{teacher.display_name ?? t('unnamed')}</p>
                  <p className="text-xs text-warm-400">{teacher.email}</p>
                </div>
              </div>
            ))}
            {teachers.length === 0 && <p className="text-sm text-warm-400">{t('noTeachersYet')}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
