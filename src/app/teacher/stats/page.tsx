'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function StatsPage() {
  const [loading, setLoading] = useState(true)
  const [questionStats, setQuestionStats] = useState<any[]>([])
  const [topicStats, setTopicStats] = useState<any[]>([])
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedHomework, setSelectedHomework] = useState<string>('all')
  const [weakTopics, setWeakTopics] = useState<any[]>([])
  const [recommendQuestions, setRecommendQuestions] = useState<any[]>([])
  const [showRecommend, setShowRecommend] = useState(false)
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [selectedHomework])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    setUser(user)

    const [homeworksRes, classesRes] = await Promise.all([
      supabase.from('homeworks').select('*, classes(name)').eq('teacher_id', user.id),
      supabase.from('classes').select('*').eq('teacher_id', user.id)
    ])

    setHomeworks(homeworksRes.data || [])
    setClasses(classesRes.data || [])

    let submissionsQuery = supabase
      .from('submissions')
      .select('*, homework:homeworks(id, title), question:questions(id, content, type, topic_id, topics(name))')

    if (selectedHomework !== 'all') {
      submissionsQuery = submissionsQuery.eq('homework_id', selectedHomework)
    }

    const { data: submissionsData } = await submissionsQuery

    if (submissionsData && submissionsData.length > 0) {
      const questionMap = new Map()
      const topicMap = new Map()

      submissionsData.forEach(sub => {
        const q = sub.question
        if (!q || q.type !== 'choice') return

        if (!questionMap.has(q.id)) {
          questionMap.set(q.id, {
            question_id: q.id,
            content: q.content,
            topic_name: q.topics?.name || '未分类',
            topic_id: q.topic_id,
            total: 0,
            correct: 0
          })
        }

        const qStat = questionMap.get(q.id)
        qStat.total++
        if (sub.is_correct === true) qStat.correct++

        if (q.topic_id) {
          if (!topicMap.has(q.topic_id)) {
            topicMap.set(q.topic_id, {
              topic_id: q.topic_id,
              topic_name: q.topics?.name || '未分类',
              total: 0,
              correct: 0
            })
          }
          const tStat = topicMap.get(q.topic_id)
          tStat.total++
          if (sub.is_correct === true) tStat.correct++
        }
      })

      const qStats = Array.from(questionMap.values())
        .map(q => ({
          ...q,
          wrong_rate: Math.round((1 - q.correct / q.total) * 100)
        }))
        .sort((a, b) => b.wrong_rate - a.wrong_rate)

      const tStats = Array.from(topicMap.values())
        .map(t => ({
          ...t,
          wrong_rate: Math.round((1 - t.correct / t.total) * 100)
        }))
        .sort((a, b) => b.wrong_rate - a.wrong_rate)

      setQuestionStats(qStats)
      setTopicStats(tStats)
      setWeakTopics(tStats.filter(t => t.wrong_rate >= 20))
    } else {
      setQuestionStats([])
      setTopicStats([])
      setWeakTopics([])
    }

    setLoading(false)
  }

  const loadRecommendQuestions = async (topicId: number) => {
    setSelectedTopicId(topicId)
    const topic = topicStats.find(t => t.topic_id === topicId)
    
    const { data } = await supabase
      .from('questions')
      .select('*, topics(name)')
      .eq('topic_id', topicId)
      .eq('type', 'choice')
      .limit(5)

    setRecommendQuestions(data || [])
    setShowRecommend(true)
  }

  const createPracticeHomework = async (topicName: string) => {
    if (classes.length === 0) {
      alert('请先创建班级')
      return
    }

    setCreating(true)

    const { data: homework, error } = await supabase.from('homeworks').insert({
      teacher_id: user.id,
      class_id: classes[0].id,
      title: `【强化练习】${topicName}`
    }).select().single()

    if (error) {
      alert('创建失败')
      setCreating(false)
      return
    }

    const questionsToInsert = recommendQuestions.map((q, index) => ({
      homework_id: homework.id,
      question_id: q.id,
      order_index: index
    }))

    await supabase.from('homework_questions').insert(questionsToInsert)

    alert('强化练习已创建！')
    setShowRecommend(false)
    setCreating(false)
  }

  const getRateColor = (rate: number) => {
    if (rate >= 60) return 'text-red-600 bg-red-100'
    if (rate >= 30) return 'text-yellow-600 bg-yellow-100'
    return 'text-green-600 bg-green-100'
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">数据统计分析</h1>
          <button onClick={() => router.push('/teacher')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <label className="block text-sm font-medium mb-2">选择作业</label>
          <select
            value={selectedHomework}
            onChange={(e) => setSelectedHomework(e.target.value)}
            className="w-full border p-2 rounded max-w-xs"
          >
            <option value="all">所有作业</option>
            {homeworks.map(hw => (
              <option key={hw.id} value={hw.id}>{hw.title}</option>
            ))}
          </select>
        </div>

        {weakTopics.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-orange-800 mb-3">⚠️ 需要加强的专题</h3>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map(topic => (
                <button
                  key={topic.topic_id}
                  onClick={() => loadRecommendQuestions(topic.topic_id)}
                  className="bg-white border border-orange-300 px-3 py-2 rounded-lg hover:bg-orange-100"
                >
                  <span className="font-medium">{topic.topic_name}</span>
                  <span className="ml-2 text-red-600 text-sm">{topic.wrong_rate}% 错误</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showRecommend && (
          <div className="bg-white rounded-lg shadow p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                📚 同类题目推荐 - {topicStats.find(t => t.topic_id === selectedTopicId)?.topic_name}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRecommend(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  关闭
                </button>
                <button
                  onClick={() => createPracticeHomework(topicStats.find(t => t.topic_id === selectedTopicId)?.topic_name || '')}
                  disabled={creating || recommendQuestions.length === 0}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {creating ? '创建中...' : '布置强化练习'}
                </button>
              </div>
            </div>

            {recommendQuestions.length === 0 ? (
              <p className="text-gray-500">该专题暂无其他题目，请先添加更多题目</p>
            ) : (
              <div className="space-y-3">
                {recommendQuestions.map((q, i) => (
                  <div key={q.id} className="border p-3 rounded-lg">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded mr-2">#{i + 1}</span>
                    <span className="text-sm">{q.content}</span>
                    {q.options && (
                      <p className="text-xs text-gray-500 mt-1">
                        {q.options.map((opt: string, idx: number) => (
                          <span key={idx} className="mr-2">{String.fromCharCode(65 + idx)}. {opt}</span>
                        ))}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">📊 专题错误率排行</h2>
            {topicStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {topicStats.slice(0, 5).map((stat, i) => (
                  <div key={stat.topic_id} className="border-b pb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{stat.topic_name}</span>
                      <span className={`px-2 py-1 rounded text-sm ${getRateColor(stat.wrong_rate)}`}>
                        {stat.wrong_rate}% 错误率
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          stat.wrong_rate >= 60 ? 'bg-red-500' :
                          stat.wrong_rate >= 30 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${stat.wrong_rate}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      正确 {stat.correct} / 总计 {stat.total}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">📝 题目错误率排行</h2>
            {questionStats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">暂无数据</p>
            ) : (
              <div className="space-y-3">
                {questionStats.slice(0, 5).map((stat, i) => (
                  <div key={stat.question_id} className="border-b pb-3">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1">
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded mr-2">#{i + 1}</span>
                        <span className="text-sm">{stat.content?.substring(0, 50)}...</span>
                      </div>
                      <span className={`px-2 py-1 rounded text-sm ${getRateColor(stat.wrong_rate)}`}>
                        {stat.wrong_rate}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {stat.topic_name} | 正确 {stat.correct}/{stat.total}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">⚠️ 需要加强练习的题目</h2>
          {questionStats.filter(q => q.wrong_rate >= 30).length === 0 ? (
            <p className="text-gray-500 text-center py-4">暂无需要加强的题目</p>
          ) : (
            <div className="space-y-3">
              {questionStats.filter(q => q.wrong_rate >= 30).map((stat) => (
                <div key={stat.question_id} className="border p-4 rounded-lg bg-red-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs bg-red-200 text-red-700 px-2 py-1 rounded mr-2">
                        错误率 {stat.wrong_rate}%
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        {stat.topic_name}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-gray-800">{stat.content}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    错误人数：{stat.total - stat.correct} / {stat.total}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
