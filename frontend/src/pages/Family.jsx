import React, { useState, useEffect } from 'react'
import { fetchFamilies, fetchFamilyMembers, fetchAppointments, markAppointmentReminded, unmarkAppointmentReminded, fetchFamilyReminderStats } from '../api'

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

  useEffect(() => {
    Promise.all([
      fetchFamilies({ page_size: 1000 }),
      fetchFamilyMembers({ page_size: 1000 }),
      fetchAppointments({ page_size: 1000, status: 'pending' }),
    ])
      .then(([familiesData, membersData, appointmentsData]) => {
        setFamilies(familiesData)
        setMembers(membersData)
        setAppointments(appointmentsData)
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
    }
  }, [selectedFamily])

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
    </div>
  )
}
