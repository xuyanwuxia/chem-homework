'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function JoinClassPage() {
  const [classCode, setClassCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [myClasses, setMyClasses] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
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
      .from('class_members')
      .select('*, classes(*)')
      .eq('student_id', user.id)

    setMyClasses(data?.map(m => m.classes).filter(c => c) || [])
  }

  const handleJoin = async () => {
    if (!classCode.trim()) {
      setError('请输入班级码')
      return
    }

    setLoading(true)
    setError('')

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('*')
      .eq('class_code', classCode.toUpperCase())
      .single()

    if (classError || !classData) {
      setError('班级码不存在，请检查后重试')
      setLoading(false)
      return
    }

    const { error: joinError } = await supabase.from('class_members').insert({
      class_id: classData.id,
      student_id: user.id
    })

    if (joinError) {
      if (joinError.code === '23505') {
        setError('你已经加入过这个班级了')
      } else {
        setError('加入失败：' + joinError.message)
      }
    } else {
      alert('加入成功！')
      setClassCode('')
      fetchData()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">加入班级</h1>
          <button onClick={() => router.push('/student')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-md mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-bold mb-4">输入班级码加入</h2>
          <div className="mb-4">
            <input
              type="text"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              className="w-full border p-3 rounded-lg text-center text-2xl font-mono tracking-widest"
              placeholder="ABC123"
              maxLength={6}
            />
          </div>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? '加入中...' : '加入班级'}
          </button>
        </div>

        {myClasses.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">我的班级</h2>
            <div className="space-y-3">
              {myClasses.map(cls => (
                <div key={cls.id} className="border p-3 rounded-lg">
                  <h3 className="font-bold">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">班级码：{cls.class_code}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h4 className="font-bold text-blue-800 mb-2">💡 提示</h4>
          <p className="text-sm text-blue-700">
            请向老师索取班级码，然后输入上方输入框中。
          </p>
        </div>
      </div>
    </div>
  )
}
