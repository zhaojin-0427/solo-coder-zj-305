import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createBaby, generateSchedule } from '../api'

export default function BabyForm() {
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    gender: 'male',
    birth_date: '',
    birth_weight: '',
    vaccination_history: '',
    hospital_preference: '',
    remarks: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = { ...form }
      if (payload.birth_weight) {
        payload.birth_weight = parseFloat(payload.birth_weight)
      } else {
        delete payload.birth_weight
      }
      if (payload.vaccination_history) {
        try {
          payload.vaccination_history = JSON.parse(payload.vaccination_history)
        } catch {
          payload.vaccination_history = {}
        }
      } else {
        payload.vaccination_history = {}
      }
      const babyData = await createBaby(payload)
      const babyId = babyData.id
      await generateSchedule(babyId)
      navigate(`/babies/${babyId}`)
    } catch (err) {
      console.error(err)
      alert('创建失败，请检查表单信息')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>添加宝宝</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit} className="form">
            <div className="form-group">
              <label className="form-label">姓名 *</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">性别 *</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="male">男</option>
                <option value="female">女</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">出生日期 *</label>
              <input
                type="date"
                name="birth_date"
                value={form.birth_date}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">出生体重 (kg)</label>
              <input
                type="number"
                name="birth_weight"
                value={form.birth_weight}
                onChange={handleChange}
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">接种历史 (JSON格式)</label>
              <textarea
                name="vaccination_history"
                value={form.vaccination_history}
                onChange={handleChange}
                className="form-input"
                rows="3"
                placeholder='{"bcg": "2024-01-01"}'
              />
            </div>
            <div className="form-group">
              <label className="form-label">偏好医院</label>
              <input
                type="text"
                name="hospital_preference"
                value={form.hospital_preference}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">备注</label>
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="form-input"
                rows="3"
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/babies')}>
                取消
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? '提交中...' : '创建并生成接种计划'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
