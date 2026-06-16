import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchBaby, fetchSchedules, markScheduleCompleted, fetchCheckupRecords, generateSchedule } from '../api'

const STATUS_CONFIG = {
  pending: { label: '待接种', className: 'badge badge-warning' },
  completed: { label: '已接种', className: 'badge badge-success' },
  delayed: { label: '已推迟', className: 'badge badge-danger' },
}

export default function BabyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [baby, setBaby] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [checkupRecords, setCheckupRecords] = useState([])
  const [activeTab, setActiveTab] = useState('schedules')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetchBaby(id),
      fetchSchedules({ baby: id }),
      fetchCheckupRecords({ baby: id }),
    ])
      .then(([babyData, schedulesData, checkupsData]) => {
        setBaby(babyData)
        setSchedules(schedulesData)
        setCheckupRecords(checkupsData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handleMarkCompleted = async (scheduleId) => {
    try {
      const res = await markScheduleCompleted(scheduleId)
      setSchedules(prev => prev.map(s => s.id === scheduleId ? res.data : s))
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerateSchedule = async () => {
    setGenerating(true)
    try {
      await generateSchedule(id)
      const res = await fetchSchedules({ baby: id })
      setSchedules(res.data.results || res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="loading">加载中...</div>
  if (!baby) return <div className="loading">未找到宝宝信息</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate('/babies')}>← 返回</button>
        <h1>{baby.name}</h1>
      </div>

      <div className="card baby-info-card">
        <div className="card-body">
          <div className="baby-info-grid">
            <div className="info-item">
              <span className="info-label">性别</span>
              <span className="info-value">{baby.gender === 'male' ? '♂ 男' : '♀ 女'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">出生日期</span>
              <span className="info-value">{baby.birth_date}</span>
            </div>
            <div className="info-item">
              <span className="info-label">月龄</span>
              <span className="info-value highlight">{baby.age_months}个月</span>
            </div>
            {baby.birth_weight && (
              <div className="info-item">
                <span className="info-label">出生体重</span>
                <span className="info-value">{baby.birth_weight} kg</span>
              </div>
            )}
            {baby.hospital_preference && (
              <div className="info-item">
                <span className="info-label">偏好医院</span>
                <span className="info-value">{baby.hospital_preference}</span>
              </div>
            )}
            {baby.remarks && (
              <div className="info-item">
                <span className="info-label">备注</span>
                <span className="info-value">{baby.remarks}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'schedules' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedules')}
        >
          接种计划
        </button>
        <button
          className={`tab ${activeTab === 'checkups' ? 'active' : ''}`}
          onClick={() => setActiveTab('checkups')}
        >
          体检记录
        </button>
      </div>

      {activeTab === 'schedules' && (
        <div className="tab-content">
          {schedules.length === 0 ? (
            <div className="empty-state">
              <p>暂无接种计划</p>
              <button
                className="btn btn-primary"
                onClick={handleGenerateSchedule}
                disabled={generating}
              >
                {generating ? '生成中...' : '生成接种计划'}
              </button>
            </div>
          ) : (
            <div className="timeline">
              {schedules.map(schedule => {
                const statusCfg = STATUS_CONFIG[schedule.status] || STATUS_CONFIG.pending
                return (
                  <div key={schedule.id} className="timeline-item">
                    <div className={`timeline-dot dot-${schedule.status}`} />
                    <div className="timeline-content">
                      <div className="timeline-header">
                        <span className="timeline-title">
                          {schedule.vaccine_name || schedule.vaccine}
                        </span>
                        <span className={statusCfg.className}>{statusCfg.label}</span>
                      </div>
                      <div className="timeline-date">计划日期: {schedule.planned_date}</div>
                      {schedule.status === 'completed' && schedule.actual_date && (
                        <div className="timeline-date">实际接种: {schedule.actual_date}</div>
                      )}
                      {schedule.status === 'pending' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => handleMarkCompleted(schedule.id)}
                        >
                          标记已接种
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'checkups' && (
        <div className="tab-content">
          {checkupRecords.length === 0 ? (
            <div className="empty-state">
              <p>暂无体检记录</p>
            </div>
          ) : (
            <div className="checkup-list">
              {checkupRecords.map(record => (
                <div key={record.id} className="card">
                  <div className="card-body">
                    <div className="checkup-header">
                      <span className="checkup-date">{record.checkup_date}</span>
                      {record.checkup_name && (
                        <span className="checkup-name">{record.checkup_name}</span>
                      )}
                    </div>
                    <div className="checkup-stats">
                      {record.height && (
                        <div className="stat-item">
                          <span className="stat-label">身高</span>
                          <span className="stat-value">{record.height} cm</span>
                        </div>
                      )}
                      {record.weight && (
                        <div className="stat-item">
                          <span className="stat-label">体重</span>
                          <span className="stat-value">{record.weight} kg</span>
                        </div>
                      )}
                      {record.head_circumference && (
                        <div className="stat-item">
                          <span className="stat-label">头围</span>
                          <span className="stat-value">{record.head_circumference} cm</span>
                        </div>
                      )}
                    </div>
                    {record.doctor_advice && (
                      <div className="checkup-advice">
                        <span className="advice-label">医生建议:</span>
                        <span>{record.doctor_advice}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
