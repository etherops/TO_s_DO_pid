const { defineConfig } = require('cypress')
const fs = require('fs').promises
const path = require('path')

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:8081',
        viewportWidth: 1280,
        viewportHeight: 720,
        video: false,
        screenshotOnRunFailure: true,
        defaultCommandTimeout: 2000,
        supportFile: 'cypress/support/e2e.js',
        chromeWebSecurity: false,
        watchForFileChanges: false,
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
                }
            })

            return config
        },
    },
})