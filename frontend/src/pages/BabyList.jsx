import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchBabies } from '../api'

export default function BabyList() {
  const [babies, setBabies] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchBabies()
      .then(data => setBabies(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading">加载中...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>我的宝宝</h1>
        <button className="btn btn-primary" onClick={() => navigate('/babies/new')}>
          + 添加宝宝
        </button>
      </div>

      {babies.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👶</div>
          <p>还没有添加宝宝信息</p>
          <button className="btn btn-primary" onClick={() => navigate('/babies/new')}>
            添加第一个宝宝
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {babies.map(baby => (
            <Link to={`/babies/${baby.id}`} key={baby.id} className="card baby-card">
              <div className="card-body">
                <div className="baby-card-header">
                  <span className="baby-name">{baby.name}</span>
                  <span className="gender-icon">{baby.gender === 'male' ? '♂' : '♀'}</span>
                </div>
                <div className="baby-info">
                  <div className="info-row">
                    <span className="info-label">出生日期</span>
                    <span className="info-value">{baby.birth_date}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">月龄</span>
                    <span className="info-value">{baby.age_months}个月</span>
                  </div>
                  {baby.hospital_preference && (
                    <div className="info-row">
                      <span className="info-label">偏好医院</span>
                      <span className="info-value">{baby.hospital_preference}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
