import React from 'react'
import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import BabyList from './pages/BabyList'
import BabyForm from './pages/BabyForm'
import BabyDetail from './pages/BabyDetail'
import Calendar from './pages/Calendar'
import AppointmentList from './pages/AppointmentList'
import AppointmentForm from './pages/AppointmentForm'
import ReactionList from './pages/ReactionList'
import ReactionForm from './pages/ReactionForm'
import Statistics from './pages/Statistics'
import Family from './pages/Family'

const navItems = [
  { path: '/babies', label: '宝宝档案', icon: '👶' },
  { path: '/calendar', label: '接种日历', icon: '📅' },
  { path: '/appointments', label: '预约记录', icon: '📋' },
  { path: '/reactions', label: '反应观察', icon: '💊' },
  { path: '/family', label: '家庭共享', icon: '👨‍👩‍👧‍👦' },
  { path: '/statistics', label: '数据统计', icon: '📊' },
]

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        🍼 疫苗体检<br />预约平台
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

export default function App() {
  return (
    <>
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/babies" replace />} />
          <Route path="/babies" element={<BabyList />} />
          <Route path="/babies/new" element={<BabyForm />} />
          <Route path="/babies/:id" element={<BabyDetail />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/appointments" element={<AppointmentList />} />
          <Route path="/appointments/new" element={<AppointmentForm />} />
          <Route path="/reactions" element={<ReactionList />} />
          <Route path="/reactions/new" element={<ReactionForm />} />
          <Route path="/family" element={<Family />} />
          <Route path="/statistics" element={<Statistics />} />
        </Routes>
      </main>
    </>
  )
}
