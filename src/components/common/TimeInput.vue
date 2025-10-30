<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number, // Seconds
    default: 0
  },
  disabled: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    default: 'MM:SS'
  }
})

const emit = defineEmits(['update:modelValue'])

// Display value in MM:SS format
const displayValue = ref('')

// Convert seconds to MM:SS
const secondsToMMSS = (seconds) => {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Convert MM:SS to seconds
const mmssToSeconds = (mmss) => {
  if (!mmss) return 0
  
  // Handle MM:SS format
  if (mmss.includes(':')) {
    const parts = mmss.split(':')
    const mins = parseInt(parts[0]) || 0
    const secs = parseInt(parts[1]) || 0
    return mins * 60 + secs
  }
  
  // Handle plain number
  const num = parseInt(mmss) || 0
  
  // If number is >= 100, treat as MMSS format (e.g., 200 = 2:00)
  if (num >= 100) {
    const mins = Math.floor(num / 100)
    const secs = num % 100
    return mins * 60 + secs
  }
  
  // Otherwise treat as seconds
  return num
}

// Initialize display value
displayValue.value = secondsToMMSS(props.modelValue)

// Watch for external changes
watch(() => props.modelValue, (newVal) => {
  displayValue.value = secondsToMMSS(newVal)
})

const handleInput = (event) => {
  let value = event.target.value.replace(/[^0-9]/g, '') // Remove non-digits
  
  if (value.length === 0) {
    displayValue.value = ''
    return
  }
  
  // Auto-format as user types
  if (value.length === 1) {
    // Single digit: just show it
    displayValue.value = value
  } else if (value.length === 2) {
    // Two digits: treat as seconds (e.g., "45")
    displayValue.value = value
  } else if (value.length === 3) {
    // Three digits: insert colon (e.g., "130" → "1:30")
    displayValue.value = value.slice(0, 1) + ':' + value.slice(1)
  } else {
    // Four+ digits: format as MM:SS (e.g., "0200" → "2:00")
    displayValue.value = value.slice(0, -2) + ':' + value.slice(-2)
  }
  
  // Update cursor position
  const input = event.target
  const cursorPos = input.selectionStart
  
  // If they just typed and colon was added, move cursor after colon
  setTimeout(() => {
    if (displayValue.value[cursorPos] === ':') {
      input.setSelectionRange(cursorPos + 1, cursorPos + 1)
    }
  }, 0)
}


// On blur, convert to seconds and reformat
const handleBlur = () => {
  let value = displayValue.value.replace(/[^0-9]/g, '')
  
  if (!value) {
    emit('update:modelValue', 0)
    displayValue.value = ''
    return
  }
  
  let seconds = 0
  
  if (value.length <= 2) {
    // Treat as seconds
    seconds = parseInt(value)
  } else {
    // Treat as MMSS
    const mins = parseInt(value.slice(0, -2))
    const secs = parseInt(value.slice(-2))
    seconds = mins * 60 + secs
  }
  
  emit('update:modelValue', seconds)
  displayValue.value = secondsToMMSS(seconds)
}


</script>

<template>
  <input
    :value="displayValue"
    @input="handleInput"
    @blur="handleBlur"
    :disabled="disabled"
    :placeholder="placeholder"
    class="time-input"
  />
</template>

<style scoped>
.time-input {
  width: 100%;
  padding: 0.5rem;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-family: var(--font-primary);
  text-align: center;
  font-size: 0.9rem;
}

.time-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.time-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}
</style>