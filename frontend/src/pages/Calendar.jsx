import React, { useState, useEffect } from 'react'
import dayjs from 'dayjs'
import { fetchSchedules, fetchBabies, fetchAppointments } from '../api'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']
const TIME_SLOT_LABELS = {
  morning_1: '上午1',
  morning_2: '上午2',
  morning_3: '上午3',
  afternoon_1: '下午1',
  afternoon_2: '下午2',
  afternoon_3: '下午3',
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(dayjs().startOf('month'))
  const [schedules, setSchedules] = useState([])
  const [appointments, setAppointments] = useState([])
  const [babies, setBabies] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchBabies(),
      fetchSchedules({ page_size: 1000 }),
    ])
      .then(([babiesData, schedulesData]) => {
        setBabies(babiesData)
        setSchedules(schedulesData)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (babies.length === 0) return
    fetchAppointments({ page_size: 1000 })
      .then(data => setAppointments(data))
      .catch(() => setAppointments([]))
  }, [babies])

  const prevMonth = () => setCurrentMonth(prev => prev.subtract(1, 'month'))
  const nextMonth = () => setCurrentMonth(prev => prev.add(1, 'month'))
  const goToToday = () => setCurrentMonth(dayjs().startOf('month'))

  const startOfMonth = currentMonth.startOf('month')
  const startDayOfWeek = startOfMonth.day()
  const daysInMonth = currentMonth.daysInMonth()

  const calendarDays = []
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d)
  }

  const getSchedulesForDay = (day) => {
    if (!day) return []
    const dateStr = currentMonth.format('YYYY-MM') + '-' + String(day).padStart(2, '0')
    return schedules.filter(s => s.planned_date === dateStr)
  }

  const getAppointmentsForDay = (day) => {
    if (!day) return []
    const dateStr = currentMonth.format('YYYY-MM') + '-' + String(day).padStart(2, '0')
    return appointments.filter(a => a.appointment_date === dateStr)
  }

  const getBabyName = (babyId) => {
    const baby = babies.find(b => b.id === babyId)
    return baby ? baby.name : ''
  }

  const isToday = (day) => {
    const today = dayjs()
    return currentMonth.month() === today.month() &&
      currentMonth.year() === today.year() &&
      day === today.date()
  }

  const handleDayClick = (day) => {
    if (!day) return
    const dateStr = currentMonth.format('YYYY-MM') + '-' + String(day).padStart(2, '0')
    setSelectedDate(selectedDate === dateStr ? null : dateStr)
  }

  const selectedDaySchedules = selectedDate
    ? schedules.filter(s => s.planned_date === selectedDate)
    : []

  const selectedDayAppointments = selectedDate
    ? appointments.filter(a => a.appointment_date === selectedDate)
    : []

  if (loading) return <div className="loading">加载中...</div>

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>接种日历</h1>
      </div>

      <div className="calendar">
        <div className="calendar-nav">
          <button className="btn btn-secondary" onClick={prevMonth}>◀</button>
          <div className="calendar-title">
            <span className="calendar-month">{currentMonth.format('YYYY年MM月')}</span>
            <button className="btn btn-sm btn-secondary" onClick={goToToday}>今天</button>
          </div>
          <button className="btn btn-secondary" onClick={nextMonth}>▶</button>
        </div>

        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {WEEKDAYS.map(d => (
              <div key={d} className="calendar-weekday">{d}</div>
            ))}
          </div>
          <div className="calendar-days">
            {calendarDays.map((day, idx) => {
              const daySchedules = getSchedulesForDay(day)
              const dayAppointments = getAppointmentsForDay(day)
              const dateStr = day
                ? currentMonth.format('YYYY-MM') + '-' + String(day).padStart(2, '0')
                : ''
              const isSelected = selectedDate === dateStr
              return (
                <div
                  key={idx}
                  className={`calendar-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day && (
                    <>
                      <div className="day-number">{day}</div>
                      <div className="day-events">
                        {daySchedules.slice(0, 3).map(s => (
                          <div
                            key={s.id}
                            className={`day-chip chip-${s.vaccine_type || 'free'}`}
                            title={`${getBabyName(s.baby)} - ${s.vaccine_name || s.vaccine}`}
                          >
                            {s.vaccine_name || '疫苗'}
                          </div>
                        ))}
                        {dayAppointments.slice(0, 2).map(a => (
                          <div key={a.id} className="day-chip chip-appointment">
                            {a.appointment_type === 'vaccine' ? '💉' : '🏥'}
                          </div>
                        ))}
                        {(daySchedules.length + dayAppointments.length > 3) && (
                          <div className="day-chip chip-more">
                            +{daySchedules.length + dayAppointments.length - 3}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="calendar-legend">
          <span className="legend-item">
            <span className="legend-dot dot-free" /> 免费疫苗
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-paid" /> 自费疫苗
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-appointment" /> 预约
          </span>
        </div>
      </div>

      {selectedDate && (
        <div className="day-detail-panel">
          <h3>{selectedDate}</h3>
          {selectedDaySchedules.length === 0 && selectedDayAppointments.length === 0 ? (
            <p className="text-muted">当日无安排</p>
          ) : (
            <>
              {selectedDaySchedules.map(s => (
                <div key={s.id} className="day-detail-item">
                  <span className={`detail-type type-${s.vaccine_type || 'free'}`}>
                    {s.vaccine_type === 'paid' ? '自费' : '免费'}
                  </span>
                  <span className="detail-baby">{getBabyName(s.baby)}</span>
                  <span className="detail-name">{s.vaccine_name || s.vaccine}</span>
                  <span className={`badge badge-${s.status === 'completed' ? 'success' : s.status === 'delayed' ? 'danger' : 'warning'}`}>
                    {s.status === 'completed' ? '已接种' : s.status === 'delayed' ? '已推迟' : '待接种'}
                  </span>
                </div>
              ))}
              {selectedDayAppointments.map(a => (
                <div key={a.id} className="day-detail-item">
                  <span className="detail-type type-appointment">
                    {a.appointment_type === 'vaccine' ? '疫苗' : '体检'}
                  </span>
                  <span className="detail-baby">{getBabyName(a.baby)}</span>
                  <span className="detail-name">
                    {a.vaccine_name || a.checkup_type || '预约'}
                  </span>
                  <span className="detail-slot">
                    {TIME_SLOT_LABELS[a.time_slot] || a.time_slot}
                  </span>
                  <span className="detail-hospital">{a.hospital}</span>
                  <span className={`badge badge-${a.status === 'confirmed' ? 'success' : a.status === 'cancelled' ? 'danger' : 'warning'}`}>
                    {a.status === 'confirmed' ? '已确认' : a.status === 'cancelled' ? '已取消' : a.status === 'completed' ? '已完成' : '待确认'}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
