'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const [newQuestion, setNewQuestion] = useState({
    content: '',
    type: 'choice',
    grade: '高一',
    difficulty: 3,
    topic_id: '',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const [questionsRes, topicsRes] = await Promise.all([
      supabase.from('questions').select('*, topics(name)').eq('teacher_id', user.id),
      supabase.from('topics').select('*')
    ])

    setQuestions(questionsRes.data || [])
    setTopics(topicsRes.data || [])
    setLoading(false)
  }

  const handleAddQuestion = async () => {
    if (!newQuestion.content || !newQuestion.correct_answer) {
      alert('请填写题目内容和正确答案')
      return
    }

    const { error } = await supabase.from('questions').insert({
      teacher_id: user.id,
      content: newQuestion.content,
      type: newQuestion.type,
      grade: newQuestion.grade,
      difficulty: newQuestion.difficulty,
      topic_id: newQuestion.topic_id || null,
      options: newQuestion.type === 'choice' ? newQuestion.options.filter(o => o) : null,
      correct_answer: newQuestion.correct_answer,
      explanation: newQuestion.explanation || null
    })

    if (error) {
      alert('添加失败：' + error.message)
    } else {
      alert('添加成功！')
      setShowAdd(false)
      setNewQuestion({
        content: '',
        type: 'choice',
        grade: '高一',
        difficulty: 3,
        topic_id: '',
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: ''
      })
      fetchData()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这道题目吗？')) return
    await supabase.from('questions').delete().eq('id', id)
    fetchData()
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">题库管理</h1>
          <button onClick={() => router.push('/teacher')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">题目列表（共 {questions.length} 题）</h2>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/teacher/questions/import')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              📥 批量导入
            </button>
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {showAdd ? '取消添加' : '+ 添加题目'}
            </button>
          </div>
        </div>

        {showAdd && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-lg font-bold mb-4">添加新题目</h3>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">题目类型</label>
                <select
                  value={newQuestion.type}
                  onChange={(e) => setNewQuestion({...newQuestion, type: e.target.value})}
                  className="w-full border p-2 rounded"
                >
                  <option value="choice">选择题</option>
                  <option value="fill">填空题</option>
                  <option value="photo">拍照题</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">年级</label>
                <select
                  value={newQuestion.grade}
                  onChange={(e) => setNewQuestion({...newQuestion, grade: e.target.value})}
                  className="w-full border p-2 rounded"
                >
                  <option value="高一">高一</option>
                  <option value="高二">高二</option>
                  <option value="高三">高三</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">难度 (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={newQuestion.difficulty}
                  onChange={(e) => setNewQuestion({...newQuestion, difficulty: parseInt(e.target.value)})}
                  className="w-full border p-2 rounded"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">专题</label>
              <select
                value={newQuestion.topic_id}
                onChange={(e) => setNewQuestion({...newQuestion, topic_id: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="">请选择专题</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">题目内容 *</label>
              <textarea
                value={newQuestion.content}
                onChange={(e) => setNewQuestion({...newQuestion, content: e.target.value})}
                className="w-full border p-2 rounded h-20"
                placeholder="请输入题目内容..."
              />
            </div>

            {newQuestion.type === 'choice' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">选项（A/B/C/D）</label>
                {['A', 'B', 'C', 'D'].map((opt, i) => (
                  <div key={opt} className="flex gap-2 mb-2">
                    <span className="w-8 py-2 font-bold">{opt}.</span>
                    <input
                      type="text"
                      value={newQuestion.options[i]}
                      onChange={(e) => {
                        const opts = [...newQuestion.options]
                        opts[i] = e.target.value
                        setNewQuestion({...newQuestion, options: opts})
                      }}
                      className="flex-1 border p-2 rounded"
                      placeholder={`选项 ${opt}`}
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">正确答案 *</label>
              <input
                type="text"
                value={newQuestion.correct_answer}
                onChange={(e) => setNewQuestion({...newQuestion, correct_answer: e.target.value})}
                className="w-full border p-2 rounded"
                placeholder={newQuestion.type === 'choice' ? '如：A' : '请输入正确答案'}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">解析（可选）</label>
              <textarea
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
                className="w-full border p-2 rounded h-16"
                placeholder="题目解析..."
              />
            </div>

            <button
              onClick={handleAddQuestion}
              className="w-full bg-indigo-600 text-white py-3 rounded font-bold hover:bg-indigo-700"
            >
              保存题目
            </button>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无题目，点击上方按钮添加</div>
          ) : (
            <div className="divide-y">
              {questions.map((q, i) => (
                <div key={q.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{i + 1}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          q.type === 'choice' ? 'bg-blue-100 text-blue-700' : 
                          q.type === 'fill' ? 'bg-green-100 text-green-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {q.type === 'choice' ? '选择题' : q.type === 'fill' ? '填空题' : '拍照题'}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{q.grade}</span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">
                          难度: {q.difficulty}
                        </span>
                        {q.topics?.name && (
                          <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                            {q.topics.name}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-800">{q.content}</p>
                      {q.options && Array.isArray(q.options) && (
                        <div className="mt-2 text-sm text-gray-600">
                          {q.options.map((opt: string, idx: number) => (
                            <span key={idx} className="mr-4">{String.fromCharCode(65 + idx)}. {opt}</span>
                          ))}
                        </div>
                      )}
                      <p className="mt-2 text-sm text-green-600">答案：{q.correct_answer}</p>
                    </div>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="text-red-500 hover:text-red-700 ml-4"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
