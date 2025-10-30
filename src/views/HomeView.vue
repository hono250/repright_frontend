<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/common/AppButton.vue'

const router = useRouter()

// State
const templates = ref([])
const loading = ref(true)
const showTemplateModal = ref(false)
const selectedTemplate = ref(null)

// Fetch templates on mount
onMounted(async () => {
  await fetchTemplates()
})

// Fetch user's templates
const fetchTemplates = async () => {
  try {
    // Get userId from localStorage (TODO:will improve auth later)
    const token = localStorage.getItem('authToken')
    if (!token) {
      router.push('/login')
      return
    }

    // TODO:need to store userId after login, for now mock it
    const userId = localStorage.getItem('userId') 

    const response = await fetch('http://localhost:8000/api/WorkoutTemplate/getTemplates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: userId })
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('Error fetching templates:', data.error)
      templates.value = []
    } else {
      templates.value = data.templates || []
    }
  } catch (err) {
    console.error('Failed to fetch templates:', err)
    templates.value = []
  } finally {
    loading.value = false
  }
}

// Start empty workout
const startEmptyWorkout = () => {
  router.push('/workout')
}

// Create new template
const createTemplate = () => {
  router.push('/template/create')
}

// Open template details modal
const openTemplate = (template) => {
  selectedTemplate.value = template
  showTemplateModal.value = true
}

// Edit template
const editTemplate = (template) => {
  router.push(`/template/edit/${encodeURIComponent(template.name)}`)
  showTemplateModal.value = false
}

// Start workout from template
const startWorkout = (template) => {
  router.push({
    path: '/workout',
    query: { template: template.name }
  })
  showTemplateModal.value = false
}

// Format last performed date
const formatLastPerformed = (date) => {
  if (!date) return 'Never performed'
  
  const now = new Date()
  const lastPerformed = new Date(date)
  const diffTime = Math.abs(now - lastPerformed)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
}

// Logout
const handleLogout = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('userId')
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <!-- Header with logout -->
    <header class="header">
      <img src="/logo.png" alt="RepRight" class="header-logo" />
      <button @click="handleLogout" class="logout-btn">Logout</button>
    </header>

    <!-- Start Workout Section -->
    <section class="start-section">
      <h2 class="section-title">Start Workout</h2>
      <AppButton variant="primary" @click="startEmptyWorkout">
        Start Empty Workout
      </AppButton>
    </section>

    <!-- Templates Section -->
    <section class="templates-section">
      <div class="section-header">
        <h2 class="section-title">Templates</h2>
        <div class="header-actions">
          <button @click="createTemplate" class="icon-btn" title="Create Template">
            <span class="icon">+</span>
          </button>
          <!-- Archive button for later -->
          <!-- <button class="icon-btn" title="Options">
            <span class="icon">⋯</span>
          </button> -->
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading">Loading templates...</div>

      <!-- Empty state -->
      <div v-else-if="templates.length === 0" class="empty-state">
        <p>No templates yet</p>
        <p class="empty-hint">Create your first template to get started</p>
      </div>

      <!-- Template grid -->
      <div v-else class="template-grid">
        <div
          v-for="template in templates"
          :key="template.name"
          @click="openTemplate(template)"
          class="template-card"
        >
          <h3 class="template-name">{{ template.name }}</h3>
          <p class="template-exercises">{{ template.exercises.length }} exercises</p>
          <p class="template-date">{{ formatLastPerformed(template.lastPerformed) }}</p>
        </div>
      </div>
    </section>

    <!-- Template Detail Modal -->
    <div v-if="showTemplateModal" class="modal-overlay" @click="showTemplateModal = false">
      <div class="modal-content" @click.stop>
        <button @click="showTemplateModal = false" class="modal-close">×</button>
        
        <h2 class="modal-title">{{ selectedTemplate.name }}</h2>
        
        <!-- Exercise list -->
        <div class="exercise-list">
          <div v-for="ex in selectedTemplate.exercises" :key="ex.exercise" class="exercise-item">
            <strong>{{ ex.exercise }}</strong>
            <span class="set-count">{{ ex.sets.length }} sets</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="modal-actions">
          <AppButton variant="secondary" @click="editTemplate(selectedTemplate)">
            Edit Template
          </AppButton>
          <AppButton variant="secondary" @click="showTemplateModal = false">
            Close
          </AppButton>
          <AppButton variant="primary" @click="startWorkout(selectedTemplate)">
            Start Workout
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-container {
  min-height: 100vh;
  background-color: var(--bg-base);
  padding-bottom: 5rem; /* Space for bottom nav later */
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-card);
}

.header-logo {
  height: 40px;
}

.logout-btn {
  background: none;
  border: none;
  color: var(--red-error);
  font-family: var(--font-primary);
  font-size: 0.9rem;
  cursor: pointer;
  text-transform: uppercase;
}

/* Sections */
.start-section,
.templates-section {
  padding: var(--spacing-lg) var(--spacing-md);
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
  margin-bottom: var(--spacing-md);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.header-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.icon-btn {
  width: 40px;
  height: 40px;
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  border-radius: var(--radius-md);
  color: var(--yellow-primary);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-btn:hover {
  background-color: rgba(252, 209, 38, 0.2);
}

/* Loading & Empty states */
.loading,
.empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: rgba(255, 255, 255, 0.6);
}

.empty-hint {
  font-size: 0.9rem;
  margin-top: var(--spacing-xs);
}

/* Template grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-md);
}

.template-card {
  background-color: var(--bg-card);
  border: 2px solid transparent;
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: var(--yellow-primary);
  transform: translateY(-2px);
}

.template-name {
  font-size: 1.1rem;
  font-weight: 700;
  font-style: italic;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.template-exercises {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: var(--spacing-xs);
}

.template-date {
  font-size: 0.85rem;
  color: var(--yellow-primary);
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-md);
}

.modal-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.modal-close {
  position: absolute;
  top: var(--spacing-sm);
  right: var(--spacing-sm);
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
  margin-bottom: var(--spacing-md);
}

.exercise-list {
  margin-bottom: var(--spacing-lg);
}

.exercise-item {
  display: flex;
  justify-content: space-between;
  padding: var(--spacing-sm);
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-sm);
  margin-bottom: var(--spacing-xs);
}

.set-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

/* Responsive */
@media (max-width: 640px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>