import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchBabies, fetchVaccines, createAppointment } from '../api';

const TIME_SLOT_OPTIONS = [
  { value: 'morning_1', label: '上午 08:00-09:00' },
  { value: 'morning_2', label: '上午 09:00-10:00' },
  { value: 'morning_3', label: '上午 10:00-11:00' },
  { value: 'afternoon_1', label: '下午 13:00-14:00' },
  { value: 'afternoon_2', label: '下午 14:00-15:00' },
  { value: 'afternoon_3', label: '下午 15:00-16:00' },
];

export default function AppointmentForm() {
  const navigate = useNavigate();
  const [babies, setBabies] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    baby: '',
    appointment_type: 'vaccine',
    vaccine: '',
    checkup_type: '',
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
      } catch (err) {
        console.error('Failed to load form data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleBabyChange = e => {
    const babyId = e.target.value;
    const selectedBaby = babies.find(b => b.id === Number(babyId));
    setForm(prev => ({
      ...prev,
      baby: babyId,
      hospital: selectedBaby?.hospital_preference || prev.hospital,
    }));
  };

  const handleTypeChange = e => {
    const appointmentType = e.target.value;
    setForm(prev => ({
      ...prev,
      appointment_type: appointmentType,
      vaccine: appointmentType === 'checkup' ? '' : prev.vaccine,
      checkup_type: appointmentType === 'vaccine' ? '' : prev.checkup_type,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
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
      await createAppointment(payload);
      navigate('/appointments');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.non_field_errors?.[0] || '创建预约失败，请重试';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="page-loading">加载中...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>新建预约</h1>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>宝宝</label>
          <select name="baby" value={form.baby} onChange={handleBabyChange} required>
            <option value="">请选择宝宝</option>
            {babies.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
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
                <option key={v.id} value={v.id}>{v.short_name} 第{v.dose_number}剂</option>
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

        <div className="form-group">
          <label>预约医院</label>
          <input type="text" name="hospital" value={form.hospital} onChange={handleChange} required placeholder="请输入医院名称" />
        </div>

        <div className="form-group">
          <label>备注</label>
          <textarea name="remarks" value={form.remarks} onChange={handleChange} rows={3} placeholder="请输入备注信息" />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? '提交中...' : '提交预约'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/appointments')}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
