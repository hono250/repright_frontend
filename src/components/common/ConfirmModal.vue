<script setup>
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    default: 'Confirm'
  },
  message: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: 'Confirm'
  },
  confirmVariant: {
    type: String,
    default: 'primary' // or 'danger'
  },
  cancelText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <div v-if="show" class="modal-overlay" @click="$emit('cancel')">
    <div class="modal-content" @click.stop>
      <h2 class="modal-title">{{ title }}</h2>
      <p class="modal-message">{{ message }}</p>
      
      <div class="modal-actions">
        <button 
        v-if="cancelText && cancelText.length > 0"
        @click="$emit('cancel')" 
        class="modal-btn cancel-btn">
          {{ cancelText }}
        </button>
        <button 
          @click="$emit('confirm')" 
          :class="['modal-btn', `confirm-btn-${confirmVariant}`]"
        >
          {{ confirmText }}
        </button>
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
  z-index: 3000;
  padding: var(--spacing-md);
}

.modal-content {
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  max-width: 400px;
  width: 100%;
}

.modal-title {
  font-size: 1.3rem;
  font-weight: 700;
  font-style: italic;
  color: var(--yellow-primary);
  margin-bottom: var(--spacing-md);
}

.modal-message {
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--spacing-lg);
  line-height: 1.5;
}

.modal-actions {
  display: flex;
  gap: var(--spacing-sm);
}

.modal-btn {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 700;
  font-style: italic;
  text-transform: uppercase;
  cursor: pointer;
}

.cancel-btn {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.confirm-btn-primary {
  background-color: var(--green-success);
  color: var(--text-primary);
}

.confirm-btn-danger {
  background-color: var(--red-error);
  color: var(--text-primary);
}
</style>