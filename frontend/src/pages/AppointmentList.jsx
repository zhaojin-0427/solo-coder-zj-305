import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchAppointments, updateAppointment, markAppointmentReminded, unmarkAppointmentReminded } from '../api';

const TIME_SLOT_MAP = {
  morning_1: '上午 08:00-09:00',
  morning_2: '上午 09:00-10:00',
  morning_3: '上午 10:00-11:00',
  afternoon_1: '下午 13:00-14:00',
  afternoon_2: '下午 14:00-15:00',
  afternoon_3: '下午 15:00-16:00',
};

const TYPE_MAP = {
  vaccine: '疫苗接种',
  checkup: '体检',
};

const STATUS_MAP = {
  pending: { label: '待确认', className: 'badge badge-yellow' },
  confirmed: { label: '已确认', className: 'badge badge-blue' },
  completed: { label: '已完成', className: 'badge badge-green' },
  cancelled: { label: '已取消', className: 'badge badge-gray' },
};

export default function AppointmentList() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentUser, setCurrentUser] = useState('1');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      const params = { page_size: 1000 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.appointment_type = typeFilter;
      const data = await fetchAppointments(params);
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, typeFilter]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateAppointment(id, { status: newStatus });
      setAppointments(prev =>
        prev.map(apt => (apt.id === id ? { ...apt, status: newStatus } : apt))
      );
    } catch (err) {
      console.error('Failed to update appointment status:', err);
    }
  };

  const handleToggleRemind = async (id, isReminded) => {
    try {
      const res = isReminded
        ? await unmarkAppointmentReminded(id)
        : await markAppointmentReminded(id, { user_id: currentUser });
      setAppointments(prev => prev.map(apt => apt.id === id ? res : apt));
    } catch (err) {
      console.error('Failed to update remind status:', err);
    }
  };

  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
    if (dateCompare !== 0) return dateCompare;
    return a.time_slot.localeCompare(b.time_slot);
  });

  if (loading) return <div className="page-loading">加载中...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>预约管理</h1>
        <Link to="/appointments/new" className="btn btn-primary">新建预约</Link>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>状态：</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">全部</option>
            <option value="pending">待确认</option>
            <option value="confirmed">已确认</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div className="filter-group">
          <label>类型：</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">全部</option>
            <option value="vaccine">疫苗接种</option>
            <option value="checkup">体检</option>
          </select>
        </div>
        <div className="filter-group">
          <label>当前操作用户：</label>
          <select value={currentUser} onChange={e => setCurrentUser(e.target.value)}>
            <option value="1">admin</option>
            <option value="2">dad</option>
            <option value="3">grandma</option>
            <option value="4">grandpa</option>
          </select>
        </div>
      </div>

      {sortedAppointments.length === 0 ? (
        <div className="empty-state">暂无预约记录</div>
      ) : (
        <div className="card-list">
          {sortedAppointments.map(apt => {
            const statusInfo = STATUS_MAP[apt.status] || { label: apt.status, className: 'badge' };
            return (
              <div key={apt.id} className="card">
                <div className="card-header">
                  <span className="card-title">{apt.baby_name}</span>
                  <span className={statusInfo.className}>{statusInfo.label}</span>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="card-label">预约类型</span>
                    <span className="card-value">{TYPE_MAP[apt.appointment_type] || apt.appointment_type}</span>
                  </div>
                  {apt.vaccine_name && (
                    <div className="card-row">
                      <span className="card-label">疫苗名称</span>
                      <span className="card-value">{apt.vaccine_name}</span>
                    </div>
                  )}
                  <div className="card-row">
                    <span className="card-label">预约日期</span>
                    <span className="card-value">{apt.appointment_date}</span>
                  </div>
                  <div className="card-row">
                    <span className="card-label">时间段</span>
                    <span className="card-value">{TIME_SLOT_MAP[apt.time_slot] || apt.time_slot}</span>
                  </div>
                  <div className="card-row">
                    <span className="card-label">预约医院</span>
                    <span className="card-value">{apt.hospital}</span>
                  </div>
                  {apt.reminded_at && (
                    <div className="card-row">
                      <span className="card-label">提醒状态</span>
                      <span className="card-value text-success">
                        ✅ 已由 {apt.reminded_by_name || '未知用户'} 提醒 ({apt.reminded_at.split('T')[0]})
                      </span>
                    </div>
                  )}
                </div>
                <div className="card-actions">
                  {apt.status === 'pending' && (
                    <>
                      <button className="btn btn-sm btn-blue" onClick={() => handleStatusChange(apt.id, 'confirmed')}>确认</button>
                      <button className="btn btn-sm btn-gray" onClick={() => handleStatusChange(apt.id, 'cancelled')}>取消</button>
                      {apt.reminded_at ? (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleToggleRemind(apt.id, true)}>取消提醒</button>
                      ) : (
                        <button className="btn btn-sm btn-green" onClick={() => handleToggleRemind(apt.id, false)}>✓ 标记已提醒</button>
                      )}
                    </>
                  )}
                  {apt.status === 'confirmed' && (
                    <>
                      <button className="btn btn-sm btn-green" onClick={() => handleStatusChange(apt.id, 'completed')}>完成</button>
                      <button className="btn btn-sm btn-gray" onClick={() => handleStatusChange(apt.id, 'cancelled')}>取消</button>
                      {apt.reminded_at ? (
                        <button className="btn btn-sm btn-secondary" onClick={() => handleToggleRemind(apt.id, true)}>取消提醒</button>
                      ) : (
                        <button className="btn btn-sm btn-green" onClick={() => handleToggleRemind(apt.id, false)}>✓ 标记已提醒</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
