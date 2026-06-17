import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchHealthEvents, fetchBabies, changeHealthEventStatus } from '../api'

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

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function HealthEventList() {
  const query = useQuery()
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [babies, setBabies] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState(query.get('status') || 'all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [babyFilter, setBabyFilter] = useState(query.get('baby_id') || '')
  const [currentUser, setCurrentUser] = useState('1')
  const [statusUpdating, setStatusUpdating] = useState(null)

  useEffect(() => {
    fetchBabies()
      .then(data => setBabies(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadEvents()
  }, [statusFilter, severityFilter, typeFilter, babyFilter])

  const loadEvents = async () => {
    try {
      setLoading(true)
      const params = { page_size: 1000 }
      if (statusFilter !== 'all') params.status = statusFilter
      if (severityFilter !== 'all') params.severity = severityFilter
      if (typeFilter !== 'all') params.event_type = typeFilter
      if (babyFilter) params.baby_id = babyFilter
      const data = await fetchHealthEvents(params)
      setEvents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch health events:', err)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (eventId, newStatus) => {
    setStatusUpdating(eventId)
    try {
      const res = await changeHealthEventStatus(eventId, {
        status: newStatus,
        user_id: currentUser,
        update_content: `由列表页更新状态`,
      })
      setEvents(prev => prev.map(e => e.id === eventId ? res : e))
    } catch (err) {
      console.error('Failed to update status:', err)
    } finally {
      setStatusUpdating(null)
    }
  }

  const formatDateTime = (dt) => {
    if (!dt) return ''
    return dt.replace('T', ' ')
  }

  const goToCreate = () => {
    const params = new URLSearchParams()
    if (babyFilter) params.set('baby_id', babyFilter)
    navigate(`/health-events/new${params.toString() ? '?' + params.toString() : ''}`)
  }

  if (loading) return <div className="page-loading">加载中...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>🩺 宝宝健康事件追踪中心</h1>
          <p style={{ fontSize: 14, color: '#636E72', marginTop: 6 }}>
            记录宝宝健康事件，协同家庭成员跟进处理，避免遗漏和重复
          </p>
        </div>
        <button className="btn btn-primary" onClick={goToCreate}>➕ 记录健康事件</button>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>状态：</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="observing">👀 观察中</option>
            <option value="need_revisit">🏥 需复诊</option>
            <option value="relieved">✅ 已缓解</option>
            <option value="archived">📦 已归档</option>
          </select>
        </div>
        <div className="filter-group">
          <label>严重程度：</label>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="all">全部</option>
            <option value="mild">轻微</option>
            <option value="moderate">中等</option>
            <option value="severe">严重</option>
          </select>
        </div>
        <div className="filter-group">
          <label>事件类型：</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">全部类型</option>
            {Object.entries(EVENT_TYPE_MAP).map(([key, val]) => (
              <option key={key} value={key}>{val.icon} {val.label}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>宝宝：</label>
          <select value={babyFilter} onChange={e => setBabyFilter(e.target.value)}>
            <option value="">全部宝宝</option>
            {babies.map(baby => (
              <option key={baby.id} value={baby.id}>{baby.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>操作用户：</label>
          <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
            <option value="1">admin</option>
            <option value="2">dad</option>
            <option value="3">grandma</option>
            <option value="4">grandpa</option>
          </select>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🩺</div>
          <p>暂无健康事件记录</p>
          <button className="btn btn-primary" onClick={goToCreate}>记录第一条健康事件</button>
        </div>
      ) : (
        <div className="card-list">
          {events.map(event => {
            const typeInfo = EVENT_TYPE_MAP[event.event_type] || EVENT_TYPE_MAP.other
            const severityInfo = SEVERITY_MAP[event.severity] || { label: event.severity, className: 'badge' }
            const statusInfo = STATUS_MAP[event.status] || STATUS_MAP.observing
            return (
              <div key={event.id} className="card health-event-card">
                <div className="card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{typeInfo.icon}</span>
                    <div>
                      <div className="card-title" style={{ color: typeInfo.color }}>
                        {typeInfo.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#636E72' }}>
                        👶 {event.baby_name}
                        {event.age_months_at_event !== null && event.age_months_at_event !== undefined && (
                          <span style={{ marginLeft: 8 }}>
                            ({event.age_months_at_event}月龄时)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={severityInfo.className}>{severityInfo.label}</span>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      background: statusInfo.bg,
                      color: statusInfo.color,
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                <div className="card-body">
                  <div className="card-row">
                    <span className="card-label">发生时间</span>
                    <span className="card-value">{formatDateTime(event.occurrence_time)}</span>
                  </div>
                  {event.temperature && (
                    <div className="card-row">
                      <span className="card-label">体温</span>
                      <span className="card-value" style={{ color: '#E17055', fontWeight: 600 }}>
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
                  {event.appointment_info && (
                    <div className="card-section">
                      <div className="card-section-title">关联信息</div>
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
                  )}

                  <div className="card-section">
                    <div className="card-section-title">协同跟进</div>
                    <div className="card-row">
                      <span className="card-label">记录人</span>
                      <span className="card-value">✍️ {event.created_by_name || '未记录'}</span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">跟进负责人</span>
                      <span className="card-value">
                        {event.followed_by_name
                          ? `👤 ${event.followed_by_name}${event.followed_by_relation ? ` (${event.followed_by_relation})` : ''}`
                          : <span style={{ color: '#E17055' }}>⚠️ 尚未指定</span>
                        }
                      </span>
                    </div>
                    <div className="card-row">
                      <span className="card-label">已查看人数</span>
                      <span className="card-value">
                        👁️ {event.viewers_count || 0} 人
                        {event.views && event.views.length > 0 && (
                          <span style={{ marginLeft: 8, fontSize: 12, color: '#636E72' }}>
                            ({event.views.map(v => v.viewer_name).join('、')})
                          </span>
                        )}
                      </span>
                    </div>
                    {event.updates && event.updates.length > 0 && (
                      <div className="card-row">
                        <span className="card-label">进展记录</span>
                        <span className="card-value">
                          📝 {event.updates.length} 条更新
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="card-actions">
                  <Link to={`/health-events/${event.id}`} className="btn btn-sm btn-primary">
                    👁️ 查看详情
                  </Link>
                  {event.status !== 'archived' && (
                    <>
                      {event.status === 'observing' && (
                        <>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleStatusChange(event.id, 'relieved')}
                            disabled={statusUpdating === event.id}
                          >
                            ✅ 标记已缓解
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleStatusChange(event.id, 'need_revisit')}
                            disabled={statusUpdating === event.id}
                          >
                            🏥 需复诊
                          </button>
                        </>
                      )}
                      {event.status === 'need_revisit' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleStatusChange(event.id, 'relieved')}
                          disabled={statusUpdating === event.id}
                        >
                          ✅ 标记已缓解
                        </button>
                      )}
                      {event.status === 'relieved' && (
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleStatusChange(event.id, 'archived')}
                          disabled={statusUpdating === event.id}
                        >
                          📦 归档
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
