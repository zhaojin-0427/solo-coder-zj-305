import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchBabies, fetchVaccines, createAppointment, createAppointmentWithForce, fetchSmartRecommend } from '../api';

const TIME_SLOT_OPTIONS = [
  { value: 'morning_1', label: '上午 08:00-09:00' },
  { value: 'morning_2', label: '上午 09:00-10:00' },
  { value: 'morning_3', label: '上午 10:00-11:00' },
  { value: 'afternoon_1', label: '下午 13:00-14:00' },
  { value: 'afternoon_2', label: '下午 14:00-15:00' },
  { value: 'afternoon_3', label: '下午 15:00-16:00' },
];

const WEEKDAY_LABELS = {
  Monday: '周一',
  Tuesday: '周二',
  Wednesday: '周三',
  Thursday: '周四',
  Friday: '周五',
  Saturday: '周六',
  Sunday: '周日',
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function AppointmentForm() {
  const navigate = useNavigate();
  const query = useQuery();
  const [babies, setBabies] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [smartRecommend, setSmartRecommend] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const [form, setForm] = useState({
    baby: query.get('baby_id') || '',
    appointment_type: query.get('type') || 'vaccine',
    vaccine: query.get('vaccine_id') || '',
    checkup_type: query.get('checkup_name') || '',
    appointment_date: '',
    time_slot: '',
    hospital: '',
    remarks: '',
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [babiesData, vaccinesData] = await Promise.all([
          fetchBabies(),
          fetchVaccines({ page_size: 1000 }),
        ]);
        setBabies(babiesData);
        setVaccines(vaccinesData);
        
        const urlBabyId = query.get('baby_id');
        const urlVaccineId = query.get('vaccine_id');
        const urlType = query.get('type') || 'vaccine';
        const urlCheckupName = query.get('checkup_name');
        
        const preselectedBaby = babiesData.find(b => b.id === Number(urlBabyId));
        const preselectedVaccine = urlVaccineId ? vaccinesData.find(v => v.id === Number(urlVaccineId)) : null;
        
        const updatedForm = {
          baby: urlBabyId || '',
          appointment_type: urlType,
          vaccine: preselectedVaccine ? String(preselectedVaccine.id) : '',
          checkup_type: urlCheckupName || '',
          appointment_date: form.appointment_date,
          time_slot: form.time_slot,
          hospital: preselectedBaby?.hospital_preference || form.hospital,
          remarks: form.remarks,
        };
        
        setForm(updatedForm);
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (form.baby) {
      loadSmartRecommend();
    } else {
      setSmartRecommend(null);
    }
  }, [form.baby, form.appointment_type]);

  const loadSmartRecommend = async () => {
    if (!form.baby) return;
    setRecommendLoading(true);
    try {
      const data = await fetchSmartRecommend(form.baby, form.appointment_type);
      setSmartRecommend(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setRecommendLoading(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setConflicts([]);
    setWarnings([]);
  };

  const handleBabyChange = e => {
    const babyId = e.target.value;
    const selectedBaby = babies.find(b => b.id === Number(babyId));
    setForm(prev => ({
      ...prev,
      baby: babyId,
      hospital: selectedBaby?.hospital_preference || prev.hospital,
    }));
    setConflicts([]);
    setWarnings([]);
  };

  const handleTypeChange = e => {
    const appointmentType = e.target.value;
    setForm(prev => ({
      ...prev,
      appointment_type: appointmentType,
      vaccine: appointmentType === 'checkup' ? '' : prev.vaccine,
      checkup_type: appointmentType === 'vaccine' ? '' : prev.checkup_type,
    }));
    setConflicts([]);
    setWarnings([]);
  };

  const handleSelectTask = (task) => {
    const updates = {};
    if (task.task_type === 'vaccine') {
      updates.appointment_type = 'vaccine';
      updates.vaccine = task.vaccine_id;
      updates.checkup_type = '';
    } else {
      updates.appointment_type = 'checkup';
      updates.checkup_type = task.checkup_name;
      updates.vaccine = '';
    }
    if (task.recommend_hospital) {
      updates.hospital = task.recommend_hospital;
    }
    setForm(prev => ({ ...prev, ...updates }));
    setConflicts([]);
    setWarnings([]);
  };

  const handleSelectDate = (date, slot) => {
    setForm(prev => ({
      ...prev,
      appointment_date: date,
      time_slot: slot,
    }));
    setConflicts([]);
    setWarnings([]);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setConflicts([]);
    setWarnings([]);
    try {
      const payload = {
        baby: Number(form.baby),
        appointment_type: form.appointment_type,
        appointment_date: form.appointment_date,
        time_slot: form.time_slot,
        hospital: form.hospital,
        status: 'pending',
        remarks: form.remarks,
      };
      if (form.appointment_type === 'vaccine') {
        payload.vaccine = form.vaccine ? Number(form.vaccine) : null;
      } else {
        payload.checkup_type = form.checkup_type;
        payload.vaccine = null;
      }
      try {
        await createAppointment(payload);
        navigate('/appointments');
      } catch (err) {
        if (err?.response?.status === 409 && err?.response?.data?.conflicts) {
          const hardConflicts = err.response.data.conflicts.filter(c => c.severity === 'error');
          if (hardConflicts.length > 0) {
            setConflicts(err.response.data.conflicts);
            setPendingPayload(payload);
            setShowForceConfirm(true);
            return;
          }
        }
        throw err;
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || '创建预约失败，请重试';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleForceSubmit = async () => {
    if (!pendingPayload) return;
    setSubmitting(true);
    try {
      await createAppointmentWithForce(pendingPayload, true);
      navigate('/appointments');
    } catch (err) {
      const msg = err?.response?.data?.detail || '强制预约失败，请重试';
      setError(msg);
    } finally {
      setSubmitting(false);
      setShowForceConfirm(false);
      setPendingPayload(null);
    }
  };

  const handleCancelForce = () => {
    setShowForceConfirm(false);
    setPendingPayload(null);
  };

  if (loading) return <div className="page-loading">加载中...</div>;

  const hasConflicts = conflicts.length > 0;
  const hasWarnings = warnings.length > 0;

  const renderSmartRecommend = () => {
    if (!form.baby) return null;
    if (recommendLoading) return <div className="loading">加载智能推荐中...</div>;
    if (!smartRecommend) return null;

    const { pending_tasks, recommend_dates, near_family_conflicts, baby_name, current_age_months } = smartRecommend;

    return (
      <div className="smart-recommend-panel">
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, #F8F9FD 0%, #EDEFFC 100%)' }}>
          <div className="card-title" style={{ color: '#6C5CE7', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            智能推荐 - {baby_name} ({current_age_months}月龄)
          </div>
          <div className="card-body">
            {pending_tasks && pending_tasks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#2D3436' }}>
                  📋 待办任务推荐 (点击快速选择)
                </div>
                <div className="task-recommend-list">
                  {pending_tasks.map((task, idx) => {
                    const isSelected = 
                      (task.task_type === 'vaccine' && form.appointment_type === 'vaccine' && Number(form.vaccine) === task.vaccine_id) ||
                      (task.task_type === 'checkup' && form.appointment_type === 'checkup' && form.checkup_type === task.checkup_name);
                    return (
                      <div
                        key={idx}
                        className={`task-recommend-item ${isSelected ? 'selected' : ''} ${task.is_overdue ? 'overdue' : ''}`}
                        onClick={() => handleSelectTask(task)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                          <span className={`detail-type ${task.task_type === 'vaccine' ? 'type-free' : 'type-checkup'}`}>
                            {task.task_type === 'vaccine' ? '疫苗' : '体检'}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {task.task_type === 'vaccine' ? `${task.vaccine_short_name} 第${task.dose_number}剂` : task.checkup_name}
                          </span>
                          {task.is_overdue && (
                            <span className="badge badge-red">⚠️ 已逾期</span>
                          )}
                          {task.priority_score >= 80 && (
                            <span className="badge badge-orange">🔥 高优先级</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#636E72' }}>
                          计划日期: {task.planned_date}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {recommend_dates && recommend_dates.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#2D3436' }}>
                  📅 推荐日期 (点击快速选择)
                </div>
                <div className="date-recommend-list">
                  {recommend_dates.map((rd, idx) => (
                    <div key={idx} className="date-recommend-item">
                      <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                        {rd.date} {WEEKDAY_LABELS[rd.weekday] || rd.weekday}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {rd.available_slots.map((slot, sidx) => {
                          const isSelected = form.appointment_date === rd.date && form.time_slot === slot.time_slot;
                          return (
                            <button
                              key={sidx}
                              type="button"
                              className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              style={{ fontSize: 11, padding: '4px 8px' }}
                              onClick={() => handleSelectDate(rd.date, slot.time_slot)}
                            >
                              {slot.time_slot_label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {near_family_conflicts && near_family_conflicts.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#E17055' }}>
                  ⚠️ 近期家庭成员已有预约（请注意安排）
                </div>
                <div className="family-conflict-list">
                  {near_family_conflicts.map((fc, idx) => (
                    <div key={idx} className="family-conflict-item">
                      <span>👶 {fc.baby_name}</span>
                      <span>{fc.date}</span>
                      <span className="badge badge-warning">
                        {fc.type === 'vaccine' ? '疫苗' : '体检'}: {fc.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderConflicts = () => {
    if (!hasConflicts && !hasWarnings) return null;
    return (
      <div className="conflict-panel">
        {conflicts.map((conflict, idx) => (
          <div
            key={idx}
            className={`conflict-item ${conflict.severity === 'error' ? 'conflict-error' : 'conflict-warning'}`}
          >
            <span style={{ fontSize: 18 }}>
              {conflict.severity === 'error' ? '❌' : '⚠️'}
            </span>
            <span>{conflict.message}</span>
          </div>
        ))}
        {warnings.map((warning, idx) => (
          <div key={idx} className="conflict-item conflict-warning">
            <span style={{ fontSize: 18 }}>⚠️</span>
            <span>{warning.message}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderForceConfirm = () => {
    if (!showForceConfirm) return null;
    return (
      <div className="modal-overlay" onClick={handleCancelForce}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>⚠️</div>
          <h3 style={{ textAlign: 'center', marginBottom: 16, color: '#E17055' }}>检测到预约冲突</h3>
          <p style={{ textAlign: 'center', marginBottom: 20, color: '#636E72' }}>
            该时段已有预约记录，是否仍要继续创建？
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelForce}
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleForceSubmit}
              disabled={submitting}
            >
              {submitting ? '提交中...' : '确认创建'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>新建预约</h1>
        <p>智能推荐待办任务与可用时段，自动检测冲突</p>
      </div>

      {error && <div className="form-error">{error}</div>}

      {renderSmartRecommend()}

      {renderConflicts()}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>宝宝</label>
          <select name="baby" value={form.baby} onChange={handleBabyChange} required>
            <option value="">请选择宝宝</option>
            {babies.map(b => (
              <option key={b.id} value={b.id}>{b.name} ({b.age_months}月龄)</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>预约类型</label>
          <select name="appointment_type" value={form.appointment_type} onChange={handleTypeChange} required>
            <option value="vaccine">疫苗接种</option>
            <option value="checkup">体检</option>
          </select>
        </div>

        {form.appointment_type === 'vaccine' && (
          <div className="form-group">
            <label>疫苗</label>
            <select name="vaccine" value={form.vaccine} onChange={handleChange}>
              <option value="">请选择疫苗</option>
              {vaccines.map(v => (
                <option key={v.id} value={v.id}>{v.short_name} 第{v.dose_number}剂 ({v.vaccine_type === 'free' ? '免费' : '自费'})</option>
              ))}
            </select>
          </div>
        )}

        {form.appointment_type === 'checkup' && (
          <div className="form-group">
            <label>体检类型</label>
            <input type="text" name="checkup_type" value={form.checkup_type} onChange={handleChange} placeholder="请输入体检类型" />
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>预约日期</label>
            <input type="date" name="appointment_date" value={form.appointment_date} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label>时间段</label>
            <select name="time_slot" value={form.time_slot} onChange={handleChange} required>
              <option value="">请选择时间段</option>
              {TIME_SLOT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>预约医院</label>
          <input type="text" name="hospital" value={form.hospital} onChange={handleChange} required placeholder="请输入医院名称" />
        </div>

        <div className="form-group">
          <label>备注</label>
          <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={3} placeholder="请输入备注信息" />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/appointments')}>
            取消
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '提交中...' : '提交预约'}
          </button>
        </div>
      </form>

      {renderForceConfirm()}
    </div>
  );
}
