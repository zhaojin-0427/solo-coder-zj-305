import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts'
import {
  fetchBabies, fetchStats, fetchVaccinationRate, fetchDelayCount,
  fetchReactionDistribution, fetchMonthlyProgress,
} from '../api'

const COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8']
const SEVERITY_COLORS = { mild: '#00B894', moderate: '#FDCB6E', severe: '#E17055' }

export default function Statistics() {
  const [babies, setBabies] = useState([])
  const [selectedBaby, setSelectedBaby] = useState('')
  const [stats, setStats] = useState(null)
  const [vaccinationRate, setVaccinationRate] = useState([])
  const [delayCount, setDelayCount] = useState(null)
  const [reactionDist, setReactionDist] = useState(null)
  const [monthlyProgress, setMonthlyProgress] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBabies()
      .then(data => setBabies(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    setLoading(true)
    const babyId = selectedBaby || null

    Promise.all([
      fetchStats(babyId),
      fetchVaccinationRate(babyId),
      fetchDelayCount(babyId),
      fetchReactionDistribution(babyId),
      fetchMonthlyProgress(babyId).catch(() => []),
    ])
      .then(([statsData, rateData, delayData, reactionData, progressData]) => {
        setStats(statsData)
        setVaccinationRate(Array.isArray(rateData) ? rateData : [])
        setDelayCount(delayData)
        setReactionDist(reactionData)
        setMonthlyProgress(Array.isArray(progressData) ? progressData : [])
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err)
        setStats(null)
        setVaccinationRate([])
        setDelayCount(null)
        setReactionDist(null)
        setMonthlyProgress([])
      })
      .finally(() => setLoading(false))
  }, [selectedBaby])

  if (loading) return <div className="loading">加载中...</div>

  const typeData = reactionDist?.by_type
    ? reactionDist.by_type.map(item => ({ name: item.type, value: item.count }))
    : []

  const severityData = reactionDist?.by_severity
    ? reactionDist.by_severity.map(item => ({ name: item.severity, value: item.count }))
    : []

  const delayedDetails = delayCount?.details || []
  const sortedDelays = [...delayedDetails].sort((a, b) => b.delay_days - a.delay_days)
  const totalDelayed = delayCount?.delay_count || 0

  const monthlyProgressWithRates = monthlyProgress.map(item => ({
    ...item,
    vaccine_rate: item.total_vaccines > 0 ? Math.round((item.completed_vaccines / item.total_vaccines) * 100) : 0,
    checkup_rate: item.total_checkups > 0 ? Math.round((item.completed_checkups / item.total_checkups) * 100) : 0,
  }))

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>数据统计</h1>
          <p>查看疫苗接种和体检的统计数据</p>
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 200 }}>
          <select
            value={selectedBaby}
            onChange={e => setSelectedBaby(e.target.value)}
          >
            <option value="">全部宝宝</option>
            {babies.map(baby => (
              <option key={baby.id} value={baby.id}>{baby.name}</option>
            ))}
          </select>
        </div>
      </div>

      {stats && (
        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card">
            <div className="stat-icon purple">📋</div>
            <div className="stat-info">
              <div className="stat-number">{stats.completed_appointments || 0}/{stats.total_appointments || 0}</div>
              <div className="stat-label">已完成预约</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">💉</div>
            <div className="stat-info">
              <div className="stat-number">{stats.completed_vaccinations || 0}/{stats.total_vaccinations || 0}</div>
              <div className="stat-label">已完成接种</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon yellow">⏰</div>
            <div className="stat-info">
              <div className="stat-number">{totalDelayed}</div>
              <div className="stat-label">延迟接种</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red">💊</div>
            <div className="stat-info">
              <div className="stat-number">{stats.total_reactions || 0}</div>
              <div className="stat-label">不良反应记录</div>
            </div>
          </div>
        </div>
      )}

      {vaccinationRate.length > 0 && (
        <div className="card">
          <div className="card-title">各阶段接种完成率</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vaccinationRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage_name" />
              <YAxis unit="%" />
              <Tooltip formatter={value => `${value}%`} />
              <Legend />
              <Bar dataKey="total" fill="#DFE6E9" name="总数" />
              <Bar dataKey="completed" fill="#00B894" name="已完成" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {delayCount && (
        <div className="card">
          <div className="card-title">延迟接种统计</div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#E17055' }}>
              {totalDelayed}
            </div>
            <div className="text-muted">延迟接种总数</div>
          </div>
          {selectedBaby && sortedDelays.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>疫苗名称</th>
                  <th>计划日期</th>
                  <th>延迟天数</th>
                </tr>
              </thead>
              <tbody>
                {sortedDelays.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.vaccine_name}</td>
                    <td>{item.planned_date}</td>
                    <td className="text-danger">{item.delay_days}天</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : selectedBaby ? (
            <div className="empty-state">
              <p>暂无延迟接种记录</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>请选择宝宝查看详细延迟记录</p>
            </div>
          )}
        </div>
      )}

      {reactionDist && (typeData.length > 0 || severityData.length > 0) && (
        <div className="grid-2">
          {typeData.length > 0 && (
            <div className="card">
              <div className="card-title">反应类型分布</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {severityData.length > 0 && (
            <div className="card">
              <div className="card-title">严重程度分布</div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#74B9FF'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {monthlyProgressWithRates.length > 0 && (
        <div className="card">
          <div className="card-title">月龄任务完成进度</div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyProgressWithRates}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" label={{ value: '月龄', position: 'insideBottomRight', offset: -5 }} />
              <YAxis unit="%" />
              <Tooltip formatter={value => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="vaccine_rate" stroke="#00B894" name="疫苗接种率" strokeWidth={2} />
              <Line type="monotone" dataKey="checkup_rate" stroke="#74B9FF" name="体检完成率" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!stats && !vaccinationRate.length && !delayCount && !reactionDist && !monthlyProgressWithRates.length && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>暂无统计数据</p>
        </div>
      )}
    </div>
  )
}
