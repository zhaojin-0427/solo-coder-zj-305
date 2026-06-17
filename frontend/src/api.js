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

export const fetchFamilies = (params) => api.get('accounts/families/', { params })
export const fetchFamilyMembers = (params) => api.get('accounts/family-members/', { params })
export const createFamily = (data) => api.post('accounts/families/', data)
export const addFamilyMember = (data) => api.post('accounts/family-members/', data)
export const removeFamilyMember = (id) => api.delete(`accounts/family-members/${id}/`)
export const markAppointmentReminded = (id, data = {}) => api.post(`appointments/${id}/mark_reminded/`, data)
export const unmarkAppointmentReminded = (id) => api.post(`appointments/${id}/unmark_reminded/`)

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
export const fetchTaskFlow = (babyId, month) => {
  const params = {}
  if (month !== undefined && month !== null) params.month = month
  return api.get(`babies/${babyId}/task_flow/`, { params })
}
export const fetchSmartRecommend = (babyId, appointmentType) => {
  const params = { baby_id: babyId }
  if (appointmentType) params.appointment_type = appointmentType
  return api.get('appointments/smart_recommend/', { params })
}
export const createAppointmentWithForce = (data, force = false) => {
  return api.post('appointments/', { ...data, force })
}
export const fetchCollaborationStats = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/collaboration/', { params })
}
export const fetchFamilyReminderStats = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/family-reminders/', { params })
}

export const fetchPreparationStats = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/preparation/', { params })
}

export const generatePreparationChecklist = (appointmentId, userId) => {
  const data = { appointment_id: appointmentId }
  if (userId) data.user_id = userId
  return api.post('preparation/checklists/generate/', data)
}

export const fetchPreparationChecklists = (params) => api.get('preparation/checklists/', { params })
export const fetchPreparationChecklist = (id) => api.get(`preparation/checklists/${id}/`)
export const fetchChecklistByAppointment = (appointmentId) => {
  return api.get('preparation/checklists/by_appointment/', { params: { appointment_id: appointmentId } })
}
export const fetchChecklistByBaby = (babyId) => {
  return api.get('preparation/checklists/by_baby/', { params: { baby_id: babyId } })
}
export const fetchChecklistSummary = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('preparation/checklists/summary/', { params })
}
export const confirmChecklistItem = (checklistId, itemId, confirmed = true, userId) => {
  const data = { item_id: itemId, confirmed }
  if (userId) data.user_id = userId
  return api.post(`preparation/checklists/${checklistId}/confirm_item/`, data)
}
export const batchConfirmItems = (checklistId, itemIds, confirmed = true, userId) => {
  const data = { item_ids: itemIds, confirmed }
  if (userId) data.user_id = userId
  return api.post(`preparation/checklists/${checklistId}/batch_confirm/`, data)
}
export const generateChecklistReport = (checklistId) => {
  return api.post(`preparation/checklists/${checklistId}/generate_report/`)
}
export const fetchChecklistReport = (checklistId) => {
  return api.get(`preparation/checklists/${checklistId}/report/`)
}
export const createArrivalVerification = (checklistId, data = {}) => {
  return api.post('preparation/verifications/create_verification/', { checklist_id: checklistId, ...data })
}
export const fetchVerificationByAppointment = (appointmentId) => {
  return api.get('preparation/verifications/by_appointment/', { params: { appointment_id: appointmentId } })
}
export const updateArrivalVerification = (id, data) => {
  return api.post(`preparation/verifications/${id}/update_verification/`, data)
}
export const addVerificationSupplement = (id, itemName, description = '') => {
  return api.post(`preparation/verifications/${id}/add_supplement/`, { item_name: itemName, description })
}
export const addVerificationMissing = (id, itemName, description = '') => {
  return api.post(`preparation/verifications/${id}/add_missing/`, { item_name: itemName, description })
}

export const fetchHealthEvents = (params) => api.get('health-events/', { params })
export const fetchHealthEvent = (id) => api.get(`health-events/${id}/`)
export const createHealthEvent = (data) => api.post('health-events/', data)
export const updateHealthEvent = (id, data) => api.patch(`health-events/${id}/`, data)
export const deleteHealthEvent = (id) => api.delete(`health-events/${id}/`)
export const addHealthEventUpdate = (eventId, data) => api.post(`health-events/${eventId}/add_update/`, data)
export const markHealthEventViewed = (eventId, userId) => api.post(`health-events/${eventId}/mark_viewed/`, { user_id: userId })
export const changeHealthEventStatus = (eventId, data) => api.post(`health-events/${eventId}/change_status/`, data)
export const assignHealthEventFollower = (eventId, data) => api.post(`health-events/${eventId}/assign_follower/`, data)

export const fetchHealthEventStats = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/', { params })
}
export const fetchHealthEventTrend = (babyId, familyId, days = 30) => {
  const params = { days }
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/trend/', { params })
}
export const fetchHealthEventSeverity = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/severity/', { params })
}
export const fetchHealthEventRevisitRate = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/revisit-rate/', { params })
}
export const fetchHealthEventByAge = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/by-age/', { params })
}
export const fetchHealthEventCollaboration = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/health-events/collaboration/', { params })
}

export const fetchMedicalArchives = (params) => api.get('medical-archives/', { params })
export const fetchMedicalArchive = (id) => api.get(`medical-archives/${id}/`)
export const createMedicalArchive = (data) => api.post('medical-archives/', data)
export const updateMedicalArchive = (id, data) => api.patch(`medical-archives/${id}/`, data)
export const deleteMedicalArchive = (id) => api.delete(`medical-archives/${id}/`)
export const fetchArchiveTimeline = (babyId) => api.get('medical-archives/timeline/', { params: { baby_id: babyId } })
export const fetchArchiveSummary = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('medical-archives/summary/', { params })
}
export const fetchExpiringArchives = (babyId, familyId, days = 30) => {
  const params = { days }
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('medical-archives/expiring-soon/', { params })
}
export const markArchiveViewed = (archiveId, userId) => api.post(`medical-archives/${archiveId}/mark-viewed/`, { user_id: userId })
export const changeArchiveStatus = (archiveId, data) => api.post(`medical-archives/${archiveId}/change-status/`, data)
export const assignArchiveHandler = (archiveId, userId) => api.post(`medical-archives/${archiveId}/assign-handler/`, { user_id: userId })
export const updateArchivePermission = (archiveId, data) => api.post(`medical-archives/${archiveId}/update-view-permission/`, data)

export const fetchArchiveTags = (params) => api.get('archive-tags/', { params })
export const createArchiveTag = (data) => api.post('archive-tags/', data)
export const updateArchiveTag = (id, data) => api.patch(`archive-tags/${id}/`, data)
export const deleteArchiveTag = (id) => api.delete(`archive-tags/${id}/`)

export const fetchArchiveStats = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/medical-archives/', { params })
}
export const fetchArchiveByAge = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/medical-archives/by-age/', { params })
}
export const fetchArchiveMonthlyTrend = (babyId, familyId, months = 12) => {
  const params = { months }
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/medical-archives/monthly-trend/', { params })
}
export const fetchArchiveFamilyCoverage = (babyId, familyId) => {
  const params = {}
  if (babyId) params.baby_id = babyId
  if (familyId) params.family_id = familyId
  return api.get('stats/medical-archives/family-coverage/', { params })
}

export default api
