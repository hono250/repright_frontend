<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppButton from '../components/common/AppButton.vue'
import ExercisePicker from '../components/workout/ExercisePicker.vue'
import TimeInput from '../components/common/TimeInput.vue'
import ConfirmModal from '../components/common/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()

// State
const templateName = ref(route.query.template || null) // If started from template
const exercises = ref([]) // List of exercises with sets
const showExercisePicker = ref(false)
const activeRestTimer = ref(null) // Which set is currently resting
const restTimeRemaining = ref(0)
const startTime = ref(new Date())
const exerciseDetails = ref({}) // Map of exercise name → exercise data
const showCancelModal = ref(false)
const showFinishModal = ref(false)
const exerciseToDelete = ref(null)
const showDeleteExerciseModal = ref(false)

// Exercise structure:
// {
//   name: string,
//   sets: [
//     {
//       targetWeight: number | null,
//       targetReps: number | null,
//       previousWeight: number | null,
//       previousReps: number | null,
//       actualWeight: number | null,
//       actualReps: number | null,
//       completed: boolean,
//       restTimer: number (seconds)
//     }
//   ]
// }

// Add reactive timer
const elapsedTime = ref(0)
let timerInterval = null


onMounted(async () => {
  // Start elapsed timer
  timerInterval = setInterval(() => {
    elapsedTime.value = Math.floor((Date.now() - startTime.value) / 1000)
  }, 1000)

  if (templateName.value) {
    await loadTemplate()
  }
})

// Cleanup on unmount
onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (restInterval) clearInterval(restInterval)
})

// Load template if workout started from one
const loadTemplate = async () => {
  try {
    const userId = localStorage.getItem('userId')
    
    const response = await fetch('http://localhost:8000/api/WorkoutTemplate/getTemplate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: userId,
        name: templateName.value
      })
    })
    
    const data = await response.json()
    
    if (data.error) {
      console.error('Failed to load template:', data.error)
      return
    }
    
    // Convert template to workout session format
    exercises.value = data.exercises.map(ex => ({
      name: ex.exercise,
      trackingType: 'reps', // DEFAULT - need to fetch this from ExerciseLibrary
      sets: ex.sets.map(set => ({
        targetWeight: set.targetWeight,
        targetReps: set.targetReps,
        targetDuration: set.targetDuration,
        previousWeight: null, // TODO: Fetch from WorkoutLog
        previousReps: null,
        previousDuration: null,
        actualWeight: null,
        actualReps: null,
        actualDuration: null,
        completed: false,
        restTimer: set.restTimer || 90
      }))
    }))
    
    // Fetch previous workout data for each exercise
    await fetchPreviousWorkouts()

    // Fetch exercise details to get trackingType
   await fetchExerciseDetails()
    
  } catch (err) {
    console.error('Error loading template:', err)
  }
}

// Fetch previous workout data
const fetchPreviousWorkouts = async () => {
  const userId = localStorage.getItem('userId')
  
  for (const exercise of exercises.value) {
    try {
      const response = await fetch('http://localhost:8000/api/WorkoutLog/getLastWorkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: userId,
          exercise: exercise.name
        })
      })
      
      const data = await response.json()
      
      if (!data.error && data.workout) {
        // Pre-fill first set with previous data
        if (exercise.sets.length > 0) {
          exercise.sets[0].previousWeight = data.workout.weight
          exercise.sets[0].previousReps = data.workout.reps
          exercise.sets[0].previousDuration = data.workout.duration
        }
      }
    } catch (err) {
      // No previous workout - that's okay
    }
  }
}

// Fetch exercise details to get trackingType
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
      console.error('Failed to fetch exercise details:', err)
      exercise.trackingType = 'reps' // Default fallback
    }
  }
}

// Add exercises from picker
const handleAddExercises = (selectedExercises) => {
  for (const ex of selectedExercises) {
    // Store exercise details
    exerciseDetails.value[ex.name] = ex
    exercises.value.push({
      name: ex.name,
      trackingType: ex.trackingType,
      sets: [{
        targetWeight: null,
        targetReps: null,
        targetDuration: null,
        previousWeight: null,
        previousReps: null,
        previousDuration: null,
        actualWeight: null,
        actualReps: null,
        actualDuration: null,
        completed: false,
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
    previousWeight: lastSet.actualWeight, // Use last completed as reference
    previousReps: lastSet.actualReps,
    previousDuration: lastSet.actualDuration,
    actualWeight: null,
    actualReps: null,
    actualDuration: null,
    completed: false,
    restTimer: lastSet.restTimer
  })
}

// Validate set has valid data
const isSetValid = (set) => {
  if (set.actualWeight !== null && set.actualWeight < 0) return false
  if (set.actualReps !== null && set.actualReps < 1) return false
  if (!set.actualWeight && !set.actualReps && !set.actualDuration) return false
  return true
}

// Complete a set with validation - allow unchecking
const completeSet = (exerciseIndex, setIndex) => {
  const set = exercises.value[exerciseIndex].sets[setIndex]
  
  if (set.completed) {
    // Uncheck - allow editing again
    set.completed = false
    
    // Stop rest timer if active
    if (activeRestTimer.value?.exerciseIndex === exerciseIndex && 
        activeRestTimer.value?.setIndex === setIndex) {
      clearInterval(restInterval)
      activeRestTimer.value = null
    }
    return
  }
  
  // Check if valid
  if (!isSetValid(set)) {
    return
  }
  
  set.completed = true
  startRestTimer(exerciseIndex, setIndex, set.restTimer)
}


const deleteSet = (exerciseIndex, setIndex) => {
  const exercise = exercises.value[exerciseIndex]
  
  // If it's the last set, show confirmation (will delete exercise)
  if (exercise.sets.length === 1) {
    exerciseToDelete.value = exerciseIndex
    showDeleteExerciseModal.value = true
  } else {
    // Just delete the set
    exercise.sets.splice(setIndex, 1)
  }
}

const deleteExercise = (exerciseIndex) => {
  exerciseToDelete.value = exerciseIndex
  showDeleteExerciseModal.value = true
}

const confirmDeleteExercise = () => {
  if (exerciseToDelete.value !== null) {
    exercises.value.splice(exerciseToDelete.value, 1)
  }
  showDeleteExerciseModal.value = false
  exerciseToDelete.value = null
}

// Rest timer
let restInterval = null
const startRestTimer = (exerciseIndex, setIndex, duration) => {
  // Stop any existing timer
  if (restInterval) {
    clearInterval(restInterval)
  }
  
  activeRestTimer.value = { exerciseIndex, setIndex }
  restTimeRemaining.value = duration
  
  restInterval = setInterval(() => {
    restTimeRemaining.value--
    
    if (restTimeRemaining.value <= 0) {
      clearInterval(restInterval)
      activeRestTimer.value = null
    }
  }, 1000)
}

// Format timer display
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Check if can finish workout
const canFinishWorkout = computed(() => {
  return exercises.value.some(ex => 
    ex.sets.some(set => set.completed)
  )
})

// Check if has any uncompleted sets
const hasUnfinishedSets = computed(() => {
  return exercises.value.some(ex =>
    ex.sets.some(set => !set.completed)
  )
})

// Finish workout and save to WorkoutLog
const finishWorkout = () => {
  if (!canFinishWorkout.value) return
  
  showFinishModal.value = true
}

const confirmFinish = () => {
  // TODO A5: Save sets to WorkoutLog
  // TODO A5: Prompt to save as template
  // TODO A5: Prompt for template changes
  
  alert('Workout saved! (Full saving in A5)')
  router.push('/home')
}


const cancelWorkout = () => {
  const hasCompletedSets = exercises.value.some(ex => 
    ex.sets.some(set => set.completed)
  )
  
  if (hasCompletedSets) {
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
  <div class="workout-container">
    <!-- Header -->
    <header class="workout-header">
      <button @click="cancelWorkout" class="cancel-btn">
        ✕ Cancel Workout
      </button>
      <h1 class="workout-title">
        {{ templateName || 'Workout' }}
      </h1>
      <div class="timer">{{ formatTime(elapsedTime) }}</div>
    </header>

    <!-- Exercises List -->
    <div class="exercises-list">
      <div v-if="exercises.length === 0" class="empty">
        <p>No exercises yet</p>
        <AppButton variant="primary" @click="showExercisePicker = true">
          Add Exercise
        </AppButton>
      </div>

      <div
        v-for="(exercise, exIndex) in exercises"
        :key="exIndex"
        class="exercise-block"
      >
        <!-- Exercise Header -->
        <div class="exercise-header">
          <h3 class="exercise-name">{{ exercise.name }}</h3>
            <div class="exercise-actions">
              <button class="ai-btn">AI 🤖</button>
              <button @click="deleteExercise(exIndex)" class="delete-btn" title="Delete exercise">
            🗑️
            </button>
            </div>
        </div>

        <!-- Sets Table -->
        <div class="sets-table">
          <div class="table-header">
            <span class="col-set">Set</span>
            <span class="col-previous">Previous</span>
            <span class="col-input">{{ exercise.trackingType === 'reps' ? 'Weight' : 'Weight' }}</span>
            <span class="col-input">{{ exercise.trackingType === 'reps' ? 'Reps' : 'Duration' }}</span>
            <span class="col-check"></span>
          </div>

          <div
            v-for="(set, setIndex) in exercise.sets"
            :key="setIndex"
            class="set-row-wrapper"
          >
            <div :class="['set-row', { completed: set.completed }]">
              <span class="col-set">{{ setIndex + 1 }}</span>
    
              <span class="col-previous">
                <!-- Reps exercise -->
                <span v-if="exercise.trackingType === 'reps' && (set.previousWeight || set.previousReps)" class="previous-data">
                    {{ set.previousWeight || '-' }} × {{ set.previousReps || '-' }}
                </span>
                <!-- Duration exercise -->
                <span v-else-if="exercise.trackingType === 'duration'" class="previous-data">
                    {{ set.previousWeight || '-' }} × {{ set.previousDuration ? formatTime(set.previousDuration) : '-' }}
                </span>
                <span v-else>-</span>
              </span>
              <!-- Reps exercise: Weight input -->
              <input
                v-if="exercise.trackingType === 'reps'"
                v-model.number="set.actualWeight"
                type="number"
                min="0"
                step="5"
                class="col-input input-field"
                :disabled="set.completed"
                placeholder="lbs"
              />
            
              <!-- Reps exercise: Reps input -->
              <input
                v-if="exercise.trackingType === 'reps'"
                v-model.number="set.actualReps"
                type="number"
                min="1"
                class="col-input input-field"
                :disabled="set.completed"
                placeholder="reps"
              />

              <!-- Duration exercise: Weight + Duration -->
              <input
                v-if="exercise.trackingType === 'duration'"
                v-model.number="set.actualWeight"
                type="number"
                min="0"
                step="5"
                class="col-input input-field"
                :disabled="set.completed"
                placeholder="lbs (optional)"
              />

              <div v-if="exercise.trackingType === 'duration'" class="col-input duration-cell-inline">
                <TimeInput
                  v-if="exercise.trackingType === 'duration'"
                  v-model="set.actualDuration"
                  :disabled="set.completed"
                  placeholder="0:00"
                  class="col-input"
                />
              </div>
    
              <button
                @click="completeSet(exIndex, setIndex)"
                :class="['col-check', 'check-btn', { 
                  completed: set.completed,
                  'can-complete': isSetValid(set)
                }]"
                :disabled="set.completed"
              >
                {{ set.completed ? '✓' : '○' }}
              </button>
            </div>

            <!-- Rest Timer Input (when not completed) -->
            <div v-if="!set.completed" class="rest-input-row">
              <label>Rest:</label>
              <TimeInput
                v-model="set.restTimer"
                placeholder="0:00"
                class="rest-time-input"
              />
            </div>

            <!-- Rest Timer Countdown (when active) -->
            <div
              v-if="set.completed && activeRestTimer?.exerciseIndex === exIndex && activeRestTimer?.setIndex === setIndex"
              class="rest-timer active"
            >
              Rest: {{ formatTime(restTimeRemaining) }}
            </div>
  
            <!-- Separator line when rest complete (no text) -->
            <div
              v-if="set.completed && !(activeRestTimer?.exerciseIndex === exIndex && activeRestTimer?.setIndex === setIndex)"
              class="set-separator"
            ></div>

            <!-- Delete row button -->
            <button
              @click="deleteSet(exIndex, setIndex)"
              class="delete-set-btn"
              title="Delete set"
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
    </div>

    <!-- Finish Workout Button -->
    <div class="finish-section">
      <button class="add-exercise-btn" @click="showExercisePicker = true">
        Add Exercise
      </button>

      <AppButton
        variant="primary"
        @click="finishWorkout"
        :disabled="!canFinishWorkout"
      >
        Finish Workout
      </AppButton>
    </div>

    <!-- Exercise Picker Modal -->
    <ExercisePicker
      :show="showExercisePicker"
      @close="showExercisePicker = false"
      @add="handleAddExercises"
    />
    <!-- Cancel Workout Modal -->
    <ConfirmModal
      :show="showCancelModal"
      title="Cancel Workout?"
      message="All progress will be lost. Are you sure you want to cancel?"
      confirmText="Cancel Workout"
      confirmVariant="danger"
      cancelText="Continue Workout"
      @confirm="confirmCancel"
      @cancel="showCancelModal = false"
    />

    <!-- Finish Workout Modal -->
    <ConfirmModal
      :show="showFinishModal"
      title="Finish Workout?"
      :message="hasUnfinishedSets 
        ? 'You have sets with data that aren\'t marked complete. Discard unfinished sets and finish workout?' 
        : 'Ready to finish your workout?'"
      :confirmText="hasUnfinishedSets ? 'Discard & Finish' : 'Finish Workout'"
      confirmVariant="primary"
      cancelText="Go Back"
      @confirm="confirmFinish"
      @cancel="showFinishModal = false"
    />  
    
    <!-- Delete Exercise Modal -->
    <ConfirmModal
      :show="showDeleteExerciseModal"
      title="Delete Exercise?"
      :message="`Remove ${exerciseToDelete !== null ? exercises[exerciseToDelete]?.name : 'this exercise'} from workout?`"
      confirmText="Delete"
      confirmVariant="danger"
      cancelText="Cancel"
      @confirm="confirmDeleteExercise"
      @cancel="showDeleteExerciseModal = false"
    />

  </div>
</template>

<style scoped>
.workout-container {
  min-height: 100vh;
  background-color: var(--bg-base);
  padding-bottom: 8rem;
}

.workout-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-md);
  background-color: var(--bg-card);
  position: sticky;
  top: 0;
  z-index: 100;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background-color: var(--red-transparent);
  border: 1px solid var(--red-error);
  border-radius: var(--radius-md);
  color: var(--red-error);
  font-family: var(--font-primary);
  font-weight: 600;
  cursor: pointer;
}

.add-exercise-btn {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-lg);
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  border-radius: var(--radius-md);
  color: var(--yellow-primary);
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 700;
  font-style: italic;
  cursor: pointer;
  text-transform: uppercase;
  margin-bottom: var(--spacing-sm);
}

.workout-title {
  font-size: 1.3rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
}

.timer {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
}

/* Exercises */
.exercises-list {
  padding: var(--spacing-md);
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
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-primary);
}

.ai-btn {
  padding: 0.5rem 1rem;
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  border-radius: var(--radius-md);
  color: var(--yellow-primary);
  font-size: 0.9rem;
  cursor: pointer;
}

/* Sets Table */
.sets-table {
  margin-bottom: var(--spacing-md);
}

.table-header,
.set-row {
  display: grid;
  grid-template-columns: 40px 80px 1fr 1fr 50px 30px;
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
  display: grid;
  grid-template-columns: 40px 80px 1fr 1fr 50px;
  gap: var(--spacing-xs);
  align-items: center;
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  transition: background-color 0.2s ease;
}

.previous-data {
  opacity: 0.5;
  font-size: 0.9rem;
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

.input-field:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.check-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
}

.check-btn.completed {
  background-color: var(--green-success);
  border-color: var(--green-success);
}

.check-btn:disabled {
  cursor: not-allowed;
}

.rest-timer {
  grid-column: 1 / -1;
  text-align: center;
  padding: var(--spacing-sm);
  background-color: var(--green-transparent);
  border-radius: var(--radius-sm);
  color: var(--green-success);
  font-weight: 600;
  margin-top: var(--spacing-xs);
}

.add-set-btn {
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

.exercise-actions {
  display: flex;
  gap: var(--spacing-xs);
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

.delete-set-btn:hover {
  color: var(--red-error);
}

/* Highlight only the row when completed */
.set-row.completed {
  background-color: rgba(0, 215, 114, 0.15);
}

/* Invalid input */
.input-invalid {
  border-color: var(--red-error) !important;
}

/* Check button - neutral by default */
.check-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: var(--text-primary);
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* Default hover - neutral */
.check-btn:hover:not(.completed):not(:disabled) {
  border-color: rgba(255, 255, 255, 0.5);
}

/* Valid set hover - green */
.check-btn.can-complete:hover:not(.completed) {
  background-color: var(--green-transparent);
  border-color: var(--green-success);
}

/* Invalid set hover - red */
.check-btn:not(.can-complete):hover:not(.completed) {
  background-color: var(--red-transparent);
  border-color: var(--red-error);
}

.check-btn.completed {
  background-color: var(--green-success);
  border-color: var(--green-success);
  cursor: not-allowed;
}

/* Rest timer active (yellow) */
.rest-timer.active {
  background-color: var(--yellow-transparent);
  border: 1px solid var(--yellow-primary);
  color: var(--yellow-primary);
  padding: var(--spacing-sm);
  border-radius: var(--radius-sm);
  text-align: center;
  font-weight: 600;
  margin-top: var(--spacing-xs);
}

/* Separator line when rest complete */
.set-separator {
  height: 2px;
  background: linear-gradient(
    to right,
    transparent,
    var(--green-success),
    transparent
  );
  margin: var(--spacing-xs) 0;
}


/* Rest input */
.rest-input-row {
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

.rest-input {
  width: 60px;
  padding: 0.25rem 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  text-align: center;
}

.duration-cell {
  grid-column: span 2;
  display: flex;
  gap: var(--spacing-xs);
  align-items: center;
}

.duration-cell input {
  flex: 1;
}

.duration-unit {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  white-space: nowrap;
}

.duration-header {
  grid-column: span 2;
}

.rest-time-input {
  width: 70px;
}

.finish-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: var(--spacing-md);
  background-color: var(--bg-card);
  border-top: 2px solid var(--green-success);
}

@media (max-width: 640px) {
  .table-header,
  .set-row {
    grid-template-columns: 30px 70px 1fr 1fr 40px;
    font-size: 0.85rem;
  }
}
</style>