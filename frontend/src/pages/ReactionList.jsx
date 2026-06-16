import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchReactions } from '../api';

const SEVERITY_MAP = {
  mild: { label: '轻微', className: 'badge badge-green' },
  moderate: { label: '中度', className: 'badge badge-orange' },
  severe: { label: '严重', className: 'badge badge-red' },
};

const TYPE_MAP = {
  vaccine: '疫苗接种',
  checkup: '体检',
};

const TIME_SLOT_MAP = {
  morning_1: '上午 08:00-09:00',
  morning_2: '上午 09:00-10:00',
  morning_3: '上午 10:00-11:00',
  afternoon_1: '下午 13:00-14:00',
  afternoon_2: '下午 14:00-15:00',
  afternoon_3: '下午 15:00-16:00',
};

export default function ReactionList() {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('all');

  useEffect(() => {
    loadReactions();
  }, []);

  const loadReactions = async () => {
    try {
      const params = {};
      if (severityFilter !== 'all') params.severity = severityFilter;
      const data = await fetchReactions(params);
      setReactions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch reactions:', err);
      setReactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReactions();
  }, [severityFilter]);

  const formatDateTime = (dt) => {
    if (!dt) return '';
    return dt.replace('T', ' ');
  };

  if (loading) return <div className="page-loading">加载中...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>不良反应记录</h1>
        <Link to="/reactions/new" className="btn btn-primary">新建记录</Link>
      </div>

      <div className="filter-bar">
        <div className="filter-group">
          <label>严重程度：</label>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}>
            <option value="all">全部</option>
            <option value="mild">轻微</option>
            <option value="moderate">中度</option>
            <option value="severe">严重</option>
          </select>
        </div>
      </div>

      {reactions.length === 0 ? (
        <div className="empty-state">暂无不良反应记录</div>
      ) : (
        <div className="card-list">
          {reactions.map(reaction => {
            const severityInfo = SEVERITY_MAP[reaction.severity] || { label: reaction.severity, className: 'badge' };
            const aptInfo = reaction.appointment_info || {};
            return (
              <div key={reaction.id} className="card">
                <div className="card-header">
                  <span className="card-title">{reaction.reaction_type}</span>
                  <span className={severityInfo.className}>{severityInfo.label}</span>
                </div>
                <div className="card-body">
                  <div className="card-row">
                    <span className="card-label">发生时间</span>
                    <span className="card-value">{formatDateTime(reaction.occurrence_time)}</span>
                  </div>
                  <div className="card-row">
                    <span className="card-label">症状</span>
                    <span className="card-value">{reaction.symptoms}</span>
                  </div>
                  {reaction.treatment && (
                    <div className="card-row">
                      <span className="card-label">处理措施</span>
                      <span className="card-value">{reaction.treatment}</span>
                    </div>
                  )}
                  {reaction.doctor_advice && (
                    <div className="card-row">
                      <span className="card-label">医生建议</span>
                      <span className="card-value">{reaction.doctor_advice}</span>
                    </div>
                  )}
                  {reaction.next_visit_notes && (
                    <div className="card-row">
                      <span className="card-label">复诊注意事项</span>
                      <span className="card-value">{reaction.next_visit_notes}</span>
                    </div>
                  )}
                  {aptInfo.id && (
                    <div className="card-section">
                      <div className="card-section-title">关联预约</div>
                      <div className="card-row">
                        <span className="card-label">预约日期</span>
                        <span className="card-value">{aptInfo.appointment_date}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">预约类型</span>
                        <span className="card-value">{TYPE_MAP[aptInfo.appointment_type] || aptInfo.appointment_type}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">时间段</span>
                        <span className="card-value">{TIME_SLOT_MAP[aptInfo.time_slot] || aptInfo.time_slot}</span>
                      </div>
                      <div className="card-row">
                        <span className="card-label">医院</span>
                        <span className="card-value">{aptInfo.hospital}</span>
                      </div>
                    </div>
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
