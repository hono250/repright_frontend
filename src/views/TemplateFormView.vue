<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppButton from '../components/common/AppButton.vue'
import AppInput from '../components/common/AppInput.vue'
import TimeInput from '../components/common/TimeInput.vue'
import ExercisePicker from '../components/workout/ExercisePicker.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()

const isEditMode = ref(!!route.params.templateName)
const templateName = ref('')
const exercises = ref([])
const showExercisePicker = ref(false)
const saving = ref(false)
const exerciseToDelete = ref(null)
const showDeleteModal = ref(false)
const showValidationModal = ref(false)
const validationMessage = ref('')
const showCancelModal = ref(false)

// Exercise structure:
// {
//   name: string,
//   trackingType: 'reps' | 'duration',
//   sets: [
//     {
//       targetWeight: number | null,
//       targetReps: number | null,
//       targetDuration: number | null,
//       restTimer: number
//     }
//   ]
// }


onMounted(async () => {
  if (isEditMode.value) {
    await loadTemplate()
  }
})

// Load existing template for editing
const loadTemplate = async () => {
  try {
    const userId = localStorage.getItem('userId')
    
    const response = await fetch('http://localhost:8000/api/WorkoutTemplate/getTemplate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userId,
        name: route.params.templateName
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      alert('Failed to load template')
      router.push('/home')
      return
    }
    
    templateName.value = data.template.name
    
    // Convert to form format and fetch exercise details
    exercises.value = data.template.exercises.map(ex => ({
      name: ex.exercise,
      trackingType: 'reps', // Will fetch actual type
      sets: ex.sets.map(set => ({
        targetWeight: set.targetWeight,
        targetReps: set.targetReps,
        targetDuration: set.targetDuration,
        restTimer: set.restTimer || 90
      }))
    }))
    
    await fetchExerciseDetails()
    
  } catch (err) {
    console.error('Failed to load template:', err)
    alert('Failed to load template')
    router.push('/home')
  }
}

// Fetch exercise details for trackingType
const fetchExerciseDetails = async () => {
  const userId = localStorage.getItem('userId')
  
  for (const exercise of exercises.value) {
    try {
      const response = await fetch('http://localhost:8000/api/ExerciseLibrary/getExercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userId,
          name: exercise.name
        })
      })
      
      const data = await response.json()
      
      if (!data.error && data.exercise) {
        exercise.trackingType = data.exercise.trackingType
      }
    } catch (err) {
      exercise.trackingType = 'reps'
    }
  }
}

// Add exercises
const handleAddExercises = (selectedExercises) => {
  for (const ex of selectedExercises) {
    exercises.value.push({
      name: ex.name,
      trackingType: ex.trackingType,
      sets: [{
        targetWeight: null,
        targetReps: null,
        targetDuration: null,
        restTimer: 90
      }]
    })
  }
  
  showExercisePicker.value = false
}

// Add set to exercise
const addSet = (exerciseIndex) => {
  const exercise = exercises.value[exerciseIndex]
  const lastSet = exercise.sets[exercise.sets.length - 1]
  
  exercise.sets.push({
    targetWeight: lastSet.targetWeight,
    targetReps: lastSet.targetReps,
    targetDuration: lastSet.targetDuration,
    restTimer: lastSet.restTimer
  })
}

// Delete set
const deleteSet = (exerciseIndex, setIndex) => {
  const exercise = exercises.value[exerciseIndex]
  
  // Must have at least 1 set
  if (exercise.sets.length === 1) {
    alert('Each exercise must have at least one set')
    return
  }
  
  exercise.sets.splice(setIndex, 1)
}

// Delete exercise
const deleteExercise = (exerciseIndex) => {
  exerciseToDelete.value = exerciseIndex
  showDeleteModal.value = true
}

const confirmDelete = () => {
  if (exerciseToDelete.value !== null) {
    exercises.value.splice(exerciseToDelete.value, 1)
  }
  showDeleteModal.value = false
  exerciseToDelete.value = null
}


// Validate template
const isValid = () => {
  if (!templateName.value.trim()) {
    validationMessage.value = 'Please enter a template name before saving.'
    showValidationModal.value = true
    return false
  }
  
  if (exercises.value.length === 0) {
    validationMessage.value = 'Please add at least one exercise to your template.'
    showValidationModal.value = true
    return false
  }
  
  // Check each set has target values
  for (const exercise of exercises.value) {
    for (const set of exercise.sets) {
      if (!set.targetReps && !set.targetDuration) {
        validationMessage.value = `Please set target reps or duration for all sets in ${exercise.name}.`
        showValidationModal.value = true
        return false
      }
    }
  }
  
  return true
}

// Save template
const saveTemplate = async () => {
  if (!isValid()) return
  
  saving.value = true
  
  try {
    const userId = localStorage.getItem('userId')
    
    // Format exercises for API
    const formattedExercises = exercises.value.map(ex => ({
      exercise: ex.name,
      sets: ex.sets
    }))
    
    const endpoint = isEditMode.value 
      ? '/api/WorkoutTemplate/updateTemplate'
      : '/api/WorkoutTemplate/createTemplate'
    
    const response = await fetch(`http://localhost:8000${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userId,
        name: templateName.value.trim(),
        exercises: formattedExercises
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      alert(`Failed to save template: ${data.error}`)
      return
    }
    
    router.push('/home')
    
  } catch (err) {
    console.error('Failed to save template:', err)
    alert('Failed to save template')
  } finally {
    saving.value = false
  }
}

// Cancel confirmation modal 
const cancel = () => {
  if (exercises.value.length > 0 || templateName.value) {
    showCancelModal.value = true
  } else {
    router.push('/home')
  }
}

const confirmCancel = () => {
  router.push('/home')
}

</script>

<template>
  <div class="template-form-container">
    <!-- Header -->
    <header class="header">
      <button @click="cancel" class="cancel-btn">
        Cancel
      </button>
      <h1 class="title">
        {{ isEditMode ? 'Edit Template' : 'New Template' }}
      </h1>
      <button @click="saveTemplate" :disabled="saving" class="save-btn">
        {{ saving ? 'Saving...' : 'Save' }}
      </button>
    </header>

    <!-- Form -->
    <div class="form-content">
      <!-- Template Name -->
      <div class="name-section">
        <AppInput
          v-model="templateName"
          type="text"
          label="Template Name"
          placeholder="e.g., Leg Day, Push Day"
        />
      </div>

      <!-- Exercises List -->
      <div class="exercises-section">
        <h2 class="section-title">Exercises</h2>

        <!-- Empty state -->
        <div v-if="exercises.length === 0" class="empty">
          <p>No exercises added yet</p>
          <AppButton variant="primary" @click="showExercisePicker = true">
            Add Exercise
          </AppButton>
        </div>

        <!-- Exercise blocks -->
        <div
          v-for="(exercise, exIndex) in exercises"
          :key="exIndex"
          class="exercise-block"
        >
          <!-- Exercise Header -->
          <div class="exercise-header">
            <h3 class="exercise-name">{{ exercise.name }}</h3>
            <button @click="deleteExercise(exIndex)" class="delete-btn">
              🗑️
            </button>
          </div>

          <!-- Sets Table -->
          <div class="sets-table">
            <div class="table-header">
              <span class="col-set">Set</span>
              <span class="col-input">{{ exercise.trackingType === 'reps' ? 'Weight' : 'Weight' }}</span>
              <span class="col-input">{{ exercise.trackingType === 'reps' ? 'Reps' : 'Duration' }}</span>
              <span class="col-rest">Rest</span>
              <span class="col-delete"></span>
            </div>

            <div
              v-for="(set, setIndex) in exercise.sets"
              :key="setIndex"
              class="set-row"
            >
              <span class="col-set">{{ setIndex + 1 }}</span>
              
              <!-- Weight input (both types) -->
              <input
                v-model.number="set.targetWeight"
                type="number"
                min="0"
                step="5"
                class="col-input input-field"
                placeholder="lbs"
              />
              
              <!-- Reps or Duration -->
              <input
                v-if="exercise.trackingType === 'reps'"
                v-model.number="set.targetReps"
                type="number"
                min="1"
                class="col-input input-field"
                placeholder="reps"
              />
              
              <TimeInput
                v-else
                v-model="set.targetDuration"
                placeholder="0:00"
                class="col-input"
              />
              
              <!-- Rest Timer -->
              <TimeInput
                v-model="set.restTimer"
                placeholder="0:00"
                class="col-rest rest-input-small"
              />
              
              <!-- Delete Set -->
              <button
                @click="deleteSet(exIndex, setIndex)"
                class="col-delete delete-set-btn"
                :disabled="exercise.sets.length === 1"
              >
                ×
              </button>
            </div>
          </div>

          <!-- Add Set Button -->
          <button @click="addSet(exIndex)" class="add-set-btn">
            + Add Set
          </button>
        </div>

        <!-- Add Exercise Button (when exercises exist) -->
        <button
          v-if="exercises.length > 0"
          @click="showExercisePicker = true"
          class="add-exercise-btn"
        >
          + Add Exercise
        </button>
      </div>
    </div>

    <!-- Exercise Picker Modal -->
    <ExercisePicker
      :show="showExercisePicker"
      @close="showExercisePicker = false"
      @add="handleAddExercises"
    />

    <!-- Delete Exercise Modal -->
    <ConfirmModal
      :show="showDeleteModal"
      title="Remove Exercise?"
      :message="`Remove ${exerciseToDelete !== null ? exercises[exerciseToDelete]?.name : 'this exercise'} from template?`"
      confirmText="Remove"
      confirmVariant="danger"
      cancelText="Cancel"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />

    <!-- Validation Error Modal -->
    <ConfirmModal
      :show="showValidationModal"
      title="Cannot Save Template"
      :message="validationMessage"
      confirmText="OK"
      confirmVariant="primary"
      @confirm="showValidationModal = false"
      @cancel="showValidationModal = false"
    />

    <!-- Cancel Confirmation Modal -->
    <ConfirmModal
      :show="showCancelModal"
      title="Discard Changes?"
      message="You have unsaved changes. Are you sure you want to leave?"
      confirmText="Discard"
      confirmVariant="danger"
      cancelText="Keep Editing"
      @confirm="confirmCancel"
      @cancel="showCancelModal = false"
    />

  </div>
</template>

<style scoped>
.template-form-container {
  min-height: 100vh;
  background-color: var(--bg-base);
  padding-bottom: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-card);
  position: sticky;
  top: 0;
  z-index: 100;
}

.cancel-btn,
.save-btn {
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn {
  background-color: var(--red-transparent);
  border: 1px solid var(--red-error);
  color: var(--red-error);
}

.save-btn {
  background-color: var(--green-success);
  border: none;
  color: var(--text-primary);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.title {
  font-size: 1.3rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
}

.form-content {
  padding: var(--spacing-md);
}

.name-section {
  margin-bottom: var(--spacing-xl);
}

.section-title {
  font-size: 1.2rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
  margin-bottom: var(--spacing-md);
}

.empty {
  text-align: center;
  padding: var(--spacing-xl);
}

.exercise-block {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-lg);
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.exercise-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.delete-btn {
  padding: 0.5rem;
  background-color: var(--red-transparent);
  border: 1px solid var(--red-error);
  border-radius: var(--radius-md);
  color: var(--red-error);
  font-size: 1rem;
  cursor: pointer;
}

/* Sets Table */
.sets-table {
  margin-bottom: var(--spacing-md);
}

.table-header,
.set-row {
  display: grid;
  grid-template-columns: 40px 1fr 1fr 80px 30px;
  gap: var(--spacing-xs);
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.table-header {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.set-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.input-field {
  width: 100%;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 0.9rem;
  text-align: center;
}

.rest-input-small {
  font-size: 0.85rem;
}

.delete-set-btn {
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}

.delete-set-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-set-btn:hover:not(:disabled) {
  color: var(--red-error);
}

.add-set-btn,
.add-exercise-btn {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px dashed rgba(255, 255, 255, 0.3);
  border-radius: var(--radius-md);
  color: rgba(255, 255, 255, 0.7);
  font-family: var(--font-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

.add-exercise-btn {
  margin-top: var(--spacing-md);
  border-color: var(--yellow-primary);
  color: var(--yellow-primary);
}
</style>