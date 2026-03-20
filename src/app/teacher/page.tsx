'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('homework')
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

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

    const [homeworksRes, questionsRes, classesRes, topicsRes] = await Promise.all([
      supabase.from('homeworks').select('*, classes(name)').eq('teacher_id', user.id).order('created_at', { ascending: false }),
      supabase.from('questions').select('*').eq('teacher_id', user.id),
      supabase.from('classes').select('*').eq('teacher_id', user.id),
      supabase.from('topics').select('*')
    ])

    setHomeworks(homeworksRes.data || [])
    setQuestions(questionsRes.data || [])
    setClasses(classesRes.data || [])
    setTopics(topicsRes.data || [])
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">🧪 化学作业系统 - 教师端</h1>
          <button onClick={handleLogout} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            退出登录
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('homework')}
              className={`px-4 py-2 rounded ${activeTab === 'homework' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              作业管理
            </button>
            <button
              onClick={() => router.push('/teacher/questions')}
              className="px-4 py-2 rounded bg-gray-200"
            >
              题库管理
            </button>
            <button
              onClick={() => router.push('/teacher/classes')}
              className="px-4 py-2 rounded bg-gray-200"
            >
              班级管理
            </button>
            <button
              onClick={() => router.push('/teacher/stats')}
              className="px-4 py-2 rounded bg-gray-200"
            >
              错题统计
            </button>
          </div>
        </div>

        {activeTab === 'homework' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">作业列表</h2>
            {homeworks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2">暂无作业</p>
                <p className="text-sm">请先创建班级，然后布置作业</p>
                <button
                  onClick={() => router.push('/teacher/classes')}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  去创建班级
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {homeworks.map(hw => (
                  <div key={hw.id} className="border p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{hw.title}</h3>
                      <p className="text-gray-500 text-sm">{hw.classes?.name || '未分配班级'}</p>
                      <p className="text-sm text-gray-400">
                        截止: {hw.deadline ? new Date(hw.deadline).toLocaleDateString() : '无限制'}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/teacher/homework/${hw.id}`)}
                      className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded hover:bg-indigo-200"
                    >
                      查看详情
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
