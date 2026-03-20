'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newClassName, setNewClassName] = useState('')
  const [creating, setCreating] = useState(false)
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

    const { data } = await supabase
      .from('classes')
      .select('*, class_members(student_id)')
      .eq('teacher_id', user.id)

    setClasses(data || [])
    setLoading(false)
  }

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  const handleCreateClass = async () => {
    if (!newClassName.trim()) {
      alert('请输入班级名称')
      return
    }

    setCreating(true)
    const classCode = generateCode()

    const { error } = await supabase.from('classes').insert({
      teacher_id: user.id,
      name: newClassName,
      class_code: classCode
    })

    if (error) {
      alert('创建失败：' + error.message)
    } else {
      alert('创建成功！班级码：' + classCode)
      setNewClassName('')
      setShowCreate(false)
      fetchData()
    }
    setCreating(false)
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert('班级码已复制！')
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">班级管理</h1>
          <button onClick={() => router.push('/teacher')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">班级列表（共 {classes.length} 个）</h2>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {showCreate ? '取消创建' : '+ 创建班级'}
          </button>
        </div>

        {showCreate && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <h3 className="text-lg font-bold mb-4">创建新班级</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 border p-2 rounded"
                placeholder="请输入班级名称，如：高一(1)班"
              />
              <button
                onClick={handleCreateClass}
                disabled={creating}
                className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {classes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无班级，点击上方按钮创建</div>
          ) : (
            <div className="divide-y">
              {classes.map(cls => (
                <div key={cls.id} className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg">{cls.name}</h3>
                      <div className="flex gap-4 mt-2">
                        <span className="text-sm text-gray-500">
                          班级码：<span className="font-mono bg-gray-100 px-2 py-1 rounded">{cls.class_code}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          学生数：{cls.class_members?.length || 0} 人
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyCode(cls.class_code)}
                        className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                      >
                        复制班级码
                      </button>
                      <button
                        onClick={() => router.push(`/teacher/homework/create?class_id=${cls.id}&class_name=${encodeURIComponent(cls.name)}`)}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm hover:bg-green-200"
                      >
                        布置作业
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="font-bold text-blue-800 mb-2">📋 使用说明</h4>
          <ol className="text-sm text-blue-700 space-y-1">
            <li>1. 创建班级后，复制班级码发给学生</li>
            <li>2. 学生登录后在"加入班级"页面输入班级码加入</li>
            <li>3. 加入班级后，学生可以看到老师布置的作业</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
