import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAppointments, createReaction } from '../api';

const TYPE_MAP = {
  vaccine: '疫苗接种',
  checkup: '体检',
};

export default function ReactionForm() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    appointment: '',
    reaction_type: '',
    severity: 'mild',
    occurrence_time: '',
    symptoms: '',
    treatment: '',
    doctor_advice: '',
    next_visit_notes: '',
  });

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const data = await fetchAppointments({ status: 'completed' });
        setAppointments(data);
      } catch (err) {
        console.error('Failed to load appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        appointment: Number(form.appointment),
        reaction_type: form.reaction_type,
        severity: form.severity,
        occurrence_time: form.occurrence_time,
        symptoms: form.symptoms,
        treatment: form.treatment,
        doctor_advice: form.doctor_advice,
        next_visit_notes: form.next_visit_notes,
      };
      await createReaction(payload);
      navigate('/reactions');
    } catch (err) {
      const msg = err?.response?.data?.detail || '创建不良反应记录失败，请重试';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">加载中...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>新建不良反应记录</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>关联预约</label>
          <select name="appointment" value={form.appointment} onChange={handleChange} required>
            <option value="">请选择预约</option>
            {appointments.map(apt => (
              <option key={apt.id} value={apt.id}>
                {apt.baby_name} - {TYPE_MAP[apt.appointment_type] || apt.appointment_type} - {apt.appointment_date}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>反应类型</label>
          <input type="text" name="reaction_type" value={form.reaction_type} onChange={handleChange} required placeholder="请输入反应类型" />
        </div>

        <div className="form-group">
          <label>严重程度</label>
          <select name="severity" value={form.severity} onChange={handleChange} required>
            <option value="mild">轻微</option>
            <option value="moderate">中度</option>
            <option value="severe">严重</option>
          </select>
        </div>

        <div className="form-group">
          <label>发生时间</label>
          <input type="datetime-local" name="occurrence_time" value={form.occurrence_time} onChange={handleChange} required />
        </div>

        <div className="form-group">
          <label>症状</label>
          <textarea name="symptoms" value={form.symptoms} onChange={handleChange} rows={3} required placeholder="请输入症状描述" />
        </div>

        <div className="form-group">
          <label>处理措施</label>
          <textarea name="treatment" value={form.treatment} onChange={handleChange} rows={3} placeholder="请输入处理措施" />
        </div>

        <div className="form-group">
          <label>医生建议</label>
          <textarea name="doctor_advice" value={form.doctor_advice} onChange={handleChange} rows={3} placeholder="请输入医生建议" />
        </div>

        <div className="form-group">
          <label>复诊注意事项</label>
          <textarea name="next_visit_notes" value={form.next_visit_notes} onChange={handleChange} rows={3} placeholder="请输入复诊注意事项" />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '提交中...' : '提交记录'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/reactions')}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
