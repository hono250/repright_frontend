<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../components/common/AppButton.vue'
import AppInput from '../components/common/AppInput.vue'

const router = useRouter()

// Form state
const isLogin = ref(true) // Toggle between login/register
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

// Toggle between login and register
const toggleMode = () => {
  isLogin.value = !isLogin.value
  error.value = ''
}

// Handle form submission
const handleSubmit = async () => {
  error.value = ''
  
  if (!username.value || !password.value) {
    error.value = 'Please fill in all fields'
    return
  }
  
  loading.value = true
  
  try {
    if (isLogin.value) {
      // LOGIN
      const response = await fetch('http://localhost:8000/api/UserAuthentication/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.value,
          password: password.value
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        error.value = data.error
      } else {
        // Store token
        localStorage.setItem('authToken', data.token)
        
        // Now authenticate to get userId
        const authResponse = await fetch('http://localhost:8000/api/UserAuthentication/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token })
        })
        
        const authData = await authResponse.json()
        
        if (authData.userId) {
          localStorage.setItem('userId', authData.userId)
          router.push('/home')
        } else {
          error.value = 'Authentication failed'
        }
      }
    } else {
      // REGISTER
      const response = await fetch('http://localhost:8000/api/UserAuthentication/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.value,
          password: password.value
        })
      })
      
      const data = await response.json()
      
      if (data.error) {
        error.value = data.error
      } else {
        // After register, store userId and auto-login
        localStorage.setItem('userId', data.userId)
        
        // Now login to get token
        const loginResponse = await fetch('http://localhost:8000/api/UserAuthentication/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.value,
            password: password.value
          })
        })
        
        const loginData = await loginResponse.json()
        
        if (loginData.token) {
          localStorage.setItem('authToken', loginData.token)
          router.push('/home')
        }
      }
    }
  } catch (err) {
    error.value = 'Connection error. Please try again.'
    console.error('Auth error:', err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- Logo -->
    <div class="logo-section">
      <img src="/logo.png" alt="RepRight Logo" class="logo" />
    </div>
    
    <!-- Form Card -->
    <div class="form-card">
      <!-- Tab Toggle -->
      <div class="tabs">
        <button 
          :class="['tab', { active: isLogin }]"
          @click="isLogin = true"
        >
          Login
        </button>
        <button 
          :class="['tab', { active: !isLogin }]"
          @click="isLogin = false"
        >
          Register
        </button>
      </div>
      
      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="form">
        <AppInput
          v-model="username"
          type="text"
          label="Username"
          placeholder="Enter username"
        />
        
        <AppInput
          v-model="password"
          type="password"
          label="Password"
          placeholder="Enter password"
        />
        
        <!-- Error message -->
        <p v-if="error" class="error-message">{{ error }}</p>
        
        <!-- Submit button -->
        <AppButton
          variant="primary"
          type="submit"
          :disabled="loading"
        >
          {{ loading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
        </AppButton>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-md);
  background-color: var(--bg-base);
}

.logo-section {
  margin-bottom: var(--spacing-xl);
  text-align: center;
}

.logo {
  width: 200px;
  height: auto;
  max-width: 80vw;
}

.form-card {
  width: 100%;
  max-width: 400px;
  background-color: var(--bg-card);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* Tabs */
.tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.tab {
  flex: 1;
  padding: var(--spacing-sm);
  background-color: transparent;
  border: none;
  border-bottom: 3px solid transparent;
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-primary);
  font-size: 1rem;
  font-weight: 700;
  font-style: italic;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab.active {
  color: var(--yellow-primary);
  border-bottom-color: var(--yellow-primary);
}

/* Form */
.form {
  display: flex;
  flex-direction: column;
}

.error-message {
  color: var(--red-error);
  font-size: 0.9rem;
  margin-bottom: var(--spacing-sm);
  text-align: center;
}

/* Responsive */
@media (max-width: 640px) {
  .logo {
    width: 150px;
  }
  
  .form-card {
    padding: var(--spacing-md);
  }
}
</style>