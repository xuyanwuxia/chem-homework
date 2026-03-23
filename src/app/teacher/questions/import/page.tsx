'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

function ImportContent() {
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{success: number, failed: number, errors: string[]}>({success: 0, failed: 0, errors: []})
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

    const { data } = await supabase.from('topics').select('*')
    setTopics(data || [])
    setLoading(false)
  }

  const downloadTemplate = () => {
    const template = [
      {
        '题目内容': '水的化学式是什么？',
        '类型': 'choice',
        '年级': '高一',
        '难度': '3',
        '专题名称': '物质结构与性质',
        '选项A': 'H2O',
        '选项B': 'CO2',
        '选项C': 'NaCl',
        '选项D': 'O2',
        '正确答案': 'A',
        '解析': '水由氢氧两种元素组成'
      }
    ]
    
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '题目模板')
    XLSX.writeFile(wb, '题目导入模板.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setResults({success: 0, failed: 0, errors: []})

    const reader = new FileReader()
    reader.onload = async (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(sheet) as any[]

      let success = 0
      let failed = 0
      const errors: string[] = []

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i]
        
        try {
          const topicName = row['专题名称'] || ''
          let topicId = null
          
          if (topicName) {
            const topic = topics.find(t => t.name === topicName)
            topicId = topic?.id || null
          }

          const type = row['类型'] === 'choice' ? 'choice' : 
                       row['类型'] === 'fill' ? 'fill' : 'photo'

          const options = type === 'choice' ? [
            row['选项A'] || '',
            row['选项B'] || '',
            row['选项C'] || '',
            row['选项D'] || ''
          ].filter(o => o) : null

          const { error } = await supabase.from('questions').insert({
            teacher_id: user.id,
            content: row['题目内容'] || '',
            type,
            grade: row['年级'] || '高一',
            difficulty: parseInt(row['难度']) || 3,
            topic_id: topicId,
            options,
            correct_answer: row['正确答案'] || '',
            explanation: row['解析'] || null
          })

          if (error) {
            failed++
            errors.push(`第${i + 2}行: ${error.message}`)
          } else {
            success++
          }
        } catch (err: any) {
          failed++
          errors.push(`第${i + 2}行: ${err.message}`)
        }
      }

      setResults({success, failed, errors})
      setImporting(false)
    }
    reader.readAsArrayBuffer(file)
  }

  if (loading) return <div className="p-8 text-center">加载中...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-600 text-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">批量导入题目</h1>
          <button onClick={() => router.push('/teacher/questions')} className="bg-indigo-700 px-4 py-2 rounded hover:bg-indigo-800">
            返回
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-bold mb-4">📥 下载导入模板</h2>
          <p className="text-gray-600 mb-4">
            先下载 Excel 模板，按格式填写题目信息后上传
          </p>
          <button
            onClick={downloadTemplate}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            下载 Excel 模板
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-4">
          <h2 className="text-lg font-bold mb-4">📤 上传题目文件</h2>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="text-indigo-600 text-lg mb-2">
                {importing ? '导入中...' : '点击选择 Excel 文件'}
              </div>
              <div className="text-gray-500 text-sm">
                支持 .xlsx, .xls, .csv 格式
              </div>
            </label>
          </div>
        </div>

        {results.success > 0 || results.failed > 0 ? (
          <div className={`bg-white rounded-lg shadow p-6 ${results.failed > 0 ? 'border-2 border-red-300' : 'border-2 border-green-300'}`}>
            <h2 className="text-lg font-bold mb-4">📊 导入结果</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-green-100 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">{results.success}</div>
                <div className="text-gray-600">成功导入</div>
              </div>
              <div className="bg-red-100 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-red-600">{results.failed}</div>
                <div className="text-gray-600">导入失败</div>
              </div>
            </div>
            
            {results.errors.length > 0 && (
              <div className="mt-4">
                <h3 className="font-bold text-red-600 mb-2">错误详情：</h3>
                <div className="bg-red-50 p-3 rounded text-sm text-red-700 max-h-40 overflow-y-auto">
                  {results.errors.map((err, i) => (
                    <div key={i} className="mb-1">{err}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => router.push('/teacher/questions')}
              className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700"
            >
              查看题库
            </button>
          </div>
        ) : null}

        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-bold text-blue-800 mb-2">📋 填写说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>题目内容</strong>：必填，题目正文</li>
            <li>• <strong>类型</strong>：choice=选择题，fill=填空题，photo=拍照题</li>
            <li>• <strong>年级</strong>：高一/高二/高三</li>
            <li>• <strong>难度</strong>：1-5 的数字</li>
            <li>• <strong>专题名称</strong>：从已有的专题中选择填写</li>
            <li>• <strong>选项A/B/C/D</strong>：选择题必填，其他类型留空</li>
            <li>• <strong>正确答案</strong>：必填，选择题填 A/B/C/D</li>
            <li>• <strong>解析</strong>：选填，题目解析</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">加载中...</div>}>
      <ImportContent />
    </Suspense>
  )
}
