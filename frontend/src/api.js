import axios from 'axios'

const api = axios.create({
  baseURL: '/api/',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  response => response.data?.results ?? response.data,
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const fetchBabies = () => api.get('babies/')
export const fetchBaby = (id) => api.get(`babies/${id}/`)
export const createBaby = (data) => api.post('babies/', data)
export const updateBaby = (id, data) => api.patch(`babies/${id}/`, data)
export const generateSchedule = (babyId) => api.post(`babies/${babyId}/generate_schedule/`)

export const fetchVaccines = (params) => api.get('vaccines/', { params })
export const fetchSchedules = (params) => api.get('vaccination-schedules/', { params })
export const markScheduleCompleted = (id) => api.post(`vaccination-schedules/${id}/mark_completed/`)

export const fetchAppointments = (params) => api.get('appointments/', { params })
export const createAppointment = (data) => api.post('appointments/', data)
export const updateAppointment = (id, data) => api.patch(`appointments/${id}/`, data)
export const deleteAppointment = (id) => api.delete(`appointments/${id}/`)

export const fetchCheckups = (params) => api.get('checkups/', { params })
export const fetchCheckupRecords = (params) => api.get('checkup-records/', { params })
export const createCheckupRecord = (data) => api.post('checkup-records/', data)
export const updateCheckupRecord = (id, data) => api.patch(`checkup-records/${id}/`, data)

export const fetchReactions = (params) => api.get('reactions/', { params })
export const createReaction = (data) => api.post('reactions/', data)
export const updateReaction = (id, data) => api.patch(`reactions/${id}/`, data)
export const deleteReaction = (id) => api.delete(`reactions/${id}/`)

export const fetchStats = (babyId) => {
  const params = babyId ? { baby_id: babyId } : {}
  return api.get('stats/', { params })
}
export const fetchVaccinationRate = (babyId) => {
  const params = babyId ? { baby_id: babyId } : {}
  return api.get('stats/vaccination-rate/', { params })
}
export const fetchDelayCount = (babyId) => {
  const params = babyId ? { baby_id: babyId } : {}
  return api.get('stats/delay-count/', { params })
}
export const fetchReactionDistribution = (babyId) => {
  const params = babyId ? { baby_id: babyId } : {}
  return api.get('stats/reaction-distribution/', { params })
}
export const fetchMonthlyProgress = (babyId) => {
  const params = babyId ? { baby_id: babyId } : {}
  return api.get('stats/monthly-progress/', { params })
}

export default api
