'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function HomeworkPage() {
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id

  const [homework, setHomework] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [homeworkId])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const { data: hwData } = await supabase
      .from('homeworks')
      .select('*, classes(name), teacher:profiles(name)')
      .eq('id', homeworkId)
      .single()

    if (!hwData) {
      alert('作业不存在')
      router.push('/student')
      return
    }
    setHomework(hwData)

    const { data: hqData } = await supabase
      .from('homework_questions')
      .select('*, questions(*)')
      .eq('homework_id', homeworkId)
      .order('order_index')

    setQuestions(hqData?.map(hq => hq.questions) || [])

    const { data: submission } = await supabase
      .from('submissions')
      .select('*')
      .eq('homework_id', homeworkId)
      .eq('student_id', user.id)

    if (submission && submission.length > 0) {
      setSubmitted(true)
      const existingAnswers: Record<number, string> = {}
      submission.forEach((s: any) => {
        existingAnswers[s.question_id] = s.answer_text || ''
      })
      setAnswers(existingAnswers)
    }

    setLoading(false)
  }

  const handleAnswer = (questionId: number, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer })
  }

  const handleSubmit = async () => {
    if (submitted) return

    setSubmitting(true)

    const submissionsToInsert = questions.map(q => ({
      homework_id: homeworkId,
      question_id: q.id,
      student_id: user.id,
      answer_text: answers[q.id] || '',
      is_correct: q.type === 'choice' ? answers[q.id]?.toUpperCase() === q.correct_answer?.toUpperCase() : null
    }))

    const { error } = await supabase.from('submissions').insert(submissionsToInsert)

    if (error) {
      alert('提交失败：' + error.message)
    } else {
      setSubmitted(true)
      alert('作业提交成功！')
    }

    setSubmitting(false)
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">做作业</h1>
          <button onClick={() => router.push('/student')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-bold">{homework?.title}</h2>
          <p className="text-gray-500 mt-1">
            {homework?.classes?.name} | {homework?.teacher?.name}
          </p>
          {homework?.deadline && (
            <p className="text-orange-600 mt-1">
              截止：{new Date(homework.deadline).toLocaleString()}
            </p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <span className={`px-3 py-1 rounded text-sm ${submitted ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
              {submitted ? '已提交' : '未提交'}
            </span>
            <span className="text-gray-500 text-sm">
              共 {questions.length} 题
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex gap-2 mb-3">
                <span className="font-bold">第{index + 1}题</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  q.type === 'choice' ? 'bg-blue-100 text-blue-700' : 
                  q.type === 'fill' ? 'bg-green-100 text-green-700' : 
                  'bg-orange-100 text-orange-700'
                }`}>
                  {q.type === 'choice' ? '选择题' : q.type === 'fill' ? '填空题' : '拍照题'}
                </span>
              </div>

              <p className="text-lg mb-4">{q.content}</p>

              {q.options && (
                <div className="space-y-2 mb-4">
                  {q.options.map((opt: string, idx: number) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer ${
                        answers[q.id] === String.fromCharCode(65 + idx) ? 'border-indigo-500 bg-indigo-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === String.fromCharCode(65 + idx)}
                        onChange={() => handleAnswer(q.id, String.fromCharCode(65 + idx))}
                        disabled={submitted}
                        className="w-4 h-4"
                      />
                      <span className="font-medium">{String.fromCharCode(65 + idx)}. {opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.type !== 'choice' && (
                <div>
                  <label className="block text-sm font-medium mb-2">你的答案</label>
                  <textarea
                    value={answers[q.id] || ''}
                    onChange={(e) => handleAnswer(q.id, e.target.value)}
                    disabled={submitted}
                    className="w-full border p-3 rounded-lg h-24"
                    placeholder="请输入你的答案..."
                  />
                </div>
              )}

              {submitted && q.type === 'choice' && (
                <div className={`mt-3 p-3 rounded-lg ${answers[q.id] === q.correct_answer ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {answers[q.id] === q.correct_answer ? '✓ 回答正确' : `✗ 正确答案：${q.correct_answer}`}
                </div>
              )}
            </div>
          ))}
        </div>

        {!submitted && (
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-4 rounded-lg text-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? '提交中...' : '提交作业'}
            </button>
          </div>
        )}

        {submitted && (
          <div className="mt-6 bg-green-50 rounded-lg p-4 text-center">
            <p className="text-green-700 font-bold">作业已提交</p>
            <p className="text-green-600 text-sm mt-1">请等待老师批改</p>
          </div>
        )}
      </div>
    </div>
  )
}
