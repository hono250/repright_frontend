<template>
  <div class="app">
    <h1>💪 RepRight</h1>
    
    <!-- Navigation Tabs -->
    <div class="tabs">
      <button @click="currentView = 'log'" :class="{active: currentView === 'log'}">
        Log Workout
      </button>
      <button @click="currentView = 'progress'" :class="{active: currentView === 'progress'}">
        Progress & AI
      </button>
    </div>

    <!-- Log Workout View -->
    <div v-if="currentView === 'log'" class="log-section">
      <h2>Log Workout</h2>
      <input v-model="exercise" placeholder="Exercise (e.g., Bench Press)" />
      <input v-model.number="weight" type="number" placeholder="Weight (lbs)" />
      <input v-model.number="reps" type="number" placeholder="Reps" />
      <button @click="logSet">Log Set</button>
      
      <h3 style="margin-top: 2rem">Recent Sets</h3>
      <div v-if="sets.length === 0" class="empty">No sets logged yet</div>
      <div v-for="(set, i) in sets" :key="i" class="set-card">
        <strong>{{ set.exercise }}</strong>
        <span>{{ set.weight }}lbs × {{ set.reps }} reps</span>
        <small>{{ set.date }}</small>
      </div>
    </div>

    <!-- Progress View -->
    <div v-if="currentView === 'progress'" class="progress-section">
      <h2>AI Progress Analysis</h2>
      <div class="recommendation-card">
        <h3>⚠️ Plateau Detected</h3>
        <p><strong>Recommendation:</strong> Try 175lbs × 5 reps (deload)</p>
        <p><strong>Reasoning:</strong> You've been stuck at 185lbs for 4 sessions. A 10% deload will help you recover and break through.</p>
        <button>Accept Recommendation</button>
        <button style="opacity: 0.7">Dismiss</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const currentView = ref('log')
const exercise = ref('Bench Press')
const weight = ref(185)
const reps = ref(5)
const sets = ref([])

function logSet() {
  if (!exercise.value || !weight.value || !reps.value) {
    alert('Fill all fields!')
    return
  }
  
  sets.value.unshift({
    exercise: exercise.value,
    weight: weight.value,
    reps: reps.value,
    date: new Date().toLocaleString()
  })
  
  reps.value = ''
}
</script>

<style scoped>
.app {
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
  text-align: center;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.tabs button {
  flex: 1;
  opacity: 0.6;
}

.tabs button.active {
  opacity: 1;
  background: rgba(255, 215, 0, 0.25);
}

.log-section, .progress-section {
  margin: 2rem 0;
}

.log-section input {
  display: block;
  width: 100%;
}

.set-card, .recommendation-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.recommendation-card {
  background: var(--bg-card);
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid var(--yellow-bright);
}

.recommendation-card h3 {
  color: var(--yellow-bright);
}

.set-card {
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
}

.set-card small {
  color: var(--text-dim);
}

.empty {
  color: var(--text-dim);
  text-align: center;
  padding: 2rem;
}
</style>