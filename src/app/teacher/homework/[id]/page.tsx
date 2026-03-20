'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

export default function HomeworkDetailPage() {
  const router = useRouter()
  const params = useParams()
  const homeworkId = params.id

  const [homework, setHomework] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, submitted: 0, correct: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)

  useEffect(() => {
    fetchData()
  }, [homeworkId])

  const fetchData = async () => {
    const { data: hwData } = await supabase
      .from('homeworks')
      .select('*, classes(name), teacher:profiles(name)')
      .eq('id', homeworkId)
      .single()

    if (!hwData) {
      alert('作业不存在')
      router.push('/teacher')
      return
    }
    setHomework(hwData)

    const { data: hqData } = await supabase
      .from('homework_questions')
      .select('*, questions(*)')
      .eq('homework_id', homeworkId)
      .order('order_index')

    const questionsList = hqData?.map(hq => hq.questions) || []
    setQuestions(questionsList)

    const { data: subsData } = await supabase
      .from('submissions')
      .select('*, student:profiles(name, email)')
      .eq('homework_id', homeworkId)

    const subs = subsData || []

    const studentMap = new Map()
    subs.forEach(s => {
      const sid = s.student_id
      if (!studentMap.has(sid)) {
        studentMap.set(sid, {
          student_id: sid,
          student_name: s.student?.name || '未知',
          student_email: s.student?.email || '',
          answers: {},
          correctCount: 0,
          totalCount: 0
        })
      }
      const student = studentMap.get(sid)
      student.answers[s.question_id] = {
        answer: s.answer_text,
        is_correct: s.is_correct
      }
      if (s.is_correct === true) student.correctCount++
      student.totalCount++
    })

    const studentList = Array.from(studentMap.values())
    setSubmissions(studentList)

    const choiceQuestions = questionsList.filter(q => q.type === 'choice')
    setStats({
      total: choiceQuestions.length,
      submitted: studentList.length,
      correct: studentList.reduce((sum, s) => sum + s.correctCount, 0)
    })

    setLoading(false)
  }

  const getAnswerForQuestion = (studentId: string, questionId: number) => {
    const student = submissions.find(s => s.student_id === studentId)
    if (!student) return '-'
    const answer = student.answers[questionId]
    if (!answer) return '未作答'
    return answer.answer || '-'
  }

  const isCorrectForQuestion = (studentId: string, questionId: number) => {
    const student = submissions.find(s => s.student_id === studentId)
    if (!student) return null
    const answer = student.answers[questionId]
    return answer?.is_correct
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">作业详情</h1>
          <button onClick={() => router.push('/teacher')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-xl font-bold">{homework?.title}</h2>
          <p className="text-gray-500 mt-1">{homework?.classes?.name}</p>
          {homework?.deadline && (
            <p className="text-orange-600 mt-1">截止：{new Date(homework.deadline).toLocaleString()}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-blue-600">{submissions.length}</div>
            <div className="text-gray-600">已提交人数</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600">
              {questions.filter(q => q.type === 'choice').length}
            </div>
            <div className="text-gray-600">选择题数量</div>
          </div>
          <div className="bg-indigo-100 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold text-indigo-600">
              {stats.total > 0 ? Math.round(stats.correct / (stats.total * Math.max(submissions.length, 1)) * 100) : 0}%
            </div>
            <div className="text-gray-600">选择题正确率</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h3 className="font-bold mb-4">学生提交情况</h3>
          {submissions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无学生提交</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">学生</th>
                    {questions.filter(q => q.type === 'choice').map((q, i) => (
                      <th key={q.id} className="p-2 text-center">题{i + 1}</th>
                    ))}
                    <th className="p-2 text-center">正确率</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map(sub => {
                    const choiceQuestions = questions.filter(q => q.type === 'choice')
                    const correctRate = choiceQuestions.length > 0 
                      ? Math.round((sub.correctCount / choiceQuestions.length) * 100) 
                      : 0
                    return (
                      <tr key={sub.student_id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{sub.student_name}</td>
                        {choiceQuestions.map(q => {
                          const isCorrect = isCorrectForQuestion(sub.student_id, q.id)
                          return (
                            <td key={q.id} className={`p-2 text-center ${
                              isCorrect === true ? 'text-green-600' : 
                              isCorrect === false ? 'text-red-600' : ''
                            }`}>
                              {getAnswerForQuestion(sub.student_id, q.id)}
                            </td>
                          )
                        })}
                        <td className="p-2 text-center font-medium">
                          <span className={`${
                            correctRate >= 80 ? 'text-green-600' : 
                            correctRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {correctRate}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">题目列表</h3>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={q.id} className="border p-3 rounded-lg">
                <div className="flex gap-2 mb-2">
                  <span className="font-bold">第{i + 1}题</span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    q.type === 'choice' ? 'bg-blue-100 text-blue-700' : 
                    q.type === 'fill' ? 'bg-green-100 text-green-700' : 
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {q.type === 'choice' ? '选择题' : q.type === 'fill' ? '填空题' : '拍照题'}
                  </span>
                </div>
                <p className="text-gray-800">{q.content}</p>
                {q.options && (
                  <p className="text-sm text-gray-600 mt-1">
                    {q.options.map((opt: string, idx: number) => (
                      <span key={idx} className="mr-3">{String.fromCharCode(65 + idx)}. {opt}</span>
                    ))}
                  </p>
                )}
                <p className="text-sm text-green-600 mt-1">正确答案：{q.correct_answer}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
