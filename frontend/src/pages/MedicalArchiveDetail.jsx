import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  fetchMedicalArchive, markArchiveViewed,
  changeArchiveStatus, assignArchiveHandler, updateArchivePermission,
  deleteMedicalArchive, fetchFamilyMembers,
} from '../api'

const TYPE_ICONS = {
  vaccine_certificate: '💉',
  checkup_report: '🩺',
  lab_result: '🧪',
  doctor_advice: '💬',
  revisit_note: '📋',
  photo: '📷',
  preparation_doc: '🏥',
  reaction_record: '💊',
  other: '📄',
}

const STATUS_COLORS = {
  draft: { bg: '#DFE6E9', color: '#636E72' },
  pending_review: { bg: '#FEF3C7', color: '#FDCB6E' },
  approved: { bg: '#D1FAE5', color: '#00B894' },
  needs_action: { bg: '#FEE2E2', color: '#E17055' },
  expired: { bg: '#EDEFFC', color: '#6C5CE7' },
  archived_obsolete: { bg: '#F1F2F6', color: '#B2BEC3' },
}

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已归档' },
  { value: 'needs_action', label: '待处理' },
  { value: 'expired', label: '已过期' },
  { value: 'archived_obsolete', label: '已作废' },
]

const PERMISSION_OPTIONS = [
  { value: 'family_admin', label: '仅管理员' },
  { value: 'family_all', label: '全体家庭成员' },
  { value: 'custom', label: '指定成员' },
]

export default function MedicalArchiveDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [archive, setArchive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [familyMembers, setFamilyMembers] = useState([])
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [newPermission, setNewPermission] = useState('family_all')
  const [selectedViewers, setSelectedViewers] = useState([])

  useEffect(() => {
    fetchMedicalArchive(id)
      .then(data => {
        setArchive(data)
        setNewPermission(data.view_permission || 'family_all')
        setSelectedViewers(data.allowed_viewers_info?.map(v => v.user_id) || [])
        if (data.family_info?.id) {
          fetchFamilyMembers({ family_id: data.family_info.id })
            .then(m => setFamilyMembers(Array.isArray(m) ? m : []))
            .catch(() => {})
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleMarkViewed = (userId = 1) => {
    markArchiveViewed(id, userId)
      .then(() => fetchMedicalArchive(id).then(setArchive))
      .catch(console.error)
  }

  const handleChangeStatus = () => {
    if (!newStatus) return
    changeArchiveStatus(id, {
      status: newStatus,
      change_reason: statusReason,
      user_id: 1,
    })
      .then(data => {
        setArchive(data)
        setShowStatusModal(false)
        setStatusReason('')
      })
      .catch(console.error)
  }

  const handleUpdatePermission = () => {
    const data = { view_permission: newPermission }
    if (newPermission === 'custom') {
      data.allowed_viewer_ids = selectedViewers
    }
    updateArchivePermission(id, data)
      .then(d => {
        setArchive(d)
        setShowPermissionModal(false)
      })
      .catch(console.error)
  }

  const handleDelete = () => {
    if (confirm('确定要删除这份资料吗？')) {
      deleteMedicalArchive(id)
        .then(() => navigate('/medical-archives'))
        .catch(console.error)
    }
  }

  if (loading) return <div className="loading">加载中...</div>
  if (!archive) return <div className="loading">未找到资料</div>

  const statusCfg = STATUS_COLORS[archive.status] || STATUS_COLORS.draft

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/medical-archives')}>← 返回列表</button>
        <h1>{TYPE_ICONS[archive.archive_type] || '📄'} {archive.title}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-yellow" onClick={() => setShowStatusModal(true)}>
            🔄 变更状态
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowPermissionModal(true)}>
            🔐 权限设置
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => navigate(`/medical-archives/${id}/edit`)}>
            ✏️ 编辑
          </button>
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>
            🗑️ 删除
          </button>
        </div>
      </div>

      <div className="grid-2">
        <div>
          <div className="card" style={{ borderTop: `4px solid ${statusCfg.color}` }}>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{archive.title}</div>
                  <div style={{ fontSize: 13, color: '#636E72', marginTop: 4 }}>
                    {archive.baby_name} · {archive.event_date}
                    {archive.age_months_at_event !== null && archive.age_months_at_event !== undefined && (
                      <span> · {archive.age_months_at_event}月龄</span>
                    )}
                  </div>
                </div>
                <span style={{
                  padding: '4px 14px',
                  borderRadius: 12,
                  fontSize: 13,
                  background: statusCfg.bg,
                  color: statusCfg.color,
                  fontWeight: 600,
                }}>
                  {archive.status_label}
                </span>
              </div>

              <div className="card-row">
                <span className="card-label">资料类型</span>
                <span className="card-value">{archive.archive_type_label}</span>
              </div>
              <div className="card-row">
                <span className="card-label">来源</span>
                <span className="card-value">{archive.source_type_label}</span>
              </div>
              <div className="card-row">
                <span className="card-label">查看权限</span>
                <span className="card-value">{archive.view_permission_label}</span>
              </div>
              {archive.hospital && (
                <div className="card-row">
                  <span className="card-label">医院</span>
                  <span className="card-value">🏥 {archive.hospital}</span>
                </div>
              )}
              {archive.doctor_name && (
                <div className="card-row">
                  <span className="card-label">医生</span>
                  <span className="card-value">👨‍⚕️ {archive.doctor_name}</span>
                </div>
              )}
              {archive.expiry_date && (
                <div className="card-row">
                  <span className="card-label">到期日期</span>
                  <span className="card-value">⏰ {archive.expiry_date}</span>
                </div>
              )}
              {archive.description && (
                <div className="card-row">
                  <span className="card-label">描述</span>
                  <span className="card-value">{archive.description}</span>
                </div>
              )}
              {archive.remarks && (
                <div className="card-row">
                  <span className="card-label">备注</span>
                  <span className="card-value">{archive.remarks}</span>
                </div>
              )}
              {archive.tags && archive.tags.length > 0 && (
                <div className="card-row">
                  <span className="card-label">标签</span>
                  <span className="card-value">
                    {archive.tags.map(tag => (
                      <span key={tag.id} style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 10,
                        fontSize: 12,
                        background: `${tag.color}20`,
                        color: tag.color,
                        marginRight: 6,
                      }}>
                        {tag.name}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {archive.file_url && (
                <div className="card-row">
                  <span className="card-label">附件</span>
                  <span className="card-value">
                    <a href={archive.file_url} target="_blank" rel="noreferrer">
                      📎 {archive.file_name || '查看文件'}
                    </a>
                  </span>
                </div>
              )}
              <div className="card-row">
                <span className="card-label">创建人</span>
                <span className="card-value">{archive.created_by_name || '未知'}</span>
              </div>
              {archive.handled_by_name && (
                <div className="card-row">
                  <span className="card-label">处理人</span>
                  <span className="card-value">{archive.handled_by_name}</span>
                </div>
              )}
              <div className="card-row">
                <span className="card-label">创建时间</span>
                <span className="card-value">{archive.created_at?.replace('T', ' ')}</span>
              </div>
              <div className="card-row">
                <span className="card-label">查看次数</span>
                <span className="card-value">👁️ {archive.viewers_count || 0} 人</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">🔗 关联链路</span>
            </div>
            <div className="card-body">
              {archive.appointment_info ? (
                <div className="card-row">
                  <span className="card-label">📅 关联预约</span>
                  <span className="card-value">
                    <Link to={`/appointments`}>
                      {archive.appointment_info.appointment_date} {archive.appointment_info.time_slot_label}
                      {' @ '}{archive.appointment_info.hospital}
                    </Link>
                  </span>
                </div>
              ) : <div style={{ color: '#999', fontSize: 13 }}>未关联预约</div>}

              {archive.health_event_info ? (
                <div className="card-row">
                  <span className="card-label">🩺 关联健康事件</span>
                  <span className="card-value">
                    <Link to={`/health-events/${archive.health_event_info.id}`}>
                      {archive.health_event_info.event_type_label} - {archive.health_event_info.severity_label}
                    </Link>
                  </span>
                </div>
              ) : <div style={{ color: '#999', fontSize: 13, marginTop: 8 }}>未关联健康事件</div>}

              {archive.reaction_info ? (
                <div className="card-row">
                  <span className="card-label">💊 关联反应观察</span>
                  <span className="card-value">
                    {archive.reaction_info.reaction_type} - {archive.reaction_info.severity_label}
                  </span>
                </div>
              ) : <div style={{ color: '#999', fontSize: 13, marginTop: 8 }}>未关联反应观察</div>}

              {archive.family_info && (
                <div className="card-row">
                  <span className="card-label">👨‍👩‍👧 所属家庭</span>
                  <span className="card-value">
                    <Link to="/family">{archive.family_info.name}</Link>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">👁️ 查看记录 ({archive.views?.length || 0})</span>
            </div>
            <div className="card-body">
              {archive.views && archive.views.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {archive.views.map(view => (
                    <div key={view.id} style={{
                      padding: '10px 12px',
                      background: '#F8F9FD',
                      borderRadius: 6,
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 13,
                    }}>
                      <span>
                        <strong>{view.viewer_name}</strong>
                        {view.viewer_relation && <span style={{ color: '#636E72', marginLeft: 8 }}>({view.viewer_relation})</span>}
                      </span>
                      <span style={{ color: '#636E72' }}>
                        {view.viewed_at?.replace('T', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: 13 }}>暂无查看记录</div>
              )}
              <button className="btn btn-sm btn-secondary" style={{ marginTop: 12 }} onClick={() => handleMarkViewed(1)}>
                ✓ 标记我已查看
              </button>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <span className="card-title">📜 状态流转日志 ({archive.status_logs?.length || 0})</span>
            </div>
            <div className="card-body">
              {archive.status_logs && archive.status_logs.length > 0 ? (
                <div className="timeline" style={{ paddingLeft: 0 }}>
                  {archive.status_logs.map(log => (
                    <div key={log.id} className="timeline-item" style={{ paddingLeft: 20 }}>
                      <div className="timeline-dot" style={{ background: STATUS_COLORS[log.new_status]?.color || '#6C5CE7' }} />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span style={{ fontSize: 13 }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: STATUS_COLORS[log.old_status]?.bg || '#EEE',
                              color: STATUS_COLORS[log.old_status]?.color || '#666',
                              fontSize: 11,
                              marginRight: 6,
                            }}>
                              {log.old_status_label}
                            </span>
                            →
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: 8,
                              background: STATUS_COLORS[log.new_status]?.bg || '#EEE',
                              color: STATUS_COLORS[log.new_status]?.color || '#666',
                              fontSize: 11,
                              marginLeft: 6,
                            }}>
                              {log.new_status_label}
                            </span>
                          </span>
                        </div>
                        <div className="timeline-date">
                          {log.changed_by_name || '系统'} · {log.changed_at?.replace('T', ' ')}
                        </div>
                        {log.change_reason && (
                          <div style={{ fontSize: 12, color: '#636E72', marginTop: 4 }}>
                            原因: {log.change_reason}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#999', fontSize: 13 }}>暂无状态变更</div>
              )}
            </div>
          </div>

          {archive.allowed_viewers_info && archive.allowed_viewers_info.length > 0 && archive.view_permission === 'custom' && (
            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">👥 允许查看成员</span>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {archive.allowed_viewers_info.map(v => (
                    <div key={v.user_id} style={{ fontSize: 13 }}>
                      <strong>{v.username}</strong>
                      {v.relation && <span style={{ color: '#636E72', marginLeft: 8 }}>({v.relation})</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>变更状态</h3>
              <button className="btn btn-sm" onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>新状态</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)} className="form-input">
                  <option value="">请选择</option>
                  {STATUS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>变更原因</label>
                <textarea
                  value={statusReason}
                  onChange={e => setStatusReason(e.target.value)}
                  className="form-input"
                  rows={3}
                  placeholder="可选"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleChangeStatus} disabled={!newStatus}>确认</button>
            </div>
          </div>
        </div>
      )}

      {showPermissionModal && (
        <div className="modal-overlay" onClick={() => setShowPermissionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>查看权限设置</h3>
              <button className="btn btn-sm" onClick={() => setShowPermissionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>权限类型</label>
                <select value={newPermission} onChange={e => setNewPermission(e.target.value)} className="form-input">
                  {PERMISSION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {newPermission === 'custom' && (
                <div className="form-group">
                  <label>指定成员</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {familyMembers.map(m => (
                      <label key={m.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <input
                          type="checkbox"
                          checked={selectedViewers.includes(m.user_id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedViewers(prev => [...prev, m.user_id])
                            } else {
                              setSelectedViewers(prev => prev.filter(id => id !== m.user_id))
                            }
                          }}
                        />
                        <span>{m.user?.username || m.username || '成员'}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPermissionModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleUpdatePermission}>确认</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
