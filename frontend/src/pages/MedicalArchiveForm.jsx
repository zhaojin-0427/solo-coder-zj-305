import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  createMedicalArchive, updateMedicalArchive, fetchMedicalArchive,
  fetchBabies, fetchArchiveTags, fetchAppointments, fetchHealthEvents,
  fetchReactions,
} from '../api'

const ARCHIVE_TYPE_OPTIONS = [
  { value: 'vaccine_certificate', label: '💉 接种凭证' },
  { value: 'checkup_report', label: '🩺 体检报告' },
  { value: 'lab_result', label: '🧪 化验单' },
  { value: 'doctor_advice', label: '💬 医生建议' },
  { value: 'revisit_note', label: '📋 复诊单' },
  { value: 'photo', label: '📷 照片材料' },
  { value: 'preparation_doc', label: '🏥 到院准备材料' },
  { value: 'reaction_record', label: '💊 反应观察记录' },
  { value: 'other', label: '📄 其他资料' },
]

const STATUS_OPTIONS = [
  { value: 'draft', label: '草稿' },
  { value: 'pending_review', label: '待审核' },
  { value: 'approved', label: '已归档' },
  { value: 'needs_action', label: '待处理' },
]

const PERMISSION_OPTIONS = [
  { value: 'family_admin', label: '仅管理员' },
  { value: 'family_all', label: '全体家庭成员' },
  { value: 'custom', label: '指定成员' },
]

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function MedicalArchiveForm() {
  const navigate = useNavigate()
  const query = useQuery()
  const isEdit = query.get('edit') === 'true'
  const [loading, setLoading] = useState(false)
  const [babies, setBabies] = useState([])
  const [tags, setTags] = useState([])
  const [appointments, setAppointments] = useState([])
  const [healthEvents, setHealthEvents] = useState([])
  const [reactions, setReactions] = useState([])
  const [form, setForm] = useState({
    baby: query.get('baby_id') || '',
    title: '',
    archive_type: 'other',
    event_date: new Date().toISOString().split('T')[0],
    description: '',
    doctor_name: '',
    hospital: '',
    file_url: '',
    file_name: '',
    appointment_id: query.get('appointment_id') || '',
    health_event_id: query.get('health_event_id') || '',
    reaction_id: query.get('reaction_id') || '',
    status: 'draft',
    expiry_date: '',
    view_permission: 'family_all',
    tag_ids: [],
    remarks: '',
  })

  useEffect(() => {
    fetchBabies()
      .then(b => setBabies(Array.isArray(b) ? b : []))
      .catch(console.error)
    fetchArchiveTags()
      .then(t => setTags(Array.isArray(t) ? t : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (form.baby) {
      fetchAppointments({ baby_id: form.baby, page_size: 1000 })
        .then(a => setAppointments(Array.isArray(a) ? a : a.results || []))
        .catch(() => {})
      fetchHealthEvents({ baby_id: form.baby, page_size: 1000 })
        .then(h => setHealthEvents(Array.isArray(h) ? h : h.results || []))
        .catch(() => {})
    }
  }, [form.baby])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleTagToggle = (tagId) => {
    setForm(prev => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter(id => id !== tagId)
        : [...prev.tag_ids, tagId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.baby || !form.title) {
      alert('请填写必填项：宝宝、标题')
      return
    }
    setLoading(true)
    try {
      const payload = { ...form }
      if (!payload.appointment_id) delete payload.appointment_id
      if (!payload.health_event_id) delete payload.health_event_id
      if (!payload.reaction_id) delete payload.reaction_id
      if (!payload.expiry_date) delete payload.expiry_date
      if (payload.tag_ids.length === 0) delete payload.tag_ids

      if (isEdit && query.get('id')) {
        await updateMedicalArchive(query.get('id'), payload)
      } else {
        await createMedicalArchive(payload)
      }
      navigate(`/medical-archives${form.baby ? `?baby_id=${form.baby}` : ''}`)
    } catch (err) {
      console.error(err)
      alert('保存失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>← 返回</button>
        <h1>{isEdit ? '✏️ 编辑资料' : '📤 上传就诊资料'}</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="card">
            <div className="card-header">
              <span className="card-title">基本信息</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label>宝宝 <span style={{ color: 'red' }}>*</span></label>
                <select
                  value={form.baby}
                  onChange={e => handleChange('baby', e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">请选择宝宝</option>
                  {babies.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>资料标题 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => handleChange('title', e.target.value)}
                  className="form-input"
                  placeholder="例如：2024年3月乙肝疫苗接种凭证"
                  required
                />
              </div>

              <div className="form-group">
                <label>资料类型</label>
                <select
                  value={form.archive_type}
                  onChange={e => handleChange('archive_type', e.target.value)}
                  className="form-input"
                >
                  {ARCHIVE_TYPE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>事件日期 <span style={{ color: 'red' }}>*</span></label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={e => handleChange('event_date', e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>资料描述</label>
                <textarea
                  value={form.description}
                  onChange={e => handleChange('description', e.target.value)}
                  className="form-input"
                  rows={4}
                  placeholder="请描述这份资料的内容..."
                />
              </div>

              <div className="form-group">
                <label>标签</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tags.map(tag => (
                    <span
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        fontSize: 12,
                        cursor: 'pointer',
                        background: form.tag_ids.includes(tag.id) ? tag.color : `${tag.color}20`,
                        color: form.tag_ids.includes(tag.id) ? '#fff' : tag.color,
                        border: `1px solid ${tag.color}`,
                        fontWeight: 600,
                      }}
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>备注</label>
                <textarea
                  value={form.remarks}
                  onChange={e => handleChange('remarks', e.target.value)}
                  className="form-input"
                  rows={2}
                  placeholder="可选"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="card">
              <div className="card-header">
                <span className="card-title">关联信息</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>🏥 医院名称</label>
                  <input
                    type="text"
                    value={form.hospital}
                    onChange={e => handleChange('hospital', e.target.value)}
                    className="form-input"
                    placeholder="例如：XX市妇幼保健院"
                  />
                </div>

                <div className="form-group">
                  <label>👨‍⚕️ 医生姓名</label>
                  <input
                    type="text"
                    value={form.doctor_name}
                    onChange={e => handleChange('doctor_name', e.target.value)}
                    className="form-input"
                    placeholder="可选"
                  />
                </div>

                <div className="form-group">
                  <label>📅 关联预约</label>
                  <select
                    value={form.appointment_id}
                    onChange={e => handleChange('appointment_id', e.target.value)}
                    className="form-input"
                  >
                    <option value="">不关联</option>
                    {appointments.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.appointment_date} {a.appointment_type === 'vaccine' ? '疫苗' : '体检'}
                        {a.hospital ? ` @ ${a.hospital}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>🩺 关联健康事件</label>
                  <select
                    value={form.health_event_id}
                    onChange={e => handleChange('health_event_id', e.target.value)}
                    className="form-input"
                  >
                    <option value="">不关联</option>
                    {healthEvents.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.event_type_label} - {h.occurrence_time?.split('T')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>💊 关联反应观察</label>
                  <select
                    value={form.reaction_id}
                    onChange={e => handleChange('reaction_id', e.target.value)}
                    className="form-input"
                  >
                    <option value="">不关联</option>
                    {reactions.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.reaction_type} - {r.occurrence_time?.split('T')[0]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header">
                <span className="card-title">文件与权限</span>
              </div>
              <div className="card-body">
                <div className="form-group">
                  <label>📎 文件URL</label>
                  <input
                    type="url"
                    value={form.file_url}
                    onChange={e => handleChange('file_url', e.target.value)}
                    className="form-input"
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group">
                  <label>文件名称</label>
                  <input
                    type="text"
                    value={form.file_name}
                    onChange={e => handleChange('file_name', e.target.value)}
                    className="form-input"
                    placeholder="例如：化验单.pdf"
                  />
                </div>

                <div className="form-group">
                  <label>⏰ 到期日期</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={e => handleChange('expiry_date', e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>资料状态</label>
                  <select
                    value={form.status}
                    onChange={e => handleChange('status', e.target.value)}
                    className="form-input"
                  >
                    {STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>🔐 查看权限</label>
                  <select
                    value={form.view_permission}
                    onChange={e => handleChange('view_permission', e.target.value)}
                    className="form-input"
                  >
                    {PERMISSION_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? '保存中...' : (isEdit ? '保存修改' : '提交归档')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
