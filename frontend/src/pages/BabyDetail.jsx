import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { fetchBaby, fetchSchedules, markScheduleCompleted, fetchCheckupRecords, generateSchedule, fetchTaskFlow, fetchChecklistByBaby, fetchHealthEvents } from '../api'

const STATUS_CONFIG = {
  pending: { label: '待接种', className: 'badge badge-warning' },
  completed: { label: '已接种', className: 'badge badge-success' },
  delayed: { label: '已推迟', className: 'badge badge-danger' },
}

const FLOW_STATUS_CONFIG = {
  completed: { label: '已完成', color: '#00B894', icon: '✅' },
  appointment_confirmed: { label: '预约已确认', color: '#6C5CE7', icon: '📌' },
  appointment_pending: { label: '待确认预约', color: '#74B9FF', icon: '📝' },
  reminded: { label: '已提醒', color: '#FDCB6E', icon: '🔔' },
  need_action: { label: '待发起预约', color: '#E17055', icon: '⚠️' },
}

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function BabyDetail() {
  const { id } = useParams()
  const query = useQuery()
  const navigate = useNavigate()
  const [baby, setBaby] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [checkupRecords, setCheckupRecords] = useState([])
  const [activeTab, setActiveTab] = useState(query.get('tab') || 'taskflow')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const [taskFlow, setTaskFlow] = useState(null)
  const [taskFlowMonth, setTaskFlowMonth] = useState(null)
  const [taskFlowLoading, setTaskFlowLoading] = useState(false)
  const [prepChecklists, setPrepChecklists] = useState([])
  const [healthEvents, setHealthEvents] = useState([])

  useEffect(() => {
    Promise.all([
      fetchBaby(id),
      fetchSchedules({ baby: id, page_size: 1000 }),
      fetchCheckupRecords({ baby: id, page_size: 1000 }),
    ])
      .then(([babyData, schedulesData, checkupsData]) => {
        setBaby(babyData)
        setSchedules(schedulesData)
        setCheckupRecords(checkupsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))

    fetchChecklistByBaby(id)
      .then(data => setPrepChecklists(Array.isArray(data) ? data : []))
      .catch(() => {})

    fetchHealthEvents({ baby_id: id, page_size: 1000 })
      .then(data => setHealthEvents(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [id])

  const loadTaskFlow = (month) => {
    setTaskFlowLoading(true)
    fetchTaskFlow(id, month)
      .then(data => {
        setTaskFlow(data)
        if (taskFlowMonth === null && data) {
          setTaskFlowMonth(data.target_month)
        }
      })
      .catch(console.error)
      .finally(() => setTaskFlowLoading(false))
  }

  useEffect(() => {
    if (baby && activeTab === 'taskflow') {
      loadTaskFlow(taskFlowMonth)
    }
  }, [id, activeTab, baby])

  useEffect(() => {
    const newTab = query.get('tab') || 'taskflow'
    if (newTab !== activeTab) setActiveTab(newTab)
  }, [query])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    navigate(`/babies/${id}?tab=${tab}`, { replace: true })
  }

  const handleMonthChange = (e) => {
    const m = parseInt(e.target.value)
    setTaskFlowMonth(m)
    loadTaskFlow(m)
  }

  const handleMarkCompleted = async (scheduleId) => {
    try {
      const res = await markScheduleCompleted(scheduleId)
      setSchedules(prev => prev.map(s => s.id === scheduleId ? res.data : s))
      if (activeTab === 'taskflow') loadTaskFlow(taskFlowMonth)
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerateSchedule = async () => {
    setGenerating(true)
    try {
      await generateSchedule(id)
      const res = await fetchSchedules({ baby: id, page_size: 1000 })
      setSchedules(res || [])
      if (activeTab === 'taskflow') loadTaskFlow(taskFlowMonth)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  const goToAppointment = (task) => {
    const params = new URLSearchParams()
    params.set('baby_id', id)
    params.set('type', task.task_type)
    if (task.task_type === 'vaccine' && task.vaccine_id) {
      params.set('vaccine_id', String(task.vaccine_id))
    }
    if (task.task_type === 'vaccine' && task.full_name) {
      params.set('vaccine_name', task.title)
    }
    if (task.task_type === 'checkup') {
      params.set('checkup_name', task.title)
      params.set('checkup_id', task.related_checkup_id)
    }
    navigate(`/appointments/new?${params.toString()}`)
  }

  const goToAppointmentDetail = (apptId) => {
    navigate(`/appointments`)
  }

  const goToFamily = () => {
    navigate('/family')
  }

  const goToStatistics = (babyId) => {
    navigate(`/statistics?baby_id=${babyId}`)
  }

  const handleRefreshTaskFlow = () => {
    loadTaskFlow(taskFlowMonth)
  }

  if (loading) return <div className="loading">加载中...</div>
  if (!baby) return <div className="loading">未找到宝宝信息</div>

  const renderTaskFlow = () => {
    if (taskFlowLoading && !taskFlow) return <div className="loading">加载任务流...</div>
    if (!taskFlow) return <div className="empty-state"><p>暂无任务数据</p></div>

    const { stats, family, tasks, months_available, target_month, is_current_month } = taskFlow

    return (
      <div>
        <div className="card" style={{ padding: '16px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: '#636E72', marginRight: 8 }}>选择月龄:</label>
                <select
                  value={target_month ?? ''}
                  onChange={handleMonthChange}
                  style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #DFE6E9', fontSize: 14 }}
                >
                  {months_available.map(m => (
                    <option key={m} value={m}>
                      {m}月龄 {m === baby.age_months ? '(当前)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <span className={`badge ${is_current_month ? 'badge-success' : 'badge-info'}`}>
                {is_current_month ? '📅 当前月龄' : '历史数据'}
              </span>
              <button className="btn btn-sm btn-secondary" onClick={handleRefreshTaskFlow}>
                🔄 刷新
              </button>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
              <span>总计任务: <strong style={{ fontSize: 16 }}>{stats.total_tasks}</strong></span>
              <span style={{ color: '#00B894' }}>已完成: <strong>{stats.completed_tasks}</strong> ({(stats.completion_rate * 100).toFixed(1)}%)</span>
              <span style={{ color: '#6C5CE7' }}>已预约: <strong>{stats.appointment_tasks}</strong></span>
              {stats.overdue_tasks > 0 && (
                <span style={{ color: '#E17055' }}>逾期: <strong>{stats.overdue_tasks}</strong></span>
              )}
            </div>
          </div>
        </div>

        <div className="grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => goToStatistics(id)} title="查看详细统计">
            <div className="stat-icon green">✅</div>
            <div className="stat-info">
              <div className="stat-number">{stats.completed_tasks}/{stats.total_tasks}</div>
              <div className="stat-label">任务完成率 {(stats.completion_rate * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: '#636E72', marginTop: 4 }}>📊 点击查看详情 →</div>
            </div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/appointments')} title="查看预约列表">
            <div className="stat-icon purple">📅</div>
            <div className="stat-info">
              <div className="stat-number">{stats.appointment_tasks}</div>
              <div className="stat-label">预约转化率 {(stats.appointment_rate * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: '#636E72', marginTop: 4 }}>📋 查看预约 →</div>
            </div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={goToFamily} title="查看家庭提醒">
            <div className="stat-icon yellow">🔔</div>
            <div className="stat-info">
              <div className="stat-number">{stats.reminded_tasks}</div>
              <div className="stat-label">已提醒任务数</div>
              <div style={{ fontSize: 11, color: '#636E72', marginTop: 4 }}>👨‍👩‍👧 去提醒 →</div>
            </div>
          </div>
          <div className="stat-card" style={{ cursor: 'pointer' }} onClick={goToFamily} title="查看家庭协同">
            <div className="stat-icon red">👨‍👩‍👧</div>
            <div className="stat-info">
              <div className="stat-number">{family.reminded_members_count}/{family.total_members}</div>
              <div className="stat-label">家庭提醒覆盖率 {(family.reminder_coverage * 100).toFixed(0)}%</div>
              <div style={{ fontSize: 11, color: '#636E72', marginTop: 4 }}>🏠 家庭共享 →</div>
            </div>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>该月龄暂无任务</p>
          </div>
        ) : (
          <div className="taskflow-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {tasks.map(task => {
              const flowCfg = FLOW_STATUS_CONFIG[task.flow_status] || FLOW_STATUS_CONFIG.need_action
              return (
                <div key={task.task_id} className="card taskflow-card" style={{
                  borderLeft: `4px solid ${flowCfg.color}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span className={`detail-type ${task.task_type === 'vaccine' ? (task.vaccine_type === 'paid' ? 'type-paid' : 'type-free') : 'type-checkup'}`}>
                          {task.task_type_label}
                        </span>
                        <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>{task.title}</h3>
                        {task.overdue && (
                          <span className="badge badge-red">⚠️ 已逾期</span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#636E72', lineHeight: 1.7 }}>
                        {task.task_type === 'vaccine' ? (
                          <>
                            <div>📌 计划日期: <strong>{task.planned_date}</strong> (适用 {task.applicable_age_months ?? task.vaccine?.applicable_age_months ?? ''}月龄)</div>
                            {task.actual_date && <div>✅ 实际接种: <strong>{task.actual_date}</strong>{task.vaccination_site ? ` @ ${task.vaccination_site}` : ''}</div>}
                            <div>💉 类型: {task.vaccine_type_label} | 途径: {task.route}</div>
                            {task.precautions && <div>⚠️ 注意事项: {task.precautions}</div>}
                          </>
                        ) : (
                          <>
                            <div>📌 计划月龄: <strong>{task.related_checkup_id ? target_month : ''}月龄</strong></div>
                            {task.record?.checkup_date && <div>✅ 体检日期: <strong>{task.record.checkup_date}</strong></div>}
                            {task.checkup_items?.length > 0 && (
                              <div>🔍 检查项: {task.checkup_items.join('、')}</div>
                            )}
                          </>
                        )}
                      </div>

                      {task.record && (task.record.height || task.record.weight || task.record.head_circumference) && (
                        <div style={{ display: 'flex', gap: 16, marginTop: 10, paddingTop: 10, borderTop: '1px dashed #DFE6E9' }}>
                          {task.record.height && <span>📏 {task.record.height}cm</span>}
                          {task.record.weight && <span>⚖️ {task.record.weight}kg</span>}
                          {task.record.head_circumference && <span>🧠 {task.record.head_circumference}cm</span>}
                          {task.record.doctor_advice && <span style={{ flex: 1 }}>💬 {task.record.doctor_advice}</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ minWidth: 280, maxWidth: 360 }}>
                      <div style={{
                        padding: '12px 16px',
                        borderRadius: 8,
                        background: `${flowCfg.color}15`,
                        marginBottom: 12,
                        border: `1px solid ${flowCfg.color}40`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 18 }}>{flowCfg.icon}</span>
                          <span style={{ fontWeight: 600, color: flowCfg.color }}>
                            当前状态: {flowCfg.label}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          gap: 4,
                          marginTop: 10,
                        }}>
                          {['need_action', 'reminded', 'appointment_pending', 'appointment_confirmed', 'completed'].map((step, i) => {
                            const order = ['need_action', 'reminded', 'appointment_pending', 'appointment_confirmed', 'completed']
                            const currentIdx = order.indexOf(task.flow_status)
                            const stepIdx = order.indexOf(step)
                            const reached = stepIdx <= currentIdx
                            const labels = ['待预约', '已提醒', '待确认', '已确认', '已完成']
                            return (
                              <div key={step} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>
                                <div style={{
                                  width: '100%',
                                  height: 6,
                                  borderRadius: 3,
                                  background: reached ? flowCfg.color : '#DFE6E9',
                                  marginBottom: 4,
                                }} />
                                <span style={{ color: reached ? flowCfg.color : '#999' }}>{labels[i]}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {task.appointment && (
                        <div style={{ fontSize: 12, color: '#636E72', lineHeight: 1.8, padding: '8px 12px', background: '#F8F9FD', borderRadius: 6, marginBottom: 12 }}>
                          <div><strong>预约信息:</strong></div>
                          <div>📅 {task.appointment.appointment_date} {task.appointment.time_slot_label}</div>
                          <div>🏥 {task.appointment.hospital}</div>
                          {task.appointment.reminded_at && (
                            <div style={{ color: '#00B894' }}>
                              🔔 已由 {task.appointment.reminded_by_name || '用户'} 提醒
                              ({task.appointment.reminded_at.split('T')[0]})
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {task.flow_status === 'need_action' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => goToAppointment(task)}
                          >
                            ➕ 发起预约
                          </button>
                        )}
                        {task.appointment && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => goToAppointmentDetail(task.appointment.id)}
                          >
                            📋 查看预约
                          </button>
                        )}
                        {task.task_type === 'vaccine' && task.schedule_status === 'pending' && !task.actual_date && (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleMarkCompleted(task.related_schedule_id)}
                          >
                            ✓ 标记完成
                          </button>
                        )}
                        {task.appointment && !task.appointment.reminded_at && task.flow_status !== 'completed' && (
                          <button
                            className="btn btn-sm btn-yellow"
                            onClick={goToFamily}
                          >
                            🔔 去提醒
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/babies')}>← 返回</button>
        <h1>{baby.name}</h1>
      </div>

      <div className="card baby-info-card">
        <div className="card-body">
          <div className="baby-info-grid">
            <div className="info-item">
              <span className="info-label">性别</span>
              <span className="info-value">{baby.gender === 'male' ? '♂ 男' : '♀ 女'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">出生日期</span>
              <span className="info-value">{baby.birth_date}</span>
            </div>
            <div className="info-item">
              <span className="info-label">月龄</span>
              <span className="info-value highlight">{baby.age_months}个月</span>
            </div>
            {baby.birth_weight && (
              <div className="info-item">
                <span className="info-label">出生体重</span>
                <span className="info-value">{baby.birth_weight} kg</span>
              </div>
            )}
            {baby.hospital_preference && (
              <div className="info-item">
                <span className="info-label">偏好医院</span>
                <span className="info-value">{baby.hospital_preference}</span>
              </div>
            )}
            {baby.remarks && (
              <div className="info-item">
                <span className="info-label">备注</span>
                <span className="info-value">{baby.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'taskflow' ? 'active' : ''}`}
          onClick={() => handleTabChange('taskflow')}
        >
          📊 月龄任务流
        </button>
        <button
          className={`tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => handleTabChange('schedules')}
        >
          💉 接种计划
        </button>
        <button
          className={`tab ${activeTab === 'checkups' ? 'active' : ''}`}
          onClick={() => handleTabChange('checkups')}
        >
          🩺 体检记录
        </button>
        <button
          className={`tab ${activeTab === 'preparation' ? 'active' : ''}`}
          onClick={() => handleTabChange('preparation')}
        >
          🏥 到院准备 {prepChecklists.length > 0 ? `(${prepChecklists.length})` : ''}
        </button>
        <button
          className={`tab ${activeTab === 'health-events' ? 'active' : ''}`}
          onClick={() => handleTabChange('health-events')}
        >
          🩺 健康事件 {healthEvents.length > 0 ? `(${healthEvents.length})` : ''}
        </button>
      </div>

      {activeTab === 'taskflow' && renderTaskFlow()}

      {activeTab === 'schedules' && (
        <div className="tab-content">
          {schedules.length === 0 ? (
            <div className="empty-state">
              <p>暂无接种计划</p>
              <button
                className="btn btn-primary"
                onClick={handleGenerateSchedule}
                disabled={generating}
              >
                {generating ? '生成中...' : '生成接种计划'}
              </button>
            </div>
          ) : (
            <div className="timeline">
              {schedules.map(schedule => {
                const statusCfg = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.pending
                return (
                  <div key={schedule.id} className="timeline-item">
                    <div className={`timeline-dot dot-${schedule.status}`} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-title">
                          {schedule.vaccine_name || schedule.vaccine}
                        </span>
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </div>
                      <div className="timeline-date">计划日期: {schedule.planned_date}</div>
                      {schedule.status === 'completed' && schedule.actual_date && (
                        <div className="timeline-date">实际接种: {schedule.actual_date}</div>
                      )}
                      {schedule.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleMarkCompleted(schedule.id)}
                          >
                            标记已接种
                          </button>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/appointments/new?baby_id=${id}&type=vaccine&schedule_id=${schedule.id}`)}
                          >
                            发起预约
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'checkups' && (
        <div className="tab-content">
          {checkupRecords.length === 0 ? (
            <div className="empty-state">
              <p>暂无体检记录</p>
            </div>
          ) : (
            <div className="checkup-list">
              {checkupRecords.map(record => (
                <div key={record.id} className="card">
                  <div className="card-body">
                    <div className="checkup-header">
                      <span className="checkup-date">{record.checkup_date}</span>
                      {record.checkup_name && (
                        <span className="checkup-name">{record.checkup_name}</span>
                      )}
                    </div>
                    <div className="checkup-stats">
                      {record.height && (
                        <div className="stat-item">
                          <span className="stat-label">身高</span>
                          <span className="stat-value">{record.height} cm</span>
                        </div>
                      )}
                      {record.weight && (
                        <div className="stat-item">
                          <span className="stat-label">体重</span>
                          <span className="stat-value">{record.weight} kg</span>
                        </div>
                      )}
                      {record.head_circumference && (
                        <div className="stat-item">
                          <span className="stat-label">头围</span>
                          <span className="stat-value">{record.head_circumference} cm</span>
                        </div>
                      )}
                    </div>
                    {record.doctor_advice && (
                      <div className="checkup-advice">
                        <span className="advice-label">医生建议:</span>
                        <span>{record.doctor_advice}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'preparation' && (
        <div className="tab-content">
          {prepChecklists.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏥</div>
              <p>暂无到院准备记录</p>
              <button className="btn btn-primary" onClick={() => navigate('/preparation')}>
                前往到院准备中心
              </button>
            </div>
          ) : (
            <div className="card-list">
              {prepChecklists.map(cl => {
                const prepStatusMap = {
                  not_started: { label: '未开始', color: '#B2BEC3', bg: '#DFE6E9' },
                  in_progress: { label: '准备中', color: '#FDCB6E', bg: '#FEF3C7' },
                  completed: { label: '已完成', color: '#00B894', bg: '#D1FAE5' },
                  verified: { label: '已核验', color: '#6C5CE7', bg: '#EDEFFC' },
                }
                const prepCfg = prepStatusMap[cl.status] || prepStatusMap.not_started
                return (
                  <div key={cl.id} className="card" style={{ borderLeft: `4px solid ${prepCfg.color}` }}>
                    <div className="card-header">
                      <span className="card-title">{cl.appointment_info?.vaccine_name || cl.appointment_info?.checkup_type || '预约'}</span>
                      <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, background: prepCfg.bg, color: prepCfg.color, fontWeight: 600 }}>
                        {prepCfg.label}
                      </span>
                    </div>
                    <div className="card-body">
                      <div className="card-row">
                        <span className="card-label">预约日期</span>
                        <span className="card-value">{cl.appointment_info?.date}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">预约医院</span>
                        <span className="card-value">{cl.appointment_info?.hospital}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">准备进度</span>
                        <span className="card-value">
                          {(cl.completion_rate * 100).toFixed(0)}%
                          <div className="progress-bar-container" style={{ width: 100, display: 'inline-block', marginLeft: 8, verticalAlign: 'middle' }}>
                            <div className="progress-bar-fill" style={{ width: `${cl.completion_rate * 100}%`, background: prepCfg.color }} />
                          </div>
                        </span>
                      </div>
                      {cl.report_generated && (
                        <div className="card-row">
                          <span className="card-label">报告</span>
                          <span className="card-value text-success">✅ 已生成</span>
                        </div>
                      )}
                    </div>
                    <div className="card-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => navigate('/preparation')}>
                        🏥 查看详情
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'health-events' && (
        <div className="tab-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#636E72' }}>
              共 {healthEvents.length} 条健康事件记录
            </div>
            <Link to={`/health-events/new?baby_id=${id}`} className="btn btn-primary">
              ➕ 记录健康事件
            </Link>
          </div>

          {healthEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🩺</div>
              <p>暂无健康事件记录</p>
              <Link to={`/health-events/new?baby_id=${id}`} className="btn btn-primary">
                记录第一条健康事件
              </Link>
            </div>
          ) : (
            <div className="card-list">
              {healthEvents.map(event => {
                const typeIcons = { fever: '🌡️', rash: '🔴', crying: '😭', appetite: '🍽️', sleep: '😴', doctor_followup: '👨‍⚕️', other: '📋' }
                const typeLabels = { fever: '发热', rash: '皮疹', crying: '异常哭闹', appetite: '食欲变化', sleep: '睡眠异常', doctor_followup: '医生回访建议', other: '其他' }
                const statusColors = { observing: '#FDCB6E', need_revisit: '#E17055', relieved: '#00B894', archived: '#636E72' }
                const statusBgs = { observing: '#FEF3C7', need_revisit: '#FEE2E2', relieved: '#D1FAE5', archived: '#DFE6E9' }
                const statusLabels = { observing: '观察中', need_revisit: '需复诊', relieved: '已缓解', archived: '已归档' }
                const severityClasses = { mild: 'badge badge-green', moderate: 'badge badge-orange', severe: 'badge badge-red' }
                const severityLabels = { mild: '轻微', moderate: '中等', severe: '严重' }

                return (
                  <div key={event.id} className="card">
                    <div className="card-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20 }}>{typeIcons[event.event_type] || '📋'}</span>
                        <div>
                          <div className="card-title">{typeLabels[event.event_type] || event.event_type}</div>
                          <div style={{ fontSize: 12, color: '#636E72' }}>
                            {event.occurrence_time?.replace('T', ' ')}
                            {event.age_months_at_event !== null && event.age_months_at_event !== undefined && (
                              <span style={{ marginLeft: 8 }}>({event.age_months_at_event}月龄时)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span className={severityClasses[event.severity] || 'badge'}>{severityLabels[event.severity] || event.severity}</span>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: 10,
                          fontSize: 12,
                          background: statusBgs[event.status] || '#DFE6E9',
                          color: statusColors[event.status] || '#636E72',
                          fontWeight: 600,
                        }}>
                          {statusLabels[event.status] || event.status}
                        </span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="card-row">
                        <span className="card-label">症状</span>
                        <span className="card-value">{event.symptoms}</span>
                      </div>
                      {event.temperature && (
                        <div className="card-row">
                          <span className="card-label">体温</span>
                          <span className="card-value" style={{ color: '#E17055', fontWeight: 600 }}>
                            🌡️ {event.temperature}℃
                          </span>
                        </div>
                      )}
                      {event.treatment && (
                        <div className="card-row">
                          <span className="card-label">处理措施</span>
                          <span className="card-value">{event.treatment}</span>
                        </div>
                      )}
                      {event.doctor_advice && (
                        <div className="card-row">
                          <span className="card-label">医生建议</span>
                          <span className="card-value">💬 {event.doctor_advice}</span>
                        </div>
                      )}
                      <div className="card-row">
                        <span className="card-label">跟进</span>
                        <span className="card-value">
                          {event.created_by_name && `✍️ ${event.created_by_name}记录`}
                          {event.followed_by_name && ` · 👤 ${event.followed_by_name}负责`}
                          {event.viewers_count > 0 && ` · 👁️ ${event.viewers_count}人已查看`}
                        </span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <Link to={`/health-events/${event.id}`} className="btn btn-sm btn-primary">
                        👁️ 查看详情
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
