import React, { useState, useEffect } from 'react'
import { fetchFamilies, fetchFamilyMembers, fetchAppointments, markAppointmentReminded, unmarkAppointmentReminded } from '../api'

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
  const [activeTab, setActiveTab] = useState('members')
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(null)

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
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleToggleRemind = async (appointmentId, isReminded) => {
    setUpdating(appointmentId)
    try {
      const res = isReminded
        ? await unmarkAppointmentReminded(appointmentId)
        : await markAppointmentReminded(appointmentId)
      setAppointments(prev => prev.map(a => a.id === appointmentId ? res : a))
    } catch (err) {
      console.error('Failed to update remind status:', err)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <div className="loading">加载中...</div>

  const pendingAppointments = appointments.filter(a => a.status === 'pending')

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>家庭共享</h1>
        <p>家庭成员共享提醒状态，避免重复预约或漏约</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          家庭成员
        </button>
        <button
          className={`tab ${activeTab === 'reminders' ? 'active' : ''}`}
          onClick={() => setActiveTab('reminders')}
        >
          待提醒预约 ({pendingAppointments.length})
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
            families.map(family => (
              <div key={family.id} className="card" style={{ marginBottom: 20 }}>
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
                      {isReminded && apt.reminded_by_name && (
                        <div className="reminder-status">
                          <span className="badge badge-success">
                            ✅ 已由 {apt.reminded_by_name} 提醒
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
