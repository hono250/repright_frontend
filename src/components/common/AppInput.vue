<script setup>
defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const handleInput = (event) => {
  emit('update:modelValue', event.target.value)
}
</script>

<template>
  <div class="input-group">
    <label v-if="label" class="input-label">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="handleInput"
      class="input-field"
    />
  </div>
</template>

<style scoped>
.input-group {
  margin-bottom: var(--spacing-md);
  width: 100%;
}

.input-label {
  display: block;
  margin-bottom: var(--spacing-xs);
  font-size: 0.9rem;
  color: var(--text-primary);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-field {
  width: 100%;
  padding: var(--spacing-sm);
  background-color: var(--bg-card);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-family: var(--font-primary);
  font-size: 1rem;
  transition: border-color 0.2s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--yellow-primary);
}

.input-field::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

/* Responsive */
@media (max-width: 640px) {
  .input-field {
    padding: 0.75rem;
    font-size: 0.95rem;
  }
}
</style>