import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from 'recharts'
import {
  fetchBabies, fetchStats, fetchVaccinationRate, fetchDelayCount,
  fetchReactionDistribution, fetchMonthlyProgress,
  fetchCollaborationStats, fetchFamilies, fetchPreparationStats,
  fetchHealthEventStats, fetchHealthEventTrend, fetchHealthEventSeverity,
  fetchHealthEventRevisitRate, fetchHealthEventByAge,
  fetchArchiveStats, fetchArchiveByAge, fetchArchiveMonthlyTrend, fetchArchiveFamilyCoverage,
} from '../api'

const COLORS = ['#6C5CE7', '#00B894', '#FDCB6E', '#E17055', '#74B9FF', '#A29BFE', '#FD79A8']
const SEVERITY_COLORS = { mild: '#00B894', moderate: '#FDCB6E', severe: '#E17055' }

export default function Statistics() {
  const [babies, setBabies] = useState([])
  const [families, setFamilies] = useState([])
  const [selectedBaby, setSelectedBaby] = useState('')
  const [selectedFamily, setSelectedFamily] = useState('')
  const [stats, setStats] = useState(null)
  const [vaccinationRate, setVaccinationRate] = useState([])
  const [delayCount, setDelayCount] = useState(null)
  const [reactionDist, setReactionDist] = useState(null)
  const [monthlyProgress, setMonthlyProgress] = useState([])
  const [collaborationStats, setCollaborationStats] = useState(null)
  const [preparationStats, setPreparationStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collabLoading, setCollabLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [healthEventStats, setHealthEventStats] = useState(null)
  const [healthEventTrend, setHealthEventTrend] = useState([])
  const [healthEventSeverity, setHealthEventSeverity] = useState(null)
  const [healthEventRevisitRate, setHealthEventRevisitRate] = useState(null)
  const [healthEventByAge, setHealthEventByAge] = useState([])
  const [healthEventLoading, setHealthEventLoading] = useState(false)
  const [archiveStats, setArchiveStats] = useState(null)
  const [archiveByAge, setArchiveByAge] = useState([])
  const [archiveMonthlyTrend, setArchiveMonthlyTrend] = useState([])
  const [archiveFamilyCoverage, setArchiveFamilyCoverage] = useState(null)
  const [archiveLoading, setArchiveLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchBabies(),
      fetchFamilies({ page_size: 1000 }),
    ])
      .then(([babiesData, familiesData]) => {
        setBabies(Array.isArray(babiesData) ? babiesData : [])
        setFamilies(Array.isArray(familiesData) ? familiesData : [])
      })
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

  useEffect(() => {
    loadCollaborationStats()
    loadPreparationStats()
    loadHealthEventStats()
    loadArchiveStats()
  }, [selectedBaby, selectedFamily, filterType])

  const loadHealthEventStats = async () => {
    setHealthEventLoading(true)
    try {
      const babyId = filterType === 'baby' && selectedBaby ? selectedBaby : null
      const familyId = filterType === 'family' && selectedFamily ? selectedFamily : null

      const [overview, trend, severity, revisitRate, byAge] = await Promise.all([
        fetchHealthEventStats(babyId, familyId).catch(() => null),
        fetchHealthEventTrend(babyId, familyId, 30).catch(() => []),
        fetchHealthEventSeverity(babyId, familyId).catch(() => null),
        fetchHealthEventRevisitRate(babyId, familyId).catch(() => null),
        fetchHealthEventByAge(babyId, familyId).catch(() => {}),
      ])

      setHealthEventStats(overview)
      setHealthEventTrend(Array.isArray(trend) ? trend : [])
      setHealthEventSeverity(severity)
      setHealthEventRevisitRate(revisitRate)

      const ageArray = byAge && typeof byAge === 'object' && !Array.isArray(byAge)
        ? Object.entries(byAge).map(([ageGroup, data]) => {
            const item = { age_group: ageGroup, total: data.total || 0 }
            if (data.by_type) {
              Object.entries(data.by_type).forEach(([type, typeData]) => {
                item[type] = typeData.count || 0
              })
            }
            return item
          })
        : []
      setHealthEventByAge(ageArray)
    } catch (err) {
      console.error('Failed to load health event stats:', err)
    } finally {
      setHealthEventLoading(false)
    }
  }

  const loadPreparationStats = async () => {
    try {
      const babyId = filterType === 'baby' && selectedBaby ? selectedBaby : null
      const familyId = filterType === 'family' && selectedFamily ? selectedFamily : null
      const data = await fetchPreparationStats(babyId, familyId)
      setPreparationStats(data)
    } catch (err) {
      console.error('Failed to fetch preparation stats:', err)
      setPreparationStats(null)
    }
  }

  const loadCollaborationStats = async () => {
    setCollabLoading(true)
    try {
      const babyId = filterType === 'baby' && selectedBaby ? selectedBaby : null
      const familyId = filterType === 'family' && selectedFamily ? selectedFamily : null
      const data = await fetchCollaborationStats(babyId, familyId)
      setCollaborationStats(data)
    } catch (err) {
      console.error('Failed to fetch collaboration stats:', err)
      setCollaborationStats(null)
    } finally {
      setCollabLoading(false)
    }
  }

  const loadArchiveStats = async () => {
    setArchiveLoading(true)
    try {
      const babyId = filterType === 'baby' && selectedBaby ? selectedBaby : null
      const familyId = filterType === 'family' && selectedFamily ? selectedFamily : null

      const [overview, byAge, trend, coverage] = await Promise.all([
        fetchArchiveStats(babyId, familyId).catch(() => null),
        fetchArchiveByAge(babyId, familyId).catch(() => []),
        fetchArchiveMonthlyTrend(babyId, familyId, 12).catch(() => []),
        fetchArchiveFamilyCoverage(babyId, familyId).catch(() => null),
      ])

      setArchiveStats(overview)
      setArchiveFamilyCoverage(coverage)

      const ageArray = byAge && typeof byAge === 'object' && !Array.isArray(byAge)
        ? Object.entries(byAge).map(([ageGroup, data]) => ({
            age_group: ageGroup,
            total: data.total || 0,
          }))
        : []
      setArchiveByAge(ageArray)
      setArchiveMonthlyTrend(Array.isArray(trend) ? trend : [])
    } catch (err) {
      console.error('Failed to load archive stats:', err)
    } finally {
      setArchiveLoading(false)
    }
  }

  const getProgressColor = (rate) => {
    if (rate >= 0.8) return 'green'
    if (rate >= 0.5) return 'yellow'
    return 'red'
  }

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

  const vaccinationRateWithPercent = vaccinationRate.map(item => ({
    ...item,
    rate_percent: Math.round((item.rate || 0) * 100),
  }))

  const monthlyProgressWithRates = monthlyProgress.map(item => ({
    ...item,
    vaccine_rate: item.total_vaccines > 0 ? Math.round((item.completed_vaccines / item.total_vaccines) * 100) : 0,
    checkup_rate: item.total_checkups > 0 ? Math.round((item.completed_checkups / item.total_checkups) * 100) : 0,
  }))

  const byMonthProgressWithColor = collaborationStats?.by_month_progress?.map(item => ({
    ...item,
    completion_percent: Math.round(item.completion_rate * 100),
  })) || []

  const renderCollaborationStats = () => {
    if (collabLoading) return <div className="loading">加载协同统计中...</div>
    if (!collaborationStats) return null

    const { overview, completion_metrics, appointment_metrics, reminder_metrics, family_metrics } = collaborationStats

    return (
      <div className="collaboration-stats">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 20 }}>📊 月龄任务协同统计</h2>
            <p style={{ fontSize: 14, color: '#636E72' }}>
              任务完成率、预约转化率、家庭提醒覆盖率等协同指标
            </p>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F8F9FD 0%, #EDEFFC 100%)' }}>
          <div className="card-title" style={{ color: '#6C5CE7' }}>
            📈 核心协同指标
          </div>
          <div className="card-body">
            <div className="grid-4" style={{ marginBottom: 24 }}>
              <div className="metric-card green">
                <div className="metric-value">{completion_metrics?.overall_completion_percent || 0}%</div>
                <div className="metric-label">整体任务完成率</div>
                <div className="metric-subtext">
                  {overview?.total_completed || 0} / {overview?.total_tasks || 0} 任务
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-value">{appointment_metrics?.appointment_conversion_percent || 0}%</div>
                <div className="metric-label">预约转化率</div>
                <div className="metric-subtext">
                  {appointment_metrics?.tasks_with_appointment || 0} 个待办已预约
                </div>
              </div>
              <div className="metric-card yellow">
                <div className="metric-value">{reminder_metrics?.reminder_coverage_percent || 0}%</div>
                <div className="metric-label">提醒覆盖率</div>
                <div className="metric-subtext">
                  {reminder_metrics?.reminded_pending_tasks || 0} / {reminder_metrics?.pending_tasks_with_appointment || 0} 已提醒
                </div>
              </div>
              <div className="metric-card green">
                <div className="metric-value">{family_metrics?.avg_family_reminder_coverage_percent || 0}%</div>
                <div className="metric-label">家庭参与率</div>
                <div className="metric-subtext">
                  {family_metrics?.reminded_family_members || 0} / {family_metrics?.total_family_members || 0} 成员
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#636E72' }}>疫苗任务完成率</span>
                  <span style={{ fontWeight: 600 }}>
                    {overview?.completed_vaccine_tasks || 0} / {overview?.total_vaccine_tasks || 0}
                    ({Math.round((completion_metrics?.vaccine_completion_rate || 0) * 100)}%)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill ${getProgressColor(completion_metrics?.vaccine_completion_rate || 0)}`}
                    style={{ width: `${Math.round((completion_metrics?.vaccine_completion_rate || 0) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#636E72' }}>体检任务完成率</span>
                  <span style={{ fontWeight: 600 }}>
                    {overview?.completed_checkup_tasks || 0} / {overview?.total_checkup_tasks || 0}
                    ({Math.round((completion_metrics?.checkup_completion_rate || 0) * 100)}%)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill ${getProgressColor(completion_metrics?.checkup_completion_rate || 0)}`}
                    style={{ width: `${Math.round((completion_metrics?.checkup_completion_rate || 0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid-3">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#636E72' }}>预约完成率</span>
                  <span style={{ fontWeight: 600 }}>
                    {appointment_metrics?.completed_appointments || 0} / {appointment_metrics?.total_appointments || 0}
                    ({Math.round((appointment_metrics?.appointment_finish_rate || 0) * 100)}%)
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill ${getProgressColor(appointment_metrics?.appointment_finish_rate || 0)}`}
                    style={{ width: `${Math.round((appointment_metrics?.appointment_finish_rate || 0) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#636E72' }}>逾期任务数</span>
                  <span style={{ fontWeight: 600, color: '#E17055' }}>
                    {overview?.overdue_tasks || 0} 个
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill red"
                    style={{ width: `${overview?.total_tasks ? Math.min(100, (overview.overdue_tasks / overview.total_tasks) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: '#636E72' }}>待处理任务</span>
                  <span style={{ fontWeight: 600, color: '#FDCB6E' }}>
                    {overview?.total_pending || 0} 个
                  </span>
                </div>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill yellow"
                    style={{ width: `${overview?.total_tasks ? Math.min(100, (overview.total_pending / overview.total_tasks) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {byMonthProgressWithColor.length > 0 && (
          <div className="card">
            <div className="card-title">📅 各月龄任务完成进度</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byMonthProgressWithColor}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" label={{ value: '月龄', position: 'insideBottomRight', offset: -5 }} />
                <YAxis unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === 'completion_percent') return [`${value}%`, '完成率']
                    return [value, name]
                  }}
                  labelFormatter={(label) => {
                    const item = byMonthProgressWithColor.find(d => d.month === label)
                    return item ? `${label}月龄  已完成: ${item.completed}/${item.total}` : `${label}月龄`
                  }}
                />
                <Legend />
                <Bar dataKey="completion_percent" fill="#6C5CE7" name="完成率" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )
  }

  const renderFilterBar = () => (
    <div className="filter-bar">
      <div className="filter-group">
        <label>统计范围:</label>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="all">全部数据</option>
          {babies.length > 0 && <option value="baby">按宝宝</option>}
          {families.length > 0 && <option value="family">按家庭</option>}
        </select>
      </div>
      {filterType === 'baby' && (
        <div className="filter-group">
          <label>选择宝宝:</label>
          <select value={selectedBaby} onChange={e => setSelectedBaby(e.target.value)}>
            <option value="">请选择宝宝</option>
            {babies.map(baby => (
              <option key={baby.id} value={baby.id}>{baby.name}</option>
            ))}
          </select>
        </div>
      )}
      {filterType === 'family' && (
        <div className="filter-group">
          <label>选择家庭:</label>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            <option value="">请选择家庭</option>
            {families.map(family => (
              <option key={family.id} value={family.id}>{family.name}</option>
            ))}
          </select>
        </div>
      )}
      {filterType === 'all' && (
        <div className="filter-group">
          <label>宝宝筛选:</label>
          <select value={selectedBaby} onChange={e => setSelectedBaby(e.target.value)}>
            <option value="">全部宝宝</option>
            {babies.map(baby => (
              <option key={baby.id} value={baby.id}>{baby.name}</option>
            ))}
          </select>
        </div>
      )}
      <button className="btn btn-sm btn-secondary" onClick={() => { loadCollaborationStats(); loadPreparationStats(); loadHealthEventStats(); loadArchiveStats(); }}>
        🔄 刷新
      </button>
    </div>
  )

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>数据统计</h1>
          <p>查看疫苗接种、体检和家庭协同的统计数据</p>
        </div>
      </div>

      {renderFilterBar()}

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

      {vaccinationRateWithPercent.length > 0 && (
        <div className="card">
          <div className="card-title">各阶段接种完成率</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={vaccinationRateWithPercent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage_name" />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip
                formatter={(value, name) => {
                  if (name === '完成率') return [`${value}%`, '完成率']
                  return [value, name]
                }}
                labelFormatter={(label) => {
                  const item = vaccinationRateWithPercent.find(d => d.stage_name === label)
                  return item ? `${label}  已完成: ${item.completed}/${item.total}` : label
                }}
              />
              <Legend />
              <Bar dataKey="rate_percent" fill="#6C5CE7" name="完成率" />
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

      {renderCollaborationStats()}

      {(healthEventStats || healthEventTrend.length > 0 || healthEventSeverity || healthEventRevisitRate || healthEventByAge.length > 0) && !healthEventLoading && (
        <div className="collaboration-stats" style={{ marginTop: 20 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20 }}>🩺 健康事件追踪统计</h2>
              <p style={{ fontSize: 14, color: '#636E72' }}>
                健康事件趋势、严重程度分布、复诊转化率与各月龄常见事件占比
              </p>
            </div>
          </div>

          {healthEventStats && healthEventStats.overview && healthEventStats.overview.total_events > 0 && (
            <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
              <div className="card-title" style={{ color: '#92400E' }}>📈 健康事件总览</div>
              <div className="card-body">
                <div className="grid-4" style={{ marginBottom: 16 }}>
                  <div className="metric-card yellow">
                    <div className="metric-value">{healthEventStats.overview.total_events || 0}</div>
                    <div className="metric-label">健康事件总数</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value" style={{ color: '#FDCB6E' }}>{healthEventStats.overview.observing || 0}</div>
                    <div className="metric-label">观察中</div>
                  </div>
                  <div className="metric-card" style={{ background: '#FEE2E2' }}>
                    <div className="metric-value" style={{ color: '#E17055' }}>{healthEventStats.overview.need_revisit || 0}</div>
                    <div className="metric-label">需复诊</div>
                  </div>
                  <div className="metric-card green">
                    <div className="metric-value">{healthEventStats.overview.relieved || 0}</div>
                    <div className="metric-label">已缓解</div>
                  </div>
                </div>
                <div className="grid-4">
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>轻微事件</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#00B894' }}>{healthEventSeverity?.mild?.total || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>中等事件</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#FDCB6E' }}>{healthEventSeverity?.moderate?.total || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>严重事件</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#E17055' }}>{healthEventSeverity?.severe?.total || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>复诊转化率</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#E17055' }}>
                      {healthEventStats.overview.total_events > 0 ? Math.round((healthEventStats.overview.need_revisit / healthEventStats.overview.total_events) * 100) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {healthEventTrend.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">📅 近30天健康事件趋势</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={healthEventTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#E17055" name="事件数" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 20 }}>
            {healthEventSeverity && (
              <div className="card">
                <div className="card-title">⚠️ 严重程度分布</div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(healthEventSeverity)
                        .map(([k, v]) => ({
                          name: { mild: '轻微', moderate: '中等', severe: '严重' }[k] || k,
                          value: v?.total || 0,
                        }))
                        .filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      <Cell fill="#00B894" />
                      <Cell fill="#FDCB6E" />
                      <Cell fill="#E17055" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {healthEventStats?.by_type && healthEventStats.by_type.length > 0 && (
              <div className="card">
                <div className="card-title">📋 事件类型分布</div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={healthEventStats.by_type
                        .map((item, idx) => ({
                          name: item.event_type_label || item.event_type,
                          value: item.count || 0,
                        }))
                        .filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {healthEventStats.by_type.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {healthEventRevisitRate && healthEventRevisitRate.overview && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">🔄 复诊转化率分析</div>
              <div className="card-body">
                <div className="grid-2" style={{ marginBottom: 16 }}>
                  <div className="metric-card" style={{ background: '#FEE2E2' }}>
                    <div className="metric-value" style={{ color: '#E17055' }}>{healthEventRevisitRate.overview.overall_revisit_rate ? Math.round(healthEventRevisitRate.overview.overall_revisit_rate * 100) : 0}%</div>
                    <div className="metric-label">总体复诊转化率</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{healthEventRevisitRate.overview.total_events || 0}</div>
                    <div className="metric-label">统计事件总数</div>
                  </div>
                </div>
                {healthEventRevisitRate.by_event_type && Object.keys(healthEventRevisitRate.by_event_type).length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>各事件类型复诊转化率</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {Object.entries(healthEventRevisitRate.by_event_type).map(([type, data]) => {
                        const typeLabels = { fever: '🌡️ 发热', rash: '🔴 皮疹', crying: '😭 异常哭闹', appetite: '🍽️ 食欲变化', sleep: '😴 睡眠异常', doctor_followup: '👨‍⚕️ 医生回访', other: '📋 其他' }
                        const rate = data.total > 0 ? Math.round((data.need_revisit / data.total) * 100) : 0
                        const color = rate >= 40 ? '#E17055' : rate >= 20 ? '#FDCB6E' : '#00B894'
                        return (
                          <div key={type}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                              <span>{typeLabels[type] || data.event_type_label || type}</span>
                              <span style={{ fontWeight: 600, color }}>
                                {data.need_revisit}/{data.total} ({rate}%)
                              </span>
                            </div>
                            <div className="progress-bar-container">
                              <div className="progress-bar-fill" style={{ width: `${rate}%`, background: color }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {healthEventByAge.length > 0 && (
            <div className="card">
              <div className="card-title">👶 不同月龄常见事件占比</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={healthEventByAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age_group" label={{ value: '月龄阶段', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#6C5CE7" name="事件总数" />
                  {['fever', 'rash', 'crying', 'appetite', 'sleep'].filter(type =>
                    healthEventByAge.some(d => d[type] && d[type] > 0)
                  ).map((type, idx) => {
                    const typeLabels = { fever: '发热', rash: '皮疹', crying: '哭闹', appetite: '食欲', sleep: '睡眠' }
                    return (
                      <Bar key={type} dataKey={type} fill={COLORS[(idx + 1) % COLORS.length]} name={typeLabels[type]} stackId="a" />
                    )
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {preparationStats && preparationStats.overview && preparationStats.overview.total_checklists > 0 && (
        <div className="collaboration-stats" style={{ marginTop: 20 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20 }}>🏥 到院准备核验统计</h2>
              <p style={{ fontSize: 14, color: '#636E72' }}>准备清单状态、核验完成率、缺失项与补录统计</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F8F9FD 0%, #E8EAFC 100%)' }}>
            <div className="card-title" style={{ color: '#6C5CE7' }}>📈 核验概览</div>
            <div className="card-body">
              <div className="grid-4" style={{ marginBottom: 24 }}>
                <div className="metric-card green">
                  <div className="metric-value">{preparationStats.overview.avg_completion_percent || 0}%</div>
                  <div className="metric-label">平均准备完成率</div>
                </div>
                <div className="metric-card" style={{ background: '#EDEFFC' }}>
                  <div className="metric-value" style={{ color: '#6C5CE7' }}>{preparationStats.overview.verified || 0}</div>
                  <div className="metric-label">已核验清单</div>
                </div>
                <div className="metric-card yellow">
                  <div className="metric-value">{preparationStats.verification_stats?.total_missing_items || 0}</div>
                  <div className="metric-label">临时缺失项</div>
                </div>
                <div className="metric-card" style={{ background: '#D1FAE5' }}>
                  <div className="metric-value" style={{ color: '#00B894' }}>{preparationStats.verification_stats?.total_supplemented_items || 0}</div>
                  <div className="metric-label">现场补录项</div>
                </div>
              </div>

              <div className="grid-4" style={{ marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>未开始</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#B2BEC3' }}>{preparationStats.overview.not_started || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>准备中</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#FDCB6E' }}>{preparationStats.overview.in_progress || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>已完成</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#00B894' }}>{preparationStats.overview.completed || 0}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>已核验</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#6C5CE7' }}>{preparationStats.overview.verified || 0}</div>
                </div>
              </div>

              {preparationStats.by_category && Object.keys(preparationStats.by_category).length > 0 && (
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 12 }}>各类别确认率</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(preparationStats.by_category).map(([cat, stats]) => {
                      const catLabels = {
                        document: '📄 证件材料', vaccine_book: '💉 疫苗本', medical_history: '🏥 既往病史',
                        fasting: '🍽️ 空腹要求', companion: '👤 陪同人信息', transport: '🚗 交通出发时间', other: '📦 其他',
                      }
                      const rate = stats.total > 0 ? Math.round((stats.confirmed / stats.total) * 100) : 0
                      const color = rate >= 80 ? '#00B894' : rate >= 50 ? '#FDCB6E' : '#E17055'
                      return (
                        <div key={cat}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                            <span>{catLabels[cat] || cat}</span>
                            <span style={{ fontWeight: 600, color }}>{stats.confirmed}/{stats.total} ({rate}%)</span>
                          </div>
                          <div className="progress-bar-container">
                            <div className="progress-bar-fill" style={{ width: `${rate}%`, background: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {preparationStats.recent_checklists && preparationStats.recent_checklists.length > 0 && (
            <div className="card">
              <div className="card-title">📋 最近准备清单</div>
              <table>
                <thead>
                  <tr>
                    <th>宝宝</th>
                    <th>类型</th>
                    <th>预约日期</th>
                    <th>准备状态</th>
                    <th>完成率</th>
                    <th>核验</th>
                  </tr>
                </thead>
                <tbody>
                  {preparationStats.recent_checklists.map(cl => (
                    <tr key={cl.id}>
                      <td>{cl.baby_name}</td>
                      <td>{cl.appointment_type === 'vaccine' ? (cl.vaccine_name || '疫苗') : (cl.checkup_type || '体检')}</td>
                      <td>{cl.appointment_date}</td>
                      <td>
                        <span style={{
                          padding: '2px 8px', borderRadius: 8, fontSize: 12,
                          background: cl.status === 'verified' ? '#EDEFFC' : cl.status === 'completed' ? '#D1FAE5' : cl.status === 'in_progress' ? '#FEF3C7' : '#DFE6E9',
                          color: cl.status === 'verified' ? '#6C5CE7' : cl.status === 'completed' ? '#00B894' : cl.status === 'in_progress' ? '#92400E' : '#636E72',
                        }}>
                          {cl.status_label}
                        </span>
                      </td>
                      <td>{(cl.completion_rate * 100).toFixed(0)}%</td>
                      <td>{cl.has_verification ? '✅' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(archiveStats || archiveByAge.length > 0 || archiveMonthlyTrend.length > 0 || archiveFamilyCoverage) && !archiveLoading && (
        <div className="collaboration-stats" style={{ marginTop: 20 }}>
          <div className="page-header" style={{ marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 20 }}>📂 宝宝就诊资料归档统计</h2>
              <p style={{ fontSize: 14, color: '#636E72' }}>
                资料归档数量、类型分布、月龄归档趋势与家庭查看覆盖率
              </p>
            </div>
          </div>

          {archiveStats && archiveStats.overview && archiveStats.overview.total_archives > 0 && (
            <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)' }}>
              <div className="card-title" style={{ color: '#065F46' }}>📈 归档概览</div>
              <div className="card-body">
                <div className="grid-4" style={{ marginBottom: 16 }}>
                  <div className="metric-card green">
                    <div className="metric-value">{archiveStats.overview.total_archives || 0}</div>
                    <div className="metric-label">归档资料总数</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value" style={{ color: '#6C5CE7' }}>{archiveStats.overview.approved || 0}</div>
                    <div className="metric-label">已归档</div>
                  </div>
                  <div className="metric-card yellow">
                    <div className="metric-value">{archiveStats.overview.pending_review || 0}</div>
                    <div className="metric-label">待审核</div>
                  </div>
                  <div className="metric-card" style={{ background: '#FEE2E2' }}>
                    <div className="metric-value" style={{ color: '#E17055' }}>{archiveStats.overview.expired || 0}</div>
                    <div className="metric-label">已过期</div>
                  </div>
                </div>
                <div className="grid-4">
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>草稿</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#B2BEC3' }}>{archiveStats.overview.draft || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>待处理</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#FDCB6E' }}>{archiveStats.overview.needs_action || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>关联预约</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#74B9FF' }}>{archiveStats.overview.with_appointment || 0}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: '#636E72', marginBottom: 4 }}>关联健康事件</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#FD79A8' }}>{archiveStats.overview.with_health_event || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid-2" style={{ marginBottom: 20 }}>
            {archiveStats?.by_type && archiveStats.by_type.length > 0 && (
              <div className="card">
                <div className="card-title">📋 资料类型分布</div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={archiveStats.by_type
                        .map((item, idx) => ({
                          name: item.type_label || item.archive_type,
                          value: item.count || 0,
                        }))
                        .filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {archiveStats.by_type.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {archiveStats?.by_source && archiveStats.by_source.length > 0 && (
              <div className="card">
                <div className="card-title">📥 资料来源分布</div>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={archiveStats.by_source
                        .map((item, idx) => ({
                          name: item.source_label || item.source,
                          value: item.count || 0,
                        }))
                        .filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      outerRadius={95}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {archiveStats.by_source.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[(idx + 2) % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {archiveMonthlyTrend.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">📅 近12个月归档趋势</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={archiveMonthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#00B894" name="归档数量" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {archiveByAge.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">👶 按月龄段归档分布</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={archiveByAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="age_group" label={{ value: '月龄阶段', position: 'insideBottomRight', offset: -5 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#6C5CE7" name="归档数量" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {archiveFamilyCoverage && archiveFamilyCoverage.overview && (
            <div className="card">
              <div className="card-title">👨‍👩‍👧 家庭查看覆盖率</div>
              <div className="card-body">
                <div className="grid-4" style={{ marginBottom: 16 }}>
                  <div className="metric-card green">
                    <div className="metric-value">{archiveFamilyCoverage.overview.coverage_percent ? Math.round(archiveFamilyCoverage.overview.coverage_percent * 100) : 0}%</div>
                    <div className="metric-label">家庭查看覆盖率</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value" style={{ color: '#6C5CE7' }}>{archiveFamilyCoverage.overview.total_families || 0}</div>
                    <div className="metric-label">家庭总数</div>
                  </div>
                  <div className="metric-card yellow">
                    <div className="metric-value">{archiveFamilyCoverage.overview.active_families || 0}</div>
                    <div className="metric-label">活跃家庭</div>
                  </div>
                  <div className="metric-card" style={{ background: '#FEE2E2' }}>
                    <div className="metric-value" style={{ color: '#E17055' }}>{archiveFamilyCoverage.overview.inactive_families || 0}</div>
                    <div className="metric-label">未查看家庭</div>
                  </div>
                </div>
                {archiveFamilyCoverage.by_family && archiveFamilyCoverage.by_family.length > 0 && (
                  <table>
                    <thead>
                      <tr>
                        <th>家庭</th>
                        <th>成员数</th>
                        <th>已查看成员</th>
                        <th>查看覆盖率</th>
                        <th>归档数量</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveFamilyCoverage.by_family.slice(0, 10).map((f, idx) => {
                        const rate = f.total_members > 0 ? Math.round((f.viewed_members / f.total_members) * 100) : 0
                        const color = rate >= 80 ? '#00B894' : rate >= 50 ? '#FDCB6E' : '#E17055'
                        return (
                          <tr key={idx}>
                            <td>{f.family_name || '—'}</td>
                            <td>{f.total_members || 0}</td>
                            <td>{f.viewed_members || 0}</td>
                            <td style={{ color, fontWeight: 600 }}>{rate}%</td>
                            <td>{f.total_archives || 0}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!stats && !vaccinationRate.length && !delayCount && !reactionDist && !monthlyProgressWithRates.length && !collaborationStats && (
        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <p>暂无统计数据</p>
        </div>
      )}
    </div>
  )
}
