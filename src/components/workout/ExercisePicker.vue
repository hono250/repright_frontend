<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import AppButton from '../common/AppButton.vue'
import AppInput from '../common/AppInput.vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close', 'add'])

// State
const searchQuery = ref('')
const selectedFilters = ref({
  muscleGroup: '',
  equipment: '',
  classification: '',
  forceType: ''
})
const exercises = ref([])
const selectedExercises = ref([]) // Track multiple selections
const loading = ref(false)
const showFilters = ref(false)

// Filter options
const muscleGroups = ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Glutes', 'Full Body', 'Other']
const equipmentTypes = ['Barbell', 'Dumbbell', 'Kettlebell', 'Machine', 'Cable', 'Bodyweight', 'Resistance Band', 'Other']
const classifications = ['Bodybuilding', 'Powerlifting', 'Calisthenics', 'Olympic Weightlifting', 'Functional', 'Other']
const forceTypes = ['Push', 'Pull', 'Static', 'Other']

// Mapping: filter category → specific muscle groups
const muscleGroupMapping = {
  'Chest': ['Chest', 'Pectoralis Major', 'Pectoralis Minor', 'Pectorals'],
  'Back': ['Back', 'Latissimus Dorsi', 'Lats', 'Erector Spinae', 'Rhomboids', 'Trapezius'],
  'Shoulders': ['Shoulders', 'Deltoids', 'Anterior Deltoid', 'Posterior Deltoid'],
  'Arms': ['Arms', 'Biceps', 'Triceps', 'Forearms', 'Brachialis'],
  'Legs': ['Legs', 'Quadriceps', 'Hamstrings', 'Calves', 'Hip Flexors', 'Adductors', 'Abductors'],
  'Core': ['Core', 'Abdominals', 'Obliques', 'Rectus Abdominis', 'Transverse Abdominis'],
  'Glutes': ['Glutes', 'Gluteus Maximus', 'Gluteus Medius', 'Gluteus Minimus'],
  'Full Body': ['Full Body'],
  'Other': ['Other']
}

// Fetch exercises
const fetchExercises = async () => {
  loading.value = true
  
  try {
    const userId = localStorage.getItem('userId')
    
    // Fetch ALL exercises (no muscle group filter sent to backend)
    const response = await fetch('http://localhost:8000/api/ExerciseLibrary/searchExercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userId,
        query: searchQuery.value || 'a',
        filters: {
          equipment: selectedFilters.value.equipment || undefined,
          classification: selectedFilters.value.classification || undefined,
          forceType: selectedFilters.value.forceType || undefined
        }
      })
    })
    
    const data = await response.json()
    let results = Array.isArray(data) ? data : (data.exercises || [])
    
    // Client-side filter by muscle group category
    if (selectedFilters.value.muscleGroup) {
      const allowedGroups = muscleGroupMapping[selectedFilters.value.muscleGroup]
      results = results.filter(ex => 
        allowedGroups.includes(ex.targetMuscleGroup)
      )
    }
    
    exercises.value = results
    
  } catch (err) {
    console.error('Failed to fetch exercises:', err)
    exercises.value = []
  } finally {
    loading.value = false
  }
}

// Search with debounce
let searchTimeout
const handleSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchExercises()
  }, 300)
}

// Apply filters
const applyFilters = () => {
  showFilters.value = false
  fetchExercises()
}

// Clear filters
const clearFilters = () => {
  selectedFilters.value = {
    muscleGroup: '',
    equipment: '',
    classification: '',
    forceType: ''
  }
  fetchExercises()
}

// Toggle exercise selection
const toggleExercise = (exercise) => {
  const index = selectedExercises.value.findIndex(ex => ex.name === exercise.name)
  
  if (index >= 0) {
    // Already selected - remove it
    selectedExercises.value.splice(index, 1)
  } else {
    // Not selected - add it
    selectedExercises.value.push(exercise)
  }
}

// Check if exercise is selected
const isSelected = (exercise) => {
  return selectedExercises.value.some(ex => ex.name === exercise.name)
}

// Add selected exercises
const addExercises = () => {
  if (selectedExercises.value.length === 0) return
  
  emit('add', selectedExercises.value)
  selectedExercises.value = []
  emit('close')
}

// Active filter count
const activeFilterCount = computed(() => {
  return Object.values(selectedFilters.value).filter(v => v !== '').length
})

// Remove individual filter
const removeFilter = (filterKey) => {
  selectedFilters.value[filterKey] = ''
  fetchExercises()
}

// Watch for modal opening
watch(() => props.show, (newVal) => {
  if (newVal) {
    selectedExercises.value = []
    fetchExercises()
  }
})

</script>

<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <!-- Header -->
      <div class="modal-header">
        <h2 class="modal-title">
          Add Exercise
          <span v-if="selectedExercises.length > 0" class="selection-count">
            ({{ selectedExercises.length }} selected)
          </span>
        </h2>
        <button @click="$emit('close')" class="modal-close">×</button>
      </div>

      <!-- Search Bar -->
      <div class="search-section">
        <AppInput
          v-model="searchQuery"
          type="text"
          placeholder="Search exercises..."
          @input="handleSearch"
        />
        
        <button @click="showFilters = !showFilters" class="filter-btn">
          <span class="filter-icon">⚙</span>
          Filters
          <span v-if="activeFilterCount > 0" class="filter-badge">{{ activeFilterCount }}</span>
        </button>
      </div>

      <!-- Active Filters -->
      <div v-if="activeFilterCount > 0" class="active-filters">
      <span class="filter-label">Active filters:</span>
      <button
          v-if="selectedFilters.muscleGroup"
          @click="removeFilter('muscleGroup')"
          class="filter-chip"
      >
          {{ selectedFilters.muscleGroup }} ×
      </button>
      <button
          v-if="selectedFilters.equipment"
          @click="removeFilter('equipment')"
          class="filter-chip"
      >
          {{ selectedFilters.equipment }} ×
      </button>
      <button
          v-if="selectedFilters.classification"
          @click="removeFilter('classification')"
          class="filter-chip"
      >
          {{ selectedFilters.classification }} ×
      </button>
      <button
          v-if="selectedFilters.forceType"
          @click="removeFilter('forceType')"
          class="filter-chip"
      >
          {{ selectedFilters.forceType }} ×
      </button>
      </div>

      <!-- Filter Panel -->
      <div v-if="showFilters" class="filter-panel">
        <div class="filter-group">
          <label>Muscle Group</label>
          <select v-model="selectedFilters.muscleGroup">
            <option value="">All</option>
            <option v-for="mg in muscleGroups" :key="mg" :value="mg">{{ mg }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Equipment</label>
          <select v-model="selectedFilters.equipment">
            <option value="">All</option>
            <option v-for="eq in equipmentTypes" :key="eq" :value="eq">{{ eq }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Classification</label>
          <select v-model="selectedFilters.classification">
            <option value="">All</option>
            <option v-for="cls in classifications" :key="cls" :value="cls">{{ cls }}</option>
          </select>
        </div>

        <div class="filter-group">
          <label>Force Type</label>
          <select v-model="selectedFilters.forceType">
            <option value="">All</option>
            <option v-for="ft in forceTypes" :key="ft" :value="ft">{{ ft }}</option>
          </select>
        </div>

        <div class="filter-actions">
          <AppButton variant="secondary" @click="clearFilters">Clear</AppButton>
          <AppButton variant="primary" @click="applyFilters">Apply</AppButton>
        </div>
      </div>

      <!-- Exercise List -->
      <div class="exercise-list">
        <div v-if="loading" class="loading">Searching...</div>
        
        <div v-else-if="exercises.length === 0" class="empty">
          No exercises found
        </div>

        <div
          v-else
          v-for="exercise in exercises"
          :key="exercise.name"
          @click="toggleExercise(exercise)"
          :class="['exercise-card', { selected: isSelected(exercise) }]"
        >
          <!-- Selection indicator -->
          <div class="selection-check">
            <span v-if="isSelected(exercise)" class="check-icon">✓</span>
          </div>
          
          <!-- Exercise info -->
          <div class="exercise-content">
            <h4 class="exercise-name">{{ exercise.name }}</h4>
            
            <div class="exercise-meta">
              <!-- Muscle Group (always show if available) -->
              <span v-if="exercise.targetMuscleGroup" class="meta-tag ">
                {{ exercise.targetMuscleGroup }}
              </span>
  
              <span v-if="!exercise.isGlobal" class="meta-tag custom">
                Custom
              </span>
            </div>
            
            <!-- Video link -->
            <a
              v-if="exercise.videoUrl"
              :href="exercise.videoUrl"
              target="_blank"
              @click.stop
              class="video-link"
            >
              Watch Demo →
            </a>
          </div>
        </div>
      </div>

      <!-- Add Button (sticky at bottom) -->
      <div v-if="selectedExercises.length > 0" class="add-section">
        <AppButton variant="primary" @click="addExercises">
          Add {{ selectedExercises.length }} Exercise{{ selectedExercises.length > 1 ? 's' : '' }}
        </AppButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--spacing-md);
}

.modal-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.selection-count {
  font-size: 1rem;
  color: var(--green-success);
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 2rem;
  cursor: pointer;
  line-height: 1;
}

/* Search Section */
.search-section {
  padding: var(--spacing-md);
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  border-radius: var(--radius-md);
  color: var(--yellow-primary);
  font-family: var(--font-primary);
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.filter-icon {
  font-size: 1.2rem;
}

.filter-badge {
  background-color: var(--yellow-primary);
  color: var(--bg-base);
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Filter Panel */
.filter-panel {
  padding: var(--spacing-md);
  background-color: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-group {
  margin-bottom: var(--spacing-md);
}

.filter-group label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
}

.filter-group select {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-primary);
}

.filter-actions {
  display: flex;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-md);
}
.active-filters {
  padding: var(--spacing-sm) var(--spacing-md);
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.filter-chip {
  padding: 0.25rem 0.75rem;
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  border-radius: 999px;
  color: var(--yellow-primary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  background-color: var(--red-transparent);
  border-color: var(--red-error);
  color: var(--red-error);
}

/* Exercise List */
.exercise-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
}

.loading,
.empty {
  text-align: center;
  padding: var(--spacing-xl);
  color: rgba(255, 255, 255, 0.6);
}

/* Exercise Card */
.exercise-card {
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  background-color: rgba(255, 255, 255, 0.05);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  margin-bottom: var(--spacing-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.exercise-card:hover {
  background-color: rgba(252, 209, 38, 0.1);
  border-color: var(--yellow-primary);
}

.exercise-card.selected {
  background-color: rgba(0, 215, 114, 0.15);
  border-color: var(--green-success);
}

.selection-check {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 0.2rem;
}

.exercise-card.selected .selection-check {
  background-color: var(--green-success);
  border-color: var(--green-success);
}

.check-icon {
  color: var(--bg-base);
  font-weight: 700;
  font-size: 0.9rem;
}

.exercise-content {
  flex: 1;
}

.exercise-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-xs);
}

.exercise-meta {
  display: flex;
  gap: var(--spacing-xs);
  flex-wrap: wrap;
  margin-bottom: var(--spacing-xs);
}

.meta-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-sm);
  color: rgba(255, 255, 255, 0.7);
}

.meta-tag.custom {
  background-color: var(--yellow-transparent);
  color: var(--yellow-primary);
  font-weight: 600;
}

.video-link {
  display: inline-block;
  margin-top: var(--spacing-xs);
  color: var(--green-success);
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 600;
}

.video-link:hover {
  text-decoration: underline;
}

/* Add Section (Sticky Footer) */
.add-section {
  padding: var(--spacing-md);
  border-top: 2px solid var(--green-success);
  background-color: rgba(0, 0, 0, 0.5);
}

/* Responsive */
@media (max-width: 640px) {
  .search-section {
    flex-direction: column;
  }
  
  .filter-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>