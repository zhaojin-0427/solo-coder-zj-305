import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchAppointments, fetchBabies,
  generatePreparationChecklist, fetchChecklistByAppointment,
  confirmChecklistItem, batchConfirmItems,
  generateChecklistReport, fetchChecklistReport,
  createArrivalVerification, addVerificationSupplement, addVerificationMissing,
  updateArrivalVerification,
} from '../api'

const STATUS_CONFIG = {
  not_started: { label: '未开始', color: '#B2BEC3', bg: '#DFE6E9' },
  in_progress: { label: '准备中', color: '#FDCB6E', bg: '#FEF3C7' },
  completed: { label: '已完成', color: '#00B894', bg: '#D1FAE5' },
  verified: { label: '已核验', color: '#6C5CE7', bg: '#EDEFFC' },
}

const CATEGORY_CONFIG = {
  document: { label: '证件材料', icon: '📄', color: '#6C5CE7' },
  vaccine_book: { label: '疫苗本', icon: '💉', color: '#00B894' },
  medical_history: { label: '既往病史', icon: '🏥', color: '#E17055' },
  fasting: { label: '空腹要求', icon: '🍽️', color: '#FDCB6E' },
  companion: { label: '陪同人信息', icon: '👤', color: '#74B9FF' },
  transport: { label: '交通出发时间', icon: '🚗', color: '#A29BFE' },
  other: { label: '其他', icon: '📦', color: '#B2BEC3' },
}

const TYPE_MAP = { vaccine: '疫苗接种', checkup: '体检' }
const TIME_SLOT_MAP = {
  morning_1: '上午 08:00-09:00', morning_2: '上午 09:00-10:00', morning_3: '上午 10:00-11:00',
  afternoon_1: '下午 13:00-14:00', afternoon_2: '下午 14:00-15:00', afternoon_3: '下午 15:00-16:00',
}

export default function PreparationCenter() {
  const navigate = useNavigate()
  const [appointments, setAppointments] = useState([])
  const [babies, setBabies] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [verification, setVerification] = useState(null)
  const [activeTab, setActiveTab] = useState('checklist')
  const [currentUser, setCurrentUser] = useState('1')
  const [supplementInput, setSupplementInput] = useState('')
  const [missingInput, setMissingInput] = useState('')
  const [onSiteNotes, setOnSiteNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [confirming, setConfirming] = useState(null)

  useEffect(() => {
    Promise.all([
      fetchAppointments({ page_size: 1000 }),
      fetchBabies(),
    ])
      .then(([aptData, babyData]) => {
        const apts = Array.isArray(aptData) ? aptData : []
        setAppointments(apts.filter(a => a.status !== 'cancelled'))
        setBabies(Array.isArray(babyData) ? babyData : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleSelectAppointment = async (apt) => {
    setSelectedAppointment(apt)
    setChecklist(null)
    setReport(null)
    setVerification(null)
    setActiveTab('checklist')
    setChecklistLoading(true)
    try {
      const res = await fetchChecklistByAppointment(apt.id)
      if (res.exists) {
        setChecklist(res.checklist)
      }
    } catch (err) {
      console.error('Failed to fetch checklist:', err)
    } finally {
      setChecklistLoading(false)
    }
  }

  const handleGenerateChecklist = async () => {
    if (!selectedAppointment) return
    setGenerating(true)
    try {
      const res = await generatePreparationChecklist(selectedAppointment.id, currentUser)
      if (res.checklist) {
        setChecklist(res.checklist)
      } else {
        setChecklist(res)
      }
    } catch (err) {
      console.error('Failed to generate checklist:', err)
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmItem = async (itemId, confirmed) => {
    if (!checklist) return
    setConfirming(itemId)
    try {
      const res = await confirmChecklistItem(checklist.id, itemId, confirmed, currentUser)
      setChecklist(prev => ({
        ...prev,
        items: prev.items.map(i => i.id === itemId ? res.item : i),
        completion_rate: res.completion_rate,
        status: res.status,
      }))
    } catch (err) {
      console.error('Failed to confirm item:', err)
    } finally {
      setConfirming(null)
    }
  }

  const handleBatchConfirm = async (category) => {
    if (!checklist) return
    const categoryItems = checklist.items.filter(i => i.category === category && !i.confirmed)
    if (categoryItems.length === 0) return
    const itemIds = categoryItems.map(i => i.id)
    try {
      const res = await batchConfirmItems(checklist.id, itemIds, true, currentUser)
      setChecklist(prev => ({
        ...prev,
        items: prev.items.map(i => res.updated_items.find(u => u.id === i.id) || i),
        completion_rate: res.completion_rate,
        status: res.status,
      }))
    } catch (err) {
      console.error('Failed to batch confirm:', err)
    }
  }

  const handleGenerateReport = async () => {
    if (!checklist) return
    try {
      const res = await generateChecklistReport(checklist.id)
      setReport(res)
      setChecklist(prev => ({ ...prev, report_generated: true }))
    } catch (err) {
      console.error('Failed to generate report:', err)
    }
  }

  const handleCreateVerification = async () => {
    if (!checklist) return
    try {
      const carriedItems = checklist.items.filter(i => i.confirmed).map(i => i.item_name)
      const missingItems = checklist.items.filter(i => !i.confirmed && i.is_required).map(i => ({
        item_name: i.item_name,
        description: i.item_description,
        is_resolved: false,
      }))
      const res = await createArrivalVerification(checklist.id, {
        user_id: currentUser,
        carried_items: carriedItems,
        missing_items: missingItems,
        on_site_notes: onSiteNotes,
      })
      setVerification(res)
      setChecklist(prev => ({ ...prev, status: 'verified' }))
      setActiveTab('verification')
    } catch (err) {
      console.error('Failed to create verification:', err)
    }
  }

  const handleAddSupplement = async () => {
    if (!verification || !supplementInput.trim()) return
    try {
      const res = await addVerificationSupplement(verification.id, supplementInput.trim())
      setVerification(res)
      setSupplementInput('')
    } catch (err) {
      console.error('Failed to add supplement:', err)
    }
  }

  const handleAddMissing = async () => {
    if (!verification || !missingInput.trim()) return
    try {
      const res = await addVerificationMissing(verification.id, missingInput.trim())
      setVerification(res)
      setMissingInput('')
    } catch (err) {
      console.error('Failed to add missing:', err)
    }
  }

  const handleUpdateOnSiteNotes = async () => {
    if (!verification) return
    try {
      const res = await updateArrivalVerification(verification.id, { on_site_notes: onSiteNotes })
      setVerification(res)
    } catch (err) {
      console.error('Failed to update notes:', err)
    }
  }

  const getProgressColor = (rate) => {
    if (rate >= 0.8) return '#00B894'
    if (rate >= 0.5) return '#FDCB6E'
    return '#E17055'
  }

  if (loading) return <div className="page-loading">加载中...</div>

  const pendingAppointments = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed')

  const groupedItems = {}
  if (checklist?.items) {
    for (const item of checklist.items) {
      if (!groupedItems[item.category]) groupedItems[item.category] = []
      groupedItems[item.category].push(item)
    }
  }

  const renderAppointmentSelector = () => (
    <div style={{ marginBottom: 24 }}>
      <div className="filter-bar" style={{ marginBottom: 16 }}>
        <div className="filter-group">
          <label>选择预约:</label>
          <select
            value={selectedAppointment?.id || ''}
            onChange={e => {
              const apt = appointments.find(a => a.id === Number(e.target.value))
              if (apt) handleSelectAppointment(apt)
            }}
            style={{ maxWidth: 400 }}
          >
            <option value="">请选择预约</option>
            {pendingAppointments.map(apt => (
              <option key={apt.id} value={apt.id}>
                {apt.baby_name} - {TYPE_MAP[apt.appointment_type]} - {apt.appointment_date} - {apt.hospital}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>操作用户:</label>
          <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
            <option value="1">admin</option>
            <option value="2">dad</option>
            <option value="3">grandma</option>
            <option value="4">grandpa</option>
          </select>
        </div>
      </div>

      {pendingAppointments.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p>暂无可准备的预约，请先创建预约</p>
        </div>
      )}

      {pendingAppointments.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {pendingAppointments.slice(0, 10).map(apt => (
            <div
              key={apt.id}
              onClick={() => handleSelectAppointment(apt)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: selectedAppointment?.id === apt.id ? '2px solid #6C5CE7' : '1.5px solid #DFE6E9',
                background: selectedAppointment?.id === apt.id ? '#EDEFFC' : '#fff',
                cursor: 'pointer',
                minWidth: 200,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                {apt.baby_name}
                <span style={{
                  marginLeft: 8, fontSize: 12,
                  padding: '2px 8px', borderRadius: 10,
                  background: apt.appointment_type === 'vaccine' ? '#D1FAE5' : '#EDEFFC',
                  color: apt.appointment_type === 'vaccine' ? '#00B894' : '#6C5CE7',
                }}>
                  {TYPE_MAP[apt.appointment_type]}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#636E72' }}>
                📅 {apt.appointment_date} | 🏥 {apt.hospital}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const renderChecklistContent = () => {
    if (!selectedAppointment) {
      return <div className="empty-state"><div className="empty-icon">☝️</div><p>请先选择一个预约</p></div>
    }

    if (checklistLoading) return <div className="loading">加载准备清单...</div>

    if (!checklist) {
      return (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
          <h3 style={{ marginBottom: 12 }}>该预约暂无准备清单</h3>
          <p style={{ color: '#636E72', marginBottom: 24 }}>
            系统将根据宝宝月龄、预约类型、医院偏好和历史记录自动生成准备清单
          </p>
          <button className="btn btn-primary" onClick={handleGenerateChecklist} disabled={generating}>
            {generating ? '生成中...' : '✨ 自动生成准备清单'}
          </button>
        </div>
      )
    }

    const statusCfg = STATUS_CONFIG[checklist.status] || STATUS_CONFIG.not_started

    return (
      <div>
        <div className="card" style={{ marginBottom: 20, borderLeft: `4px solid ${statusCfg.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 12, fontSize: 13, fontWeight: 600,
                  background: statusCfg.bg, color: statusCfg.color,
                }}>
                  {statusCfg.label}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: getProgressColor(checklist.completion_rate) }}>
                  {(checklist.completion_rate * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#636E72' }}>
                {checklist.items?.filter(i => i.confirmed).length || 0} / {checklist.items?.length || 0} 项已确认
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {checklist.completion_rate === 1 && !checklist.report_generated && (
                <button className="btn btn-primary" onClick={handleGenerateReport}>
                  📝 一键生成完成报告
                </button>
              )}
              {checklist.report_generated && (
                <button className="btn btn-sm btn-green" onClick={() => setActiveTab('report')}>
                  📄 查看报告
                </button>
              )}
              {checklist.completion_rate > 0 && (
                <button className="btn btn-sm btn-blue" onClick={handleCreateVerification}>
                  ✅ 到院核验
                </button>
              )}
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${checklist.completion_rate * 100}%`,
                  background: getProgressColor(checklist.completion_rate),
                }}
              />
            </div>
          </div>
        </div>

        {checklist.risk_notes?.length > 0 && (
          <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {checklist.risk_notes.map((risk, idx) => (
              <div key={idx} style={{
                padding: '10px 16px',
                borderRadius: 8,
                background: risk.level === 'danger' ? '#FEE2E2' : risk.level === 'warning' ? '#FEF3C7' : '#E0F2FE',
                border: `1px solid ${risk.level === 'danger' ? '#F87171' : risk.level === 'warning' ? '#FCD34D' : '#93C5FD'}`,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span>{risk.level === 'danger' ? '🔴' : risk.level === 'warning' ? '🟡' : '🔵'}</span>
                <span>{risk.message}</span>
              </div>
            ))}
          </div>
        )}

        {Object.entries(groupedItems).map(([category, items]) => {
          const catCfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
          const confirmedCount = items.filter(i => i.confirmed).length
          return (
            <div key={category} className="card" style={{ marginBottom: 16 }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #DFE6E9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{catCfg.icon}</span>
                  <span style={{ fontWeight: 600, color: catCfg.color }}>{catCfg.label}</span>
                  <span style={{ fontSize: 12, color: '#636E72' }}>
                    {confirmedCount}/{items.length} 已确认
                  </span>
                </div>
                {confirmedCount < items.length && (
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleBatchConfirm(category)}
                  >
                    全部确认
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: 6,
                    background: item.confirmed ? '#F0FDF4' : '#FAFAFA',
                    border: item.is_required && !item.confirmed ? '1px solid #FCA5A5' : '1px solid transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={item.confirmed}
                        onChange={() => handleConfirmItem(item.id, !item.confirmed)}
                        disabled={confirming === item.id}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <div>
                        <div style={{
                          fontWeight: item.confirmed ? 400 : 500,
                          textDecoration: item.confirmed ? 'line-through' : 'none',
                          color: item.confirmed ? '#636E72' : '#2D3436',
                        }}>
                          {item.item_name}
                          {item.is_required && !item.confirmed && (
                            <span style={{ color: '#E17055', marginLeft: 4, fontSize: 11 }}>*</span>
                          )}
                        </div>
                        {item.item_description && (
                          <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{item.item_description}</div>
                        )}
                        {item.confirmed_by_name && (
                          <div style={{ fontSize: 11, color: '#00B894', marginTop: 2 }}>
                            ✓ 由 {item.confirmed_by_name} 确认
                          </div>
                        )}
                      </div>
                    </div>
                    {item.is_required && !item.confirmed && (
                      <span style={{ fontSize: 11, color: '#E17055', padding: '2px 8px', background: '#FEE2E2', borderRadius: 8 }}>
                        必选
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderReportContent = () => {
    if (!report && !checklist?.report_generated) {
      return <div className="empty-state"><p>请先完成清单确认后生成报告</p></div>
    }

    const displayReport = report
    if (!displayReport) {
      return <div className="loading">加载报告中...</div>
    }

    return (
      <div className="card" style={{ padding: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #DFE6E9' }}>
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>📋 到院准备完成报告</h2>
          <div style={{ fontSize: 13, color: '#636E72' }}>
            生成时间: {displayReport.report_generated_at ? new Date(displayReport.report_generated_at).toLocaleString('zh-CN') : '-'}
          </div>
        </div>

        <div style={{ marginBottom: 20, padding: 16, background: '#F8F9FD', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>预约信息</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 14 }}>
            <div>类型: {displayReport.appointment_info?.type}</div>
            <div>日期: {displayReport.appointment_info?.date}</div>
            <div>时段: {displayReport.appointment_info?.time_slot}</div>
            <div>医院: {displayReport.appointment_info?.hospital}</div>
            {displayReport.appointment_info?.vaccine_name && (
              <div>疫苗: {displayReport.appointment_info.vaccine_name}</div>
            )}
            {displayReport.appointment_info?.checkup_type && (
              <div>体检: {displayReport.appointment_info.checkup_type}</div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ textAlign: 'center', padding: 16, background: '#D1FAE5', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#00B894' }}>
              {displayReport.confirmed_items?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: '#636E72' }}>已确认项</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: '#FEF3C7', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#FDCB6E' }}>
              {displayReport.unconfirmed_items?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: '#636E72' }}>未确认项</div>
          </div>
          <div style={{ textAlign: 'center', padding: 16, background: '#FEE2E2', borderRadius: 8 }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#E17055' }}>
              {displayReport.required_unconfirmed?.length || 0}
            </div>
            <div style={{ fontSize: 13, color: '#636E72' }}>必选未确认</div>
          </div>
        </div>

        {displayReport.required_unconfirmed?.length > 0 && (
          <div style={{ marginBottom: 20, padding: 16, background: '#FEE2E2', borderRadius: 8, border: '1px solid #FCA5A5' }}>
            <div style={{ fontWeight: 600, color: '#E17055', marginBottom: 8 }}>⚠️ 必选未确认项</div>
            {displayReport.required_unconfirmed.map((item, idx) => (
              <div key={idx} style={{ fontSize: 13, marginBottom: 4 }}>
                • {item.item_name} - {item.item_description}
              </div>
            ))}
          </div>
        )}

        {displayReport.risk_notes?.length > 0 && (
          <div style={{ marginBottom: 20, padding: 16, background: '#FEF3C7', borderRadius: 8, border: '1px solid #FCD34D' }}>
            <div style={{ fontWeight: 600, color: '#92400E', marginBottom: 8 }}>⚠️ 风险提示</div>
            {displayReport.risk_notes.map((risk, idx) => (
              <div key={idx} style={{ fontSize: 13, marginBottom: 4 }}>
                {risk.level === 'danger' ? '🔴' : risk.level === 'warning' ? '🟡' : '🔵'} {risk.message}
              </div>
            ))}
          </div>
        )}

        {displayReport.verification && (
          <div style={{ padding: 16, background: '#EDEFFC', borderRadius: 8, border: '1px solid #C4B5FD' }}>
            <div style={{ fontWeight: 600, color: '#6C5CE7', marginBottom: 8 }}>✅ 到院核验记录</div>
            <div style={{ fontSize: 13 }}>
              <div>核验人: {displayReport.verification.verified_by_name || '未指定'}</div>
              <div>核验时间: {displayReport.verification.verified_at ? new Date(displayReport.verification.verified_at).toLocaleString('zh-CN') : '-'}</div>
              <div>已携带材料: {displayReport.verification.carried_items?.length || 0} 项</div>
              <div>临时缺失项: {displayReport.verification.missing_items?.length || 0} 项</div>
              <div>现场补录项: {displayReport.verification.supplemented_items?.length || 0} 项</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderVerificationContent = () => {
    if (!verification && !checklist) {
      return <div className="empty-state"><p>请先选择预约并生成清单</p></div>
    }

    return (
      <div>
        {!verification ? (
          <div className="card" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
            <h3 style={{ marginBottom: 12 }}>到院核验</h3>
            <p style={{ color: '#636E72', marginBottom: 20 }}>
              确认已携带材料，记录临时缺失项和现场补录情况
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, marginBottom: 6, textAlign: 'left' }}>现场备注:</label>
              <textarea
                value={onSiteNotes}
                onChange={e => setOnSiteNotes(e.target.value)}
                placeholder="记录到院当天需要备注的信息..."
                style={{
                  width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
                  border: '1.5px solid #DFE6E9', fontSize: 14, resize: 'vertical',
                }}
              />
            </div>
            <button className="btn btn-primary" onClick={handleCreateVerification}>
              ✅ 确认到院核验
            </button>
          </div>
        ) : (
          <div>
            <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #6C5CE7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 18, fontWeight: 600 }}>✅ 到院核验已完成</span>
                  <div style={{ fontSize: 12, color: '#636E72', marginTop: 4 }}>
                    核验人: {verification.verified_by_name || '未指定'} |
                    时间: {verification.verified_at ? new Date(verification.verified_at).toLocaleString('zh-CN') : '-'}
                  </div>
                </div>
                <span style={{ padding: '4px 12px', borderRadius: 12, background: '#EDEFFC', color: '#6C5CE7', fontWeight: 600, fontSize: 13 }}>
                  已核验
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, background: '#D1FAE5', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#00B894' }}>
                    {verification.carried_items?.length || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#636E72' }}>已携带材料</div>
                </div>
                <div style={{ padding: 12, background: '#FEE2E2', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#E17055' }}>
                    {verification.missing_items?.length || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#636E72' }}>临时缺失项</div>
                </div>
                <div style={{ padding: 12, background: '#EDEFFC', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#6C5CE7' }}>
                    {verification.supplemented_items?.length || 0}
                  </div>
                  <div style={{ fontSize: 12, color: '#636E72' }}>现场补录项</div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#00B894' }}>📦 已携带材料</div>
              {(verification.carried_items || []).length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无记录</div>
              ) : (
                verification.carried_items.map((item, idx) => (
                  <div key={idx} style={{ padding: '6px 12px', background: '#F0FDF4', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                    ✅ {typeof item === 'string' ? item : item.item_name}
                  </div>
                ))
              )}
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#E17055' }}>⚠️ 临时缺失项</div>
              {(verification.missing_items || []).length === 0 ? (
                <div style={{ fontSize: 13, color: '#00B894' }}>无缺失项 ✓</div>
              ) : (
                verification.missing_items.map((item, idx) => (
                  <div key={idx} style={{ padding: '6px 12px', background: '#FEE2E2', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                    ❌ {typeof item === 'string' ? item : item.item_name}
                    {typeof item === 'object' && item.description && ` - ${item.description}`}
                  </div>
                ))
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <input
                  value={missingInput}
                  onChange={e => setMissingInput(e.target.value)}
                  placeholder="添加缺失项..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #DFE6E9', fontSize: 13 }}
                />
                <button className="btn btn-sm btn-red" onClick={handleAddMissing}>添加</button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12, color: '#6C5CE7' }}>📝 现场补录</div>
              {(verification.supplemented_items || []).length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无补录</div>
              ) : (
                verification.supplemented_items.map((item, idx) => (
                  <div key={idx} style={{ padding: '6px 12px', background: '#EDEFFC', borderRadius: 6, marginBottom: 4, fontSize: 13 }}>
                    📝 {typeof item === 'string' ? item : item.item_name}
                    {typeof item === 'object' && item.description && ` - ${item.description}`}
                  </div>
                ))
              )}
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <input
                  value={supplementInput}
                  onChange={e => setSupplementInput(e.target.value)}
                  placeholder="添加补录项..."
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1.5px solid #DFE6E9', fontSize: 13 }}
                />
                <button className="btn btn-sm btn-blue" onClick={handleAddSupplement}>添加</button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, marginBottom: 12 }}>📋 现场备注</div>
              <textarea
                value={onSiteNotes || verification.on_site_notes || ''}
                onChange={e => setOnSiteNotes(e.target.value)}
                placeholder="记录现场情况..."
                style={{
                  width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
                  border: '1.5px solid #DFE6E9', fontSize: 14, resize: 'vertical',
                }}
              />
              <button className="btn btn-sm btn-secondary" style={{ marginTop: 8 }} onClick={handleUpdateOnSiteNotes}>
                保存备注
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>到院准备核验中心</h1>
        <p>预约前准备 → 到院核验 → 补录闭环</p>
      </div>

      {renderAppointmentSelector()}

      {selectedAppointment && (
        <div className="card" style={{ marginBottom: 20, padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: 16 }}>{selectedAppointment.baby_name}</span>
              <span style={{
                marginLeft: 10, padding: '2px 10px', borderRadius: 10, fontSize: 12,
                background: selectedAppointment.appointment_type === 'vaccine' ? '#D1FAE5' : '#EDEFFC',
                color: selectedAppointment.appointment_type === 'vaccine' ? '#00B894' : '#6C5CE7',
              }}>
                {TYPE_MAP[selectedAppointment.appointment_type]}
              </span>
              {selectedAppointment.vaccine_name && (
                <span style={{ marginLeft: 8, fontSize: 13, color: '#636E72' }}>
                  - {selectedAppointment.vaccine_name}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: '#636E72' }}>
              📅 {selectedAppointment.appointment_date} | 🕐 {TIME_SLOT_MAP[selectedAppointment.time_slot] || selectedAppointment.time_slot} | 🏥 {selectedAppointment.hospital}
            </div>
          </div>
        </div>
      )}

      {selectedAppointment && checklist && (
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${activeTab === 'checklist' ? 'active' : ''}`} onClick={() => setActiveTab('checklist')}>
            📋 准备清单
          </button>
          <button className={`tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>
            📄 完成报告 {checklist.report_generated ? '✓' : ''}
          </button>
          <button className={`tab ${activeTab === 'verification' ? 'active' : ''}`} onClick={() => setActiveTab('verification')}>
            🏥 到院核验 {verification ? '✓' : ''}
          </button>
        </div>
      )}

      {activeTab === 'checklist' && renderChecklistContent()}
      {activeTab === 'report' && renderReportContent()}
      {activeTab === 'verification' && renderVerificationContent()}
    </div>
  )
}
