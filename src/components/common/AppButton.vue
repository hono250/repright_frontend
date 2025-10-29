<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary', // 'primary', 'secondary', 'danger'
    validator: (value) => ['primary', 'secondary', 'danger'].includes(value)
  },
  type: {
    type: String,
    default: 'button'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const buttonClass = computed(() => {
  return `btn btn-${props.variant}`
})
</script>

<template>
  <button 
    :class="buttonClass" 
    :type="type"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
/* Base button styles */
.btn {
  padding: var(--spacing-sm) var(--spacing-lg);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 700;
  font-style: italic;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Primary - Solid Green (Success actions) */
.btn-primary {
  background-color: var(--green-success);
  color: var(--text-primary);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Secondary - Transparent (Navigation) */
.btn-secondary {
  background-color: var(--green-transparent);
  color: var(--green-success);
  border: 1px solid var(--green-success);
}

.btn-secondary:hover:not(:disabled) {
  background-color: rgba(0, 215, 114, 0.2);
}

/* Danger - Solid Red (Destructive) */
.btn-danger {
  background-color: var(--red-error);
  color: var(--text-primary);
}

.btn-danger:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Responsive sizing */
@media (max-width: 640px) {
  .btn {
    padding: 0.75rem var(--spacing-md);
    font-size: 0.9rem;
  }
}
</style>