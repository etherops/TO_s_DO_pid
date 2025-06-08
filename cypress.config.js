const { defineConfig } = require('cypress')
const fs = require('fs').promises
const path = require('path')

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:8081',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: false,
        defaultCommandTimeout: 2000,
        specPattern: 'tests/cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
        supportFile: 'tests/cypress/support/e2e.js',
        chromeWebSecurity: false,
        watchForFileChanges: false,
        testIsolation: true,
        setupNodeEvents(on, config) {
            on('task', {
                copyFile({ source, dest }) {
                    return fs.readFile(source, 'utf8')
                        .then(content => fs.writeFile(dest, content, 'utf8'))
                        .then(() => ({ success: true }))
                        .catch(error => {
                            console.error('File copy failed:', error)
                            return { success: false, error: error.message }
                        })
                },
                deleteFile(filePath) {
                    // Security safeguard: only delete fixture files in root directory
                    const normalizedPath = path.normalize(filePath)
                    const fileName = path.basename(normalizedPath)
                    const dirName = path.dirname(normalizedPath)
                    
                    // Check if file is in root directory (. or ./)
                    if (dirName !== '.' && dirName !== './') {
                        return Promise.resolve({ 
                            success: false, 
                            error: 'Can only delete files in root directory' 
                        })
                    }
                    
                    // Check if filename starts with 'fixture'
                    if (!fileName.startsWith('fixture')) {
                        return Promise.resolve({ 
                            success: false, 
                            error: 'Can only delete files starting with "fixture"' 
                        })
                    }
                    
                    return fs.unlink(filePath)
                        .then(() => ({ success: true }))
                        .catch(error => {
                            console.error('File deletion failed:', error)
                            return { success: false, error: error.message }
                        })
                }
            })

            return config
        },
    },
})