import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  fetchHealthEvent, addHealthEventUpdate,
  markHealthEventViewed, changeHealthEventStatus,
  assignHealthEventFollower, fetchFamilyMembers,
} from '../api'

const EVENT_TYPE_MAP = {
  fever: { label: '发热', icon: '🌡️', color: '#E17055' },
  rash: { label: '皮疹', icon: '🔴', color: '#E84393' },
  crying: { label: '异常哭闹', icon: '😭', color: '#FDCB6E' },
  appetite: { label: '食欲变化', icon: '🍽️', color: '#00B894' },
  sleep: { label: '睡眠异常', icon: '😴', color: '#6C5CE7' },
  doctor_followup: { label: '医生回访建议', icon: '👨‍⚕️', color: '#74B9FF' },
  other: { label: '其他健康事件', icon: '📋', color: '#636E72' },
}

const SEVERITY_MAP = {
  mild: { label: '轻微', className: 'badge badge-green' },
  moderate: { label: '中等', className: 'badge badge-orange' },
  severe: { label: '严重', className: 'badge badge-red' },
}

const STATUS_MAP = {
  observing: { label: '观察中', color: '#FDCB6E', bg: '#FEF3C7' },
  need_revisit: { label: '需复诊', color: '#E17055', bg: '#FEE2E2' },
  relieved: { label: '已缓解', color: '#00B894', bg: '#D1FAE5' },
  archived: { label: '已归档', color: '#636E72', bg: '#DFE6E9' },
}

export default function HealthEventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState('1')
  const [newUpdate, setNewUpdate] = useState('')
  const [submittingUpdate, setSubmittingUpdate] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [familyMembers, setFamilyMembers] = useState([])

  useEffect(() => {
    loadEvent()
    fetchFamilyMembers({ page_size: 1000 })
      .then(data => setFamilyMembers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [id])

  const loadEvent = async () => {
    try {
      setLoading(true)
      const data = await fetchHealthEvent(id)
      setEvent(data)
    } catch (err) {
      console.error('Failed to fetch event:', err)
    } finally {
      setLoading(false)
    }
  }

  const markAsViewed = async () => {
    try {
      await markHealthEventViewed(id, currentUser)
      loadEvent()
    } catch (err) {
      console.error('Failed to mark viewed:', err)
    }
  }

  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return
    setSubmittingUpdate(true)
    try {
      await addHealthEventUpdate(id, {
        content: newUpdate,
        user_id: currentUser,
      })
      setNewUpdate('')
      loadEvent()
    } catch (err) {
      console.error('Failed to add update:', err)
      alert('添加进展失败，请重试')
    } finally {
      setSubmittingUpdate(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true)
    try {
      const res = await changeHealthEventStatus(id, {
        status: newStatus,
        user_id: currentUser,
        update_content: '在详情页更新状态',
      })
      setEvent(res)
    } catch (err) {
      console.error('Failed to update status:', err)
      alert('状态更新失败')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleAssignFollower = async (userId) => {
    try {
      const res = await assignHealthEventFollower(id, {
        user_id: userId,
        assigned_by_id: currentUser,
      })
      setEvent(res)
    } catch (err) {
      console.error('Failed to assign follower:', err)
      alert('分配负责人失败')
    }
  }

  const formatDateTime = (dt) => {
    if (!dt) return ''
    return dt.replace('T', ' ')
  }

  if (loading) return <div className="page-loading">加载中...</div>
  if (!event) return <div className="empty-state"><p>未找到该健康事件</p></div>

  const typeInfo = EVENT_TYPE_MAP[event.event_type] || EVENT_TYPE_MAP.other
  const severityInfo = SEVERITY_MAP[event.severity] || { label: event.severity, className: 'badge' }
  const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.observing

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/health-events')}>← 返回列表</button>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>{typeInfo.icon}</span>
            <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
          </h1>
          <p style={{ fontSize: 14, color: '#636E72', marginTop: 6 }}>
            👶 {event.baby_name}
            {event.age_months_at_event !== null && event.age_months_at_event !== undefined && (
              <span style={{ marginLeft: 8 }}>
                ({event.age_months_at_event}月龄时发生)
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className={severityInfo.className}>{severityInfo.label}</span>
          <span style={{
            padding: '6px 16px',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            background: statusInfo.bg,
            color: statusInfo.color,
          }}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title">📋 基本信息</div>
            <div className="card-body">
              <div className="card-row">
                <span className="card-label">发生时间</span>
                <span className="card-value">{formatDateTime(event.occurrence_time)}</span>
              </div>
              {event.temperature && (
                <div className="card-row">
                  <span className="card-label">体温</span>
                  <span className="card-value" style={{ color: '#E17055', fontWeight: 600, fontSize: 18 }}>
                    🌡️ {event.temperature}℃
                  </span>
                </div>
              )}
              <div className="card-row">
                <span className="card-label">症状描述</span>
                <span className="card-value">{event.symptoms}</span>
              </div>
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
              {event.next_visit_date && (
                <div className="card-row">
                  <span className="card-label">复诊日期</span>
                  <span className="card-value" style={{ color: '#E17055', fontWeight: 600 }}>
                    📅 {event.next_visit_date}
                  </span>
                </div>
              )}
              {event.remarks && (
                <div className="card-row">
                  <span className="card-label">备注</span>
                  <span className="card-value">{event.remarks}</span>
                </div>
              )}
            </div>
          </div>

          {event.appointment_info && (
            <div className="card">
              <div className="card-title">🔗 关联预约信息</div>
              <div className="card-body">
                <div className="card-row">
                  <span className="card-label">预约类型</span>
                  <span className="card-value">
                    {event.appointment_info.appointment_type === 'vaccine' ? '💉 疫苗接种' : '🩺 体检'}
                  </span>
                </div>
                {event.vaccine_name && (
                  <div className="card-row">
                    <span className="card-label">疫苗</span>
                    <span className="card-value">{event.vaccine_name}</span>
                  </div>
                )}
                {event.checkup_type && (
                  <div className="card-row">
                    <span className="card-label">体检类型</span>
                    <span className="card-value">{event.checkup_type}</span>
                  </div>
                )}
                <div className="card-row">
                  <span className="card-label">预约日期</span>
                  <span className="card-value">{event.appointment_info.appointment_date}</span>
                </div>
                <div className="card-row">
                  <span className="card-label">医院</span>
                  <span className="card-value">🏥 {event.appointment_info.hospital}</span>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>📝 进展跟进记录</span>
              <span className="badge badge-info">{event.updates?.length || 0} 条</span>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="添加新的进展记录..."
                  value={newUpdate}
                  onChange={e => setNewUpdate(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddUpdate()}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAddUpdate}
                  disabled={submittingUpdate || !newUpdate.trim()}
                >
                  {submittingUpdate ? '提交中...' : '添加'}
                </button>
              </div>

              {(!event.updates || event.updates.length === 0) ? (
                <div className="empty-state" style={{ padding: 20 }}>
                  <p>暂无进展记录</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {event.updates.map(update => (
                    <div key={update.id} style={{
                      padding: 12,
                      background: '#F8F9FD',
                      borderRadius: 8,
                      borderLeft: `3px solid ${typeInfo.color}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600 }}>
                          ✍️ {update.created_by_name || '未知用户'}
                        </span>
                        <span style={{ fontSize: 12, color: '#636E72' }}>
                          {formatDateTime(update.created_at)}
                        </span>
                      </div>
                      <div style={{ fontSize: 14, lineHeight: 1.6 }}>{update.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card">
            <div className="card-title">⚙️ 操作</div>
            <div className="card-body">
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: '#636E72', display: 'block', marginBottom: 6 }}>当前操作用户</label>
                <select
                  className="form-input"
                  value={currentUser}
                  onChange={e => setCurrentUser(e.target.value)}
                >
                  <option value="1">admin</option>
                  <option value="2">dad</option>
                  <option value="3">grandma</option>
                  <option value="4">grandpa</option>
                </select>
              </div>

              <button
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', marginBottom: 12 }}
                onClick={markAsViewed}
              >
                👁️ 标记我已查看
              </button>

              <div style={{ fontSize: 13, color: '#636E72', marginBottom: 8 }}>状态切换:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {event.status !== 'observing' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: STATUS_MAP.observing.bg, color: STATUS_MAP.observing.color, border: `1px solid ${STATUS_MAP.observing.color}` }}
                    onClick={() => handleStatusChange('observing')}
                    disabled={statusUpdating}
                  >
                    ↩️ 转为观察中
                  </button>
                )}
                {event.status !== 'need_revisit' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: STATUS_MAP.need_revisit.bg, color: STATUS_MAP.need_revisit.color, border: `1px solid ${STATUS_MAP.need_revisit.color}` }}
                    onClick={() => handleStatusChange('need_revisit')}
                    disabled={statusUpdating}
                  >
                    🏥 标记需复诊
                  </button>
                )}
                {event.status !== 'relieved' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: STATUS_MAP.relieved.bg, color: STATUS_MAP.relieved.color, border: `1px solid ${STATUS_MAP.relieved.color}` }}
                    onClick={() => handleStatusChange('relieved')}
                    disabled={statusUpdating}
                  >
                    ✅ 标记已缓解
                  </button>
                )}
                {event.status !== 'archived' && (
                  <button
                    className="btn btn-sm"
                    style={{ background: STATUS_MAP.archived.bg, color: STATUS_MAP.archived.color, border: `1px solid ${STATUS_MAP.archived.color}` }}
                    onClick={() => handleStatusChange('archived')}
                    disabled={statusUpdating}
                  >
                    📦 归档
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">👥 协同跟进</div>
            <div className="card-body">
              <div className="card-row">
                <span className="card-label">记录人</span>
                <span className="card-value">✍️ {event.created_by_name || '未记录'}</span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 13, color: '#636E72', marginBottom: 6 }}>跟进负责人:</div>
                {event.followed_by_name ? (
                  <div style={{
                    padding: '8px 12px',
                    background: '#EDEFFC',
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ fontWeight: 600, color: '#6C5CE7' }}>
                      👤 {event.followed_by_name}
                      {event.followed_by_relation && ` (${event.followed_by_relation})`}
                    </span>
                  </div>
                ) : (
                  <div style={{ color: '#E17055', fontSize: 13 }}>⚠️ 尚未指定负责人</div>
                )}
                <div style={{ fontSize: 12, color: '#636E72', marginTop: 8, marginBottom: 4 }}>更换负责人:</div>
                <select
                  className="form-input"
                  value=""
                  onChange={e => e.target.value && handleAssignFollower(e.target.value)}
                >
                  <option value="">选择负责人...</option>
                  <option value="1">admin</option>
                  <option value="2">dad (爸爸)</option>
                  <option value="3">grandma (奶奶/外婆)</option>
                  <option value="4">grandpa (爷爷/外公)</option>
                </select>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, color: '#636E72', marginBottom: 8 }}>
                  已查看 ({event.viewers_count || 0} 人):
                </div>
                {(!event.views || event.views.length === 0) ? (
                  <div style={{ fontSize: 12, color: '#B2BEC3' }}>暂无查看记录</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {event.views.map(view => (
                      <div key={view.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '6px 10px',
                        background: '#D1FAE5',
                        borderRadius: 6,
                        fontSize: 13,
                      }}>
                        <span style={{ fontWeight: 500, color: '#059669' }}>✓ {view.viewer_name}</span>
                        {view.viewer_relation && (
                          <span style={{ fontSize: 11, color: '#636E72' }}>({view.viewer_relation})</span>
                        )}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#636E72' }}>
                          {formatDateTime(view.viewed_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">ℹ️ 元数据</div>
            <div className="card-body">
              <div className="card-row">
                <span className="card-label">创建时间</span>
                <span className="card-value">{formatDateTime(event.created_at)}</span>
              </div>
              <div className="card-row">
                <span className="card-label">更新时间</span>
                <span className="card-value">{formatDateTime(event.updated_at)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
