'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function CreateHomeworkContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const classId = searchParams.get('class_id')
  const className = searchParams.get('class_name')

  const [questions, setQuestions] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [homeworkTitle, setHomeworkTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [creating, setCreating] = useState(false)

  const [filters, setFilters] = useState({
    grade: '',
    topic_id: '',
    type: ''
  })

  const [topics, setTopics] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [filters])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !classId) {
      router.push('/teacher/classes')
      return
    }
    setUser(user)

    let query = supabase.from('questions').select('*, topics(name)').eq('teacher_id', user.id)
    
    if (filters.grade) query = query.eq('grade', filters.grade)
    if (filters.topic_id) query = query.eq('topic_id', filters.topic_id)
    if (filters.type) query = query.eq('type', filters.type)

    const [questionsRes, topicsRes] = await Promise.all([
      query,
      supabase.from('topics').select('*')
    ])

    setQuestions(questionsRes.data || [])
    setTopics(topicsRes.data || [])
    setLoading(false)
  }

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleCreate = async () => {
    if (!homeworkTitle.trim()) {
      alert('请输入作业标题')
      return
    }
    if (selectedIds.length === 0) {
      alert('请至少选择一道题目')
      return
    }

    setCreating(true)

    const { data: homework, error: hwError } = await supabase.from('homeworks').insert({
      teacher_id: user.id,
      class_id: parseInt(classId || '0'),
      title: homeworkTitle,
      deadline: deadline || null
    }).select().single()

    if (hwError) {
      alert('创建失败：' + hwError.message)
      setCreating(false)
      return
    }

    const questionsToInsert = selectedIds.map((qId, index) => ({
      homework_id: homework.id,
      question_id: qId,
      order_index: index
    }))

    const { error: qError } = await supabase.from('homework_questions').insert(questionsToInsert)

    if (qError) {
      alert('创建作业题目关联失败')
      setCreating(false)
      return
    }

    alert('作业布置成功！')
    router.push('/teacher')
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">布置作业</h1>
          <button onClick={() => router.push('/teacher/classes')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-bold mb-4">作业信息</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">作业标题 *</label>
              <input
                type="text"
                value={homeworkTitle}
                onChange={(e) => setHomeworkTitle(e.target.value)}
                className="w-full border p-2 rounded"
                placeholder="如：化学反应单元测验"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">截止时间</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded">
            <span className="font-medium">布置给：</span>
            <span className="text-indigo-600">{decodeURIComponent(className || '')}</span>
            <span className="ml-4 text-sm text-gray-500">
              已选择 <span className="font-bold text-indigo-600">{selectedIds.length}</span> 道题目
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <h2 className="font-bold mb-4">筛选题目</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">年级</label>
              <select
                value={filters.grade}
                onChange={(e) => setFilters({...filters, grade: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="">全部年级</option>
                <option value="高一">高一</option>
                <option value="高二">高二</option>
                <option value="高三">高三</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">专题</label>
              <select
                value={filters.topic_id}
                onChange={(e) => setFilters({...filters, topic_id: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="">全部专题</option>
                {topics.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">题型</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                className="w-full border p-2 rounded"
              >
                <option value="">全部题型</option>
                <option value="choice">选择题</option>
                <option value="fill">填空题</option>
                <option value="photo">拍照题</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold">题目列表（共 {questions.length} 题）</h2>
            <button
              onClick={handleCreate}
              disabled={creating || selectedIds.length === 0}
              className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? '布置中...' : '确认布置作业'}
            </button>
          </div>

          {questions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无符合条件的题目</div>
          ) : (
            <div className="divide-y">
              {questions.map(q => (
                <div
                  key={q.id}
                  onClick={() => toggleSelect(q.id)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedIds.includes(q.id) ? 'bg-indigo-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 border-2 rounded flex items-center justify-center mt-1 ${
                      selectedIds.includes(q.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'
                    }`}>
                      {selectedIds.includes(q.id) && (
                        <span className="text-white text-sm">✓</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          q.type === 'choice' ? 'bg-blue-100 text-blue-700' : 
                          q.type === 'fill' ? 'bg-green-100 text-green-700' : 
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {q.type === 'choice' ? '选择题' : q.type === 'fill' ? '填空题' : '拍照题'}
                        </span>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100">{q.grade}</span>
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
                    </div>
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

export default function CreateHomeworkPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">加载中...</div>}>
      <CreateHomeworkContent />
    </Suspense>
  )
}
