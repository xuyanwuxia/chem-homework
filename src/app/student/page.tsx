'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState('homework')
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    fetchData()
  }

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: classes } = await supabase
      .from('class_members')
      .select('classes(*)')
      .eq('student_id', user.id)

    const classIds = classes?.map(c => c.classes?.id).filter(id => id) || []
    setMyClasses(classes?.map(c => c.classes).filter(c => c) || [])

    if (classIds.length > 0) {
      const { data: homeworksData } = await supabase
        .from('homeworks')
        .select('*, classes(name), teacher:profiles(name)')
        .in('class_id', classIds)
        .order('created_at', { ascending: false })

      setHomeworks(homeworksData || [])
    }

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
          <h1 className="text-xl font-bold">🧪 化学作业系统 - 学生端</h1>
          <button onClick={handleLogout} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            退出登录
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('homework')}
              className={`px-4 py-2 rounded ${activeTab === 'homework' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              作业
            </button>
            <button
              onClick={() => router.push('/student/join')}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            >
              加入班级
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`px-4 py-2 rounded ${activeTab === 'classes' ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}
            >
              我的班级
            </button>
          </div>
        </div>

        {activeTab === 'homework' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">作业列表</h2>
            {homeworks.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2">暂无作业</p>
                <p className="text-sm">请先加入班级</p>
              </div>
            ) : (
              <div className="space-y-4">
                {homeworks.map(hw => (
                  <div key={hw.id} className="border p-4 rounded-lg hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg">{hw.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          老师：{hw.teacher?.name || '未知'} | 班级：{hw.classes?.name}
                        </p>
                        {hw.deadline && (
                          <p className="text-sm text-orange-600 mt-1">
                            截止：{new Date(hw.deadline).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/student/homework/${hw.id}`)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                      >
                        做作业
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">我的班级</h2>
            {myClasses.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="mb-2">你还没有加入任何班级</p>
                <button
                  onClick={() => router.push('/student/join')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                  加入班级
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myClasses.map(cls => (
                  <div key={cls.id} className="border p-4 rounded-lg">
                    <h3 className="font-bold">{cls.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">班级码：{cls.class_code}</p>
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
