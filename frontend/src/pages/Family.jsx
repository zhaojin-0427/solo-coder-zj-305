import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchFamilies, fetchFamilyMembers, fetchAppointments, markAppointmentReminded, unmarkAppointmentReminded, fetchFamilyReminderStats, fetchChecklistSummary, fetchHealthEvents, fetchHealthEventCollaboration } from '../api'

const RELATION_LABELS = {
  mother: '妈妈',
  father: '爸爸',
  grandma: '奶奶/外婆',
  grandpa: '爷爷/外公',
  other: '其他',
}

const ROLE_LABELS = {
  admin: '管理员',
  member: '成员',
}

const STATUS_CONFIG = {
  pending: { label: '待确认', className: 'badge badge-warning' },
  confirmed: { label: '已确认', className: 'badge badge-success' },
  completed: { label: '已完成', className: 'badge badge-info' },
  cancelled: { label: '已取消', className: 'badge badge-secondary' },
}

const TIME_SLOT_LABELS = {
  morning_1: '上午 08:00-09:00',
  morning_2: '上午 09:00-10:00',
  morning_3: '上午 10:00-11:00',
  afternoon_1: '下午 13:00-14:00',
  afternoon_2: '下午 14:00-15:00',
  afternoon_3: '下午 15:00-16:00',
}

export default function Family() {
  const [families, setFamilies] = useState([])
  const [members, setMembers] = useState([])
  const [appointments, setAppointments] = useState([])
  const [familyReminderStats, setFamilyReminderStats] = useState([])
  const [selectedFamily, setSelectedFamily] = useState('')
  const [activeTab, setActiveTab] = useState('members')
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [updating, setUpdating] = useState(null)
  const [expandedMember, setExpandedMember] = useState(null)
  const [currentUser, setCurrentUser] = useState('1')
  const [prepSummary, setPrepSummary] = useState(null)
  const [healthEvents, setHealthEvents] = useState([])
  const [healthEventCollab, setHealthEventCollab] = useState(null)

  useEffect(() => {
    Promise.all([
      fetchFamilies({ page_size: 1000 }),
      fetchFamilyMembers({ page_size: 1000 }),
      fetchAppointments({ page_size: 1000, status: 'pending' }),
      fetchHealthEvents({ page_size: 1000 }),
    ])
      .then(([familiesData, membersData, appointmentsData, eventsData]) => {
        setFamilies(familiesData)
        setMembers(membersData)
        setAppointments(appointmentsData)
        setHealthEvents(Array.isArray(eventsData) ? eventsData : [])
        if (familiesData.length > 0) {
          setSelectedFamily(String(familiesData[0].id))
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedFamily) {
      loadFamilyReminderStats()
      loadPrepSummary()
      loadHealthEventCollab()
    }
  }, [selectedFamily])

  const loadHealthEventCollab = async () => {
    if (!selectedFamily) return
    try {
      const data = await fetchHealthEventCollaboration(selectedFamily)
      setHealthEventCollab(data)
    } catch (err) {
      console.error('Failed to load health event collaboration stats:', err)
    }
  }

  const loadPrepSummary = async () => {
    if (!selectedFamily) return
    try {
      const data = await fetchChecklistSummary(null, selectedFamily)
      setPrepSummary(data)
    } catch (err) {
      console.error('Failed to load prep summary:', err)
    }
  }

  const loadFamilyReminderStats = async () => {
    if (!selectedFamily) return
    setStatsLoading(true)
    try {
      const data = await fetchFamilyReminderStats(null, selectedFamily)
      setFamilyReminderStats(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load family reminder stats:', err)
      setFamilyReminderStats([])
    } finally {
      setStatsLoading(false)
    }
  }

  const handleToggleRemind = async (appointmentId, isReminded) => {
    setUpdating(appointmentId)
    try {
      const res = isReminded
        ? await unmarkAppointmentReminded(appointmentId)
        : await markAppointmentReminded(appointmentId, { user_id: currentUser })
      setAppointments(prev => prev.map(a => a.id === appointmentId ? res : a))
      loadFamilyReminderStats()
    } catch (err) {
      console.error('Failed to update remind status:', err)
    } finally {
      setUpdating(null)
    }
  }

  const toggleMemberExpand = (memberId) => {
    setExpandedMember(expandedMember === memberId ? null : memberId)
  }

  const handleRefreshStats = () => {
    loadFamilyReminderStats()
  }

  if (loading) return <div className="loading">加载中...</div>

  const pendingAppointments = appointments.filter(a => a.status === 'pending')

  const currentFamilyStats = familyReminderStats.find(f => String(f.family_id) === selectedFamily)

  const getProgressColor = (rate) => {
    if (rate >= 0.8) return 'green'
    if (rate >= 0.5) return 'yellow'
    return 'red'
  }

  const renderFamilySelector = () => {
    if (families.length <= 1) return null
    return (
      <div className="filter-bar" style={{ marginBottom: 20 }}>
        <div className="filter-group">
          <label>选择家庭:</label>
          <select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>当前操作用户:</label>
          <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
            {members.map(m => (
              <option key={m.user_id} value={m.user_id}>{m.user?.username || m.username} ({RELATION_LABELS[m.user?.profile?.relation_with_baby] || m.relation_label || '成员'})</option>
            ))}
          </select>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={handleRefreshStats}>
          🔄 刷新
        </button>
      </div>
    )
  }

  const renderReminderStats = () => {
    if (!currentFamilyStats) {
      if (statsLoading) return <div className="loading">加载提醒统计中...</div>
      return null
    }

    const { total_members, reminded_members_count, not_reminded_members_count, coverage_rate, members } = currentFamilyStats

    return (
      <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%)' }}>
        <div className="card-title" style={{ color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>👨‍👩‍👧</span>
            家庭提醒协同统计
          </div>
          <span className="badge badge-success">
            覆盖率 {(coverage_rate * 100).toFixed(0)}%
          </span>
        </div>
        <div className="card-body">
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="metric-card green">
              <div className="metric-value">{total_members}</div>
              <div className="metric-label">家庭成员总数</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{reminded_members_count}</div>
              <div className="metric-label">已参与提醒</div>
            </div>
            <div className="metric-card yellow">
              <div className="metric-value">{not_reminded_members_count}</div>
              <div className="metric-label">尚未跟进</div>
            </div>
            <div className="metric-card green">
              <div className="metric-value">{(coverage_rate * 100).toFixed(0)}%</div>
              <div className="metric-label">提醒参与率</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
              <span style={{ color: '#636E72' }}>提醒参与进度</span>
              <span style={{ fontWeight: 600 }}>{reminded_members_count}/{total_members} 人</span>
            </div>
            <div className="progress-bar-container">
              <div 
                className={`progress-bar-fill ${getProgressColor(coverage_rate)}`}
                style={{ width: `${coverage_rate * 100}%` }}
              />
            </div>
          </div>

          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, marginTop: 20 }}>
            👥 成员提醒详情 (点击展开查看历史)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members && members.map(member => {
              const isExpanded = expandedMember === member.member_id
              const hasReminded = member.reminded_count > 0
              return (
                <div 
                  key={member.member_id} 
                  className="family-member-reminder-item"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleMemberExpand(member.member_id)}
                >
                  <div className="family-member-reminder-info">
                    <div className="family-member-reminder-avatar">
                      {member.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {member.username || '未知用户'}
                        <span className={`reminder-status-badge ${hasReminded ? 'active' : 'inactive'}`}>
                          {hasReminded ? '✓ 已参与提醒' : '○ 尚未跟进'}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#636E72', marginTop: 2 }}>
                        {member.role_label}
                        {member.relation_label && ` · ${member.relation_label}`}
                        {hasReminded && ` · 已提醒 ${member.reminded_count} 次`}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 20, color: '#636E72' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              )
            })}
            {members && members.map(member => {
              const isExpanded = expandedMember === member.member_id
              const hasReminded = member.reminded_count > 0
              if (!isExpanded) return null
              return (
                <div key={`history-${member.member_id}`} style={{ paddingLeft: 52, paddingRight: 16, marginBottom: 12 }}>
                  {hasReminded && member.recent_reminders && member.recent_reminders.length > 0 ? (
                    <div className="reminder-history-list">
                      <div style={{ fontSize: 12, color: '#636E72', marginBottom: 8, fontWeight: 500 }}>
                        📋 最近提醒记录:
                      </div>
                      {member.recent_reminders.map((reminder, idx) => (
                        <div key={idx} className="reminder-history-item">
                          <span style={{ marginRight: 8 }}>•</span>
                          <strong>{reminder.baby_name}</strong>
                          <span style={{ margin: '0 6px' }}>-</span>
                          <span>{reminder.type === 'vaccine' ? '疫苗' : '体检'}</span>
                          <span style={{ margin: '0 6px' }}>|</span>
                          <span>{reminder.date}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="not-reminded-hint">
                      该成员尚未参与任何预约提醒
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>家庭共享</h1>
        <p>家庭成员共享提醒状态，明确谁已处理、谁未跟进，避免重复预约或漏约</p>
      </div>

      {renderFamilySelector()}

      {activeTab === 'members' && renderReminderStats()}

      {prepSummary && prepSummary.total_checklists > 0 && (
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #EDEFFC 0%, #F8F9FD 100%)' }}>
          <div className="card-title" style={{ color: '#6C5CE7', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🏥</span>
              到院准备核验概览
            </div>
            <span className="badge" style={{ background: '#6C5CE7', color: '#fff' }}>
              {prepSummary.total_checklists} 个清单
            </span>
          </div>
          <div className="card-body">
            <div className="grid-4" style={{ marginBottom: 16 }}>
              <div className="metric-card" style={{ background: '#DFE6E9' }}>
                <div className="metric-value">{prepSummary.status_distribution?.not_started || 0}</div>
                <div className="metric-label">未开始</div>
              </div>
              <div className="metric-card yellow">
                <div className="metric-value">{prepSummary.status_distribution?.in_progress || 0}</div>
                <div className="metric-label">准备中</div>
              </div>
              <div className="metric-card green">
                <div className="metric-value">{prepSummary.status_distribution?.completed || 0}</div>
                <div className="metric-label">已完成</div>
              </div>
              <div className="metric-card" style={{ background: '#EDEFFC' }}>
                <div className="metric-value" style={{ color: '#6C5CE7' }}>{prepSummary.status_distribution?.verified || 0}</div>
                <div className="metric-label">已核验</div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: '#636E72' }}>平均准备完成率: <strong>{(prepSummary.avg_completion_rate * 100).toFixed(0)}%</strong></span>
              <span style={{ color: '#636E72' }}>缺失项: <strong style={{ color: '#E17055' }}>{prepSummary.verification_stats?.total_missing_items || 0}</strong> | 补录: <strong style={{ color: '#6C5CE7' }}>{prepSummary.verification_stats?.total_supplemented_items || 0}</strong></span>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          👥 成员与提醒统计
        </button>
        <button
          className={`tab ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          🔔 待提醒预约 ({pendingAppointments.length})
        </button>
        <button
          className={`tab ${activeTab === 'health-events' ? 'active' : ''}`}
          onClick={() => setActiveTab('health-events')}
        >
          🩺 健康事件协同 ({healthEvents.length})
        </button>
      </div>

      {activeTab === 'members' && (
        <div className="tab-content">
          {families.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍👩‍👧‍👦</div>
              <p>暂无家庭信息</p>
            </div>
          ) : (
            families.filter(f => String(f.id) === selectedFamily).map(family => (
              <div key={family.id} className="card">
                <div className="card-title">
                  🏠 {family.name}
                  {family.address && <span className="text-muted" style={{ fontSize: 14, marginLeft: 10 }}>{family.address}</span>}
                </div>
                <div className="card-body">
                  {members.filter(m => m.family === family.id).length === 0 ? (
                    <p className="text-muted">暂无家庭成员</p>
                  ) : (
                    <div className="member-grid">
                      {members.filter(m => m.family === family.id).map(member => (
                        <div key={member.id} className="member-card">
                          <div className="member-avatar">
                            {member.username?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="member-info">
                            <div className="member-name">{member.username || '未知用户'}</div>
                            <div className="member-role">
                              <span className="badge badge-info">{ROLE_LABELS[member.role] || member.role}</span>
                              {member.relation_label && (
                                <span className="badge badge-secondary" style={{ marginLeft: 5 }}>
                                  {member.relation_label}
                                </span>
                              )}
                            </div>
                            {member.joined_at && (
                              <div className="member-joined">加入时间: {member.joined_at.split('T')[0]}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'reminders' && (
        <div className="tab-content">
          {pendingAppointments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <p>暂无待提醒的预约</p>
            </div>
          ) : (
            <div className="reminder-list">
              {pendingAppointments.map(apt => {
                const statusCfg = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending
                const isReminded = !!apt.reminded_at
                return (
                  <div key={apt.id} className={`card reminder-card ${isReminded ? 'reminded' : ''}`}>
                    <div className="card-body">
                      <div className="reminder-header">
                        <div className="reminder-info">
                          <span className={`detail-type ${apt.appointment_type === 'vaccine' ? 'type-free' : 'type-checkup'}`}>
                            {apt.appointment_type === 'vaccine' ? '疫苗' : '体检'}
                          </span>
                          <span className="reminder-baby">{apt.baby_name}</span>
                          <span className="reminder-name">
                            {apt.vaccine_name || apt.checkup_type || '预约'}
                          </span>
                        </div>
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </div>
                      <div className="reminder-details">
                        <span>📅 {apt.appointment_date}</span>
                        <span>🕐 {TIME_SLOT_LABELS[apt.time_slot] || apt.time_slot}</span>
                        <span>🏥 {apt.hospital}</span>
                      </div>
                      {isReminded && (
                        <div className="reminder-status">
                          <span className="badge badge-success">
                            ✅ 已由 {apt.reminded_by_name || '未知用户'} 提醒
                            {apt.reminded_at && ` (${apt.reminded_at.split('T')[0]})`}
                          </span>
                        </div>
                      )}
                      <div className="reminder-actions">
                        {isReminded ? (
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleToggleRemind(apt.id, true)}
                            disabled={updating === apt.id}
                          >
                            {updating === apt.id ? '处理中...' : '取消提醒'}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleToggleRemind(apt.id, false)}
                            disabled={updating === apt.id}
                          >
                            {updating === apt.id ? '处理中...' : '✓ 标记已提醒'}
                          </button>
                        )}
                      </div>
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
          {healthEventCollab && (
            <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)' }}>
              <div className="card-title" style={{ color: '#92400E', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🩺</span>
                健康事件家庭协同统计
              </div>
              <div className="card-body">
                <div className="grid-4" style={{ marginBottom: 10 }}>
                  <div className="metric-card yellow">
                    <div className="metric-value">{healthEventCollab.total_events || 0}</div>
                    <div className="metric-label">健康事件总数</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-value">{healthEventCollab.total_created_by_users || 0}</div>
                    <div className="metric-label">参与记录人数</div>
                  </div>
                  <div className="metric-card green">
                    <div className="metric-value">{healthEventCollab.total_viewed_by_users || 0}</div>
                    <div className="metric-label">参与查看人数</div>
                  </div>
                  <div className="metric-card" style={{ background: '#EDEFFC' }}>
                    <div className="metric-value" style={{ color: '#6C5CE7' }}>{healthEventCollab.total_followed_by_users || 0}</div>
                    <div className="metric-label">参与跟进人数</div>
                  </div>
                </div>
                {healthEventCollab.by_user && healthEventCollab.by_user.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>👥 成员参与详情</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {healthEventCollab.by_user.map(userStat => (
                        <div key={userStat.user_id} className="family-member-reminder-item">
                          <div className="family-member-reminder-info">
                            <div className="family-member-reminder-avatar">
                              {userStat.username?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{userStat.username || '未知用户'}</div>
                              <div style={{ fontSize: 12, color: '#636E72', marginTop: 2 }}>
                                ✍️ 记录 {userStat.created_count || 0} 条
                                {userStat.viewed_count > 0 && ` · 👁️ 查看 ${userStat.viewed_count} 次`}
                                {userStat.followed_count > 0 && ` · 👤 跟进 ${userStat.followed_count} 条`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: '#636E72' }}>健康事件协同跟进详情</div>
            <Link to="/health-events" className="btn btn-sm btn-primary">
              📋 查看全部
            </Link>
          </div>

          {healthEvents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🩺</div>
              <p>暂无健康事件记录</p>
              <Link to="/health-events/new" className="btn btn-primary">
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
                          <div className="card-title">
                            {event.baby_name} - {typeLabels[event.event_type] || event.event_type}
                          </div>
                          <div style={{ fontSize: 12, color: '#636E72' }}>
                            {event.occurrence_time?.replace('T', ' ')}
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
                      <div className="card-row">
                        <span className="card-label">✍️ 记录人</span>
                        <span className="card-value">
                          {event.created_by_name || '未知'}
                          {event.created_at && ` · ${event.created_at?.replace('T', ' ')}`}
                        </span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">👤 跟进人</span>
                        <span className="card-value" style={{ color: event.followed_by_name ? '#6C5CE7' : '#636E72', fontWeight: event.followed_by_name ? 600 : 400 }}>
                          {event.followed_by_name || '⚠️ 尚未分配跟进人'}
                        </span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">👁️ 已查看</span>
                        <span className="card-value">
                          {event.viewers_count > 0
                            ? `${event.viewers_count} 人已查看`
                            : '⚠️ 暂无成员查看'}
                        </span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <Link to={`/health-events/${event.id}`} className="btn btn-sm btn-primary">
                        📋 查看/跟进
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
