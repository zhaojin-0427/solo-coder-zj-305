import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  fetchBabies, fetchAppointments, createHealthEvent,
} from '../api'

const EVENT_TYPES = [
  { value: 'fever', label: '🌡️ 发热' },
  { value: 'rash', label: '🔴 皮疹' },
  { value: 'crying', label: '😭 异常哭闹' },
  { value: 'appetite', label: '🍽️ 食欲变化' },
  { value: 'sleep', label: '😴 睡眠异常' },
  { value: 'doctor_followup', label: '👨‍⚕️ 医生回访建议' },
  { value: 'other', label: '📋 其他健康事件' },
]

const SEVERITY_OPTIONS = [
  { value: 'mild', label: '轻微', color: '#00B894' },
  { value: 'moderate', label: '中等', color: '#FDCB6E' },
  { value: 'severe', label: '严重', color: '#E17055' },
]

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

function getCurrentDateTimeLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export default function HealthEventForm() {
  const navigate = useNavigate()
  const query = useQuery()
  const [babies, setBabies] = useState([])
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    baby: query.get('baby_id') || '',
    appointment: query.get('appointment_id') || '',
    vaccine: '',
    checkup_type: '',
    event_type: query.get('event_type') || 'fever',
    severity: 'mild',
    occurrence_time: getCurrentDateTimeLocal(),
    symptoms: '',
    temperature: '',
    treatment: '',
    doctor_advice: '',
    next_visit_date: '',
    created_by: '1',
    followed_by: '',
    remarks: '',
  })

  useEffect(() => {
    fetchBabies()
      .then(data => setBabies(Array.isArray(data) ? data : []))
      .catch(console.error)
    fetchAppointments({ page_size: 1000, status: 'completed' })
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAppointmentChange = (aptId) => {
    const apt = appointments.find(a => String(a.id) === String(aptId))
    if (apt) {
      setFormData(prev => ({
        ...prev,
        appointment: aptId,
        baby: apt.baby || apt.baby_id || prev.baby,
        vaccine: apt.vaccine || apt.vaccine_id || '',
        checkup_type: apt.checkup_type || '',
      }))
    } else {
      handleChange('appointment', aptId)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.baby || !formData.event_type || !formData.severity || !formData.occurrence_time || !formData.symptoms) {
      alert('请填写必填项：宝宝、事件类型、严重程度、发生时间、症状描述')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        ...formData,
        temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      }
      if (!payload.appointment) delete payload.appointment
      if (!payload.vaccine) delete payload.vaccine
      if (!payload.followed_by) delete payload.followed_by

      await createHealthEvent(payload)
      navigate('/health-events')
    } catch (err) {
      console.error('Failed to create health event:', err)
      alert('创建失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/health-events')}>← 返回</button>
        <h1>➕ 记录宝宝健康事件</h1>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="form-label">宝宝 <span style={{ color: '#E17055' }}>*</span></label>
                <select
                  className="form-input"
                  value={formData.baby}
                  onChange={e => handleChange('baby', e.target.value)}
                  required
                >
                  <option value="">请选择宝宝</option>
                  {babies.map(baby => (
                    <option key={baby.id} value={baby.id}>{baby.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">关联预约（可选）</label>
                <select
                  className="form-input"
                  value={formData.appointment}
                  onChange={e => handleAppointmentChange(e.target.value)}
                >
                  <option value="">不关联预约</option>
                  {appointments.map(apt => (
                    <option key={apt.id} value={apt.id}>
                      {apt.baby_name} - {apt.appointment_date} -
                      {apt.appointment_type === 'vaccine'
                        ? ` 疫苗: ${apt.vaccine_name || '未指定'}`
                        : ` 体检: ${apt.checkup_type || '未指定'}`
                      }
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="form-label">事件类型 <span style={{ color: '#E17055' }}>*</span></label>
                <select
                  className="form-input"
                  value={formData.event_type}
                  onChange={e => handleChange('event_type', e.target.value)}
                  required
                >
                  {EVENT_TYPES.map(et => (
                    <option key={et.value} value={et.value}>{et.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">严重程度 <span style={{ color: '#E17055' }}>*</span></label>
                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  {SEVERITY_OPTIONS.map(opt => (
                    <label key={opt.value} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 16px',
                      borderRadius: 8,
                      border: formData.severity === opt.value ? `2px solid ${opt.color}` : '1px solid #DFE6E9',
                      background: formData.severity === opt.value ? `${opt.color}15` : 'transparent',
                      cursor: 'pointer',
                      fontWeight: formData.severity === opt.value ? 600 : 400,
                    }}>
                      <input
                        type="radio"
                        name="severity"
                        value={opt.value}
                        checked={formData.severity === opt.value}
                        onChange={e => handleChange('severity', e.target.value)}
                        style={{ accentColor: opt.color }}
                      />
                      <span style={{ color: opt.color }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="form-label">发生时间 <span style={{ color: '#E17055' }}>*</span></label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={formData.occurrence_time}
                  onChange={e => handleChange('occurrence_time', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="form-label">
                  体温 (℃)
                  {formData.event_type === 'fever' && <span style={{ color: '#E17055' }}> *</span>}
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="35"
                  max="42"
                  className="form-input"
                  placeholder="如 38.5"
                  value={formData.temperature}
                  onChange={e => handleChange('temperature', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="form-label">症状描述 <span style={{ color: '#E17055' }}>*</span></label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="请详细描述宝宝的症状表现，如持续时间、频率、诱因等"
                value={formData.symptoms}
                onChange={e => handleChange('symptoms', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="form-label">已采取的处理措施</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="如物理降温、服用药物、就医等"
                value={formData.treatment}
                onChange={e => handleChange('treatment', e.target.value)}
              />
            </div>

            <div>
              <label className="form-label">医生建议</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="如有就诊，请记录医生的诊断和建议"
                value={formData.doctor_advice}
                onChange={e => handleChange('doctor_advice', e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="form-label">建议复诊日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.next_visit_date}
                  onChange={e => handleChange('next_visit_date', e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">跟进负责人</label>
                <select
                  className="form-input"
                  value={formData.followed_by}
                  onChange={e => handleChange('followed_by', e.target.value)}
                >
                  <option value="">暂不指定</option>
                  <option value="1">admin</option>
                  <option value="2">dad (爸爸)</option>
                  <option value="3">grandma (奶奶/外婆)</option>
                  <option value="4">grandpa (爷爷/外公)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">备注</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="其他需要补充的信息"
                value={formData.remarks}
                onChange={e => handleChange('remarks', e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/health-events')}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? '提交中...' : '✓ 保存记录'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
