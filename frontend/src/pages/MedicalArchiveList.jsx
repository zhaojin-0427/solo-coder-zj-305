import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  fetchMedicalArchives, fetchArchiveTimeline, fetchArchiveTags,
  fetchBabies, fetchFamilies,
} from '../api'

const ARCHIVE_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'vaccine_certificate', label: '接种凭证' },
  { value: 'checkup_report', label: '体检报告' },
  { value: 'lab_result', label: '化验单' },
  { value: 'doctor_advice', label: '医生建议' },
  { value: 'revisit_note', label: '复诊单' },
  { value: 'photo', label: '照片材料' },
  { value: 'preparation_doc', label: '到院准备材料' },
  { value: 'reaction_record', label: '反应观察记录' },
  { value: 'other', label: '其他资料' },
]

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已归档' },
  { value: 'needs_action', label: '待处理' },
  { value: 'expired', label: '已过期' },
  { value: 'archived_obsolete', label: '已作废' },
]

const SOURCE_OPTIONS = [
  { value: '', label: '全部来源' },
  { value: 'manual', label: '手动上传' },
  { value: 'appointment', label: '预约关联' },
  { value: 'health_event', label: '健康事件关联' },
  { value: 'reaction', label: '反应观察关联' },
  { value: 'preparation', label: '到院准备关联' },
  { value: 'vaccination', label: '接种记录关联' },
]

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

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function MedicalArchiveList() {
  const navigate = useNavigate()
  const query = useQuery()
  const [viewMode, setViewMode] = useState(query.get('view') || 'list')
  const [archives, setArchives] = useState([])
  const [timeline, setTimeline] = useState([])
  const [tags, setTags] = useState([])
  const [babies, setBabies] = useState([])
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    baby_id: query.get('baby_id') || '',
    family_id: query.get('family_id') || '',
    archive_type: '',
    status: '',
    source_type: '',
    age_month_min: '',
    age_month_max: '',
    tag_ids: [],
    event_date_from: '',
    event_date_to: '',
  })

  useEffect(() => {
    Promise.all([
      fetchBabies(),
      fetchFamilies(),
      fetchArchiveTags(),
    ]).then(([b, f, t]) => {
      setBabies(Array.isArray(b) ? b : [])
      setFamilies(Array.isArray(f) ? f : [])
      setTags(Array.isArray(t) ? t : [])
    }).catch(console.error)
  }, [])

  const loadData = () => {
    setLoading(true)
    const params = {}
    if (filters.baby_id) params.baby_id = filters.baby_id
    if (filters.family_id) params.family_id = filters.family_id
    if (filters.archive_type) params.archive_type = filters.archive_type
    if (filters.status) params.status = filters.status
    if (filters.source_type) params.source_type = filters.source_type
    if (filters.age_month_min) params.age_month_min = filters.age_month_min
    if (filters.age_month_max) params.age_month_max = filters.age_month_max
    if (filters.tag_ids.length > 0) params.tag_ids = filters.tag_ids
    if (filters.event_date_from) params.event_date_from = filters.event_date_from
    if (filters.event_date_to) params.event_date_to = filters.event_date_to
    params.page_size = 1000

    if (viewMode === 'timeline' && filters.baby_id) {
      fetchArchiveTimeline(filters.baby_id)
        .then(data => {
          setTimeline(Array.isArray(data) ? data : [])
          setArchives([])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    } else {
      fetchMedicalArchives(params)
        .then(data => {
          setArchives(Array.isArray(data) ? data : data.results || [])
          setTimeline([])
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    loadData()
  }, [filters, viewMode])

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleTagToggle = (tagId) => {
    setFilters(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId],
    }))
  }

  const resetFilters = () => {
    setFilters({
      baby_id: query.get('baby_id') || '',
      family_id: query.get('family_id') || '',
      archive_type: '',
      status: '',
      source_type: '',
      age_month_min: '',
      age_month_max: '',
      tag_ids: [],
      event_date_from: '',
      event_date_to: '',
    })
  }

  const goToCreate = () => {
    const params = new URLSearchParams()
    if (filters.baby_id) params.set('baby_id', filters.baby_id)
    navigate(`/medical-archives/new?${params.toString()}`)
  }

  const renderArchiveCard = (archive) => {
    const statusCfg = STATUS_COLORS[archive.status] || STATUS_COLORS.draft
    return (
      <div key={archive.id} className="card" style={{ borderLeft: `4px solid ${statusCfg.color}` }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{TYPE_ICONS[archive.archive_type] || '📄'}</span>
            <div>
              <div className="card-title">{archive.title}</div>
              <div style={{ fontSize: 12, color: '#636E72' }}>
                {archive.event_date}
                {archive.age_months_at_event !== null && archive.age_months_at_event !== undefined && (
                  <span style={{ marginLeft: 8 }}>({archive.age_months_at_event}月龄)</span>
                )}
                {archive.baby_name && <span style={{ marginLeft: 8 }}>· {archive.baby_name}</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              padding: '2px 10px',
              borderRadius: 10,
              fontSize: 12,
              background: statusCfg.bg,
              color: statusCfg.color,
              fontWeight: 600,
            }}>
              {archive.status_label}
            </span>
            {archive.file_url && <span title="有附件">📎</span>}
            {archive.expiry_date && <span title={`到期: ${archive.expiry_date}`}>⏰</span>}
          </div>
        </div>
        <div className="card-body">
          <div className="card-row">
            <span className="card-label">类型</span>
            <span className="card-value">{archive.archive_type_label}</span>
          </div>
          <div className="card-row">
            <span className="card-label">来源</span>
            <span className="card-value">{archive.source_type_label}</span>
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
          {archive.description && (
            <div className="card-row">
              <span className="card-label">描述</span>
              <span className="card-value">{archive.description}</span>
            </div>
          )}
          {archive.tags && archive.tags.length > 0 && (
            <div className="card-row">
              <span className="card-label">标签</span>
              <span className="card-value">
                {archive.tags.map(tag => (
                  <span key={tag.id} style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 11,
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
          {archive.viewers_count > 0 && (
            <div className="card-row">
              <span className="card-label">查看</span>
              <span className="card-value">👁️ {archive.viewers_count}人已查看</span>
            </div>
          )}
          {(archive.appointment_info || archive.health_event_info || archive.reaction_info) && (
            <div className="card-row">
              <span className="card-label">关联</span>
              <span className="card-value">
                {archive.appointment_info && <span>📅 预约 · </span>}
                {archive.health_event_info && <span>🩺 健康事件 · </span>}
                {archive.reaction_info && <span>💊 反应观察</span>}
              </span>
            </div>
          )}
        </div>
        <div className="card-actions">
          <Link to={`/medical-archives/${archive.id}`} className="btn btn-sm btn-primary">
            👁️ 查看详情
          </Link>
        </div>
      </div>
    )
  }

  const renderTimeline = () => {
    if (timeline.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <p>暂无归档资料</p>
          <button className="btn btn-primary" onClick={goToCreate}>
            上传第一份资料
          </button>
        </div>
      )
    }
    return (
      <div className="timeline">
        {timeline.map(group => (
          <div key={group.month_key}>
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              margin: '20px 0 12px',
              paddingLeft: 8,
              borderLeft: '3px solid #6C5CE7',
            }}>
              {group.month_label} ({group.archives.length}份)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {group.archives.map(a => renderArchiveCard(a))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/babies')}>← 返回</button>
        <h1>📂 就诊资料电子归档中心</h1>
        <button className="btn btn-primary" onClick={goToCreate}>
          ➕ 上传资料
        </button>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            value={filters.baby_id}
            onChange={(e) => handleFilterChange('baby_id', e.target.value)}
            className="form-input-sm"
          >
            <option value="">全部宝宝</option>
            {babies.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            value={filters.family_id}
            onChange={(e) => handleFilterChange('family_id', e.target.value)}
            className="form-input-sm"
          >
            <option value="">全部家庭</option>
            {families.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <select
            value={filters.archive_type}
            onChange={(e) => handleFilterChange('archive_type', e.target.value)}
            className="form-input-sm"
          >
            {ARCHIVE_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="form-input-sm"
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filters.source_type}
            onChange={(e) => handleFilterChange('source_type', e.target.value)}
            className="form-input-sm"
          >
            {SOURCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.event_date_from}
            onChange={(e) => handleFilterChange('event_date_from', e.target.value)}
            placeholder="开始日期"
            className="form-input-sm"
          />
          <input
            type="date"
            value={filters.event_date_to}
            onChange={(e) => handleFilterChange('event_date_to', e.target.value)}
            placeholder="结束日期"
            className="form-input-sm"
          />
          <input
            type="number"
            value={filters.age_month_min}
            onChange={(e) => handleFilterChange('age_month_min', e.target.value)}
            placeholder="最小月龄"
            className="form-input-sm"
            style={{ width: 90 }}
          />
          <input
            type="number"
            value={filters.age_month_max}
            onChange={(e) => handleFilterChange('age_month_max', e.target.value)}
            placeholder="最大月龄"
            className="form-input-sm"
            style={{ width: 90 }}
          />
          <button className="btn btn-sm btn-secondary" onClick={resetFilters}>重置</button>
        </div>
        {tags.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: '#636E72', marginRight: 4 }}>标签筛选:</span>
            {tags.map(tag => (
              <span
                key={tag.id}
                onClick={() => handleTagToggle(tag.id)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 12,
                  fontSize: 12,
                  cursor: 'pointer',
                  background: filters.tag_ids.includes(tag.id) ? tag.color : `${tag.color}20`,
                  color: filters.tag_ids.includes(tag.id) ? '#fff' : tag.color,
                  border: `1px solid ${tag.color}`,
                  fontWeight: 600,
                }}
              >
                {tag.name} ({tag.archives_count || 0})
              </span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('list')}
          >
            📋 列表视图
          </button>
          <button
            className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('timeline')}
            disabled={!filters.baby_id}
            title={!filters.baby_id ? '请先选择宝宝' : ''}
          >
            📅 时间线视图
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#636E72', alignSelf: 'center' }}>
            共 {viewMode === 'timeline' ? timeline.reduce((s, g) => s + g.archives.length, 0) : archives.length} 份资料
          </span>
        </div>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : viewMode === 'timeline' ? (
        renderTimeline()
      ) : (
        archives.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <p>暂无归档资料</p>
            <button className="btn btn-primary" onClick={goToCreate}>
              上传第一份资料
            </button>
          </div>
        ) : (
          <div className="card-list">
            {archives.map(a => renderArchiveCard(a))}
          </div>
        )
      )}
    </div>
  )
}
