// Import commands
import './commands'
import '@4tw/cypress-drag-drop'
import 'cypress-real-events'

// Import helpers to make them globally available
import * as helpers from './helpers'

// Make helpers available globally
window.todoHelpers = helpers;