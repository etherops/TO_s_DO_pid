#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const TEST_DIR = 'tests/cypress/e2e';
const DEFAULT_BATCH_COUNT = 4;
const CYPRESS_COMMAND = 'npx cypress run';

// Get batch count from command line arg or use default
const batchCount = parseInt(process.argv[2]) || DEFAULT_BATCH_COUNT;

console.log(`🚀 Running Cypress tests in ${batchCount} parallel batches\n`);

// Discover all test files
function discoverTestFiles() {
  const testFiles = fs.readdirSync(TEST_DIR)
    .filter(file => file.endsWith('.cy.js'))
    .map(file => path.join(TEST_DIR, file))
    .sort(); // Sort for consistent batching

  console.log(`📁 Found ${testFiles.length} test files:`);
  testFiles.forEach((file, i) => console.log(`   ${i + 1}. ${path.basename(file)}`));
  console.log('');

  return testFiles;
}

// Split files into batches
function createBatches(files, count) {
  const batches = Array.from({ length: count }, () => []);
  
  // Round-robin distribution for balanced batches
  files.forEach((file, index) => {
    batches[index % count].push(file);
  });

  // Filter out empty batches
  return batches.filter(batch => batch.length > 0);
}

// Generate cypress commands for each batch
function generateCommands(batches) {
  return batches.map((batch, index) => {
    const specList = batch.join(',');
    const command = `${CYPRESS_COMMAND} --spec "${specList}"`;
    
    console.log(`📦 Batch ${index + 1} (${batch.length} files):`);
    batch.forEach(file => console.log(`   - ${path.basename(file)}`));
    console.log(`   Command: ${command}\n`);
    
    return command;
  });
}

// Run commands using concurrently equivalent
function runConcurrently(commands) {
  console.log(`🏃 Starting ${commands.length} parallel processes...\n`);
  
  const results = [];
  const processes = commands.map((command, index) => {
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true
    });

    // Prefix output with batch number
    const prefix = `[${index}] `;
    
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => console.log(prefix + line));
    });
    
    child.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => console.error(prefix + line));
    });

    return child;
  });

  // Wait for all processes to complete (don't fail fast)
  return Promise.allSettled(processes.map((child, index) => 
    new Promise((resolve) => {
      child.on('close', (code) => {
        results[index] = { 
          batch: index + 1, 
          exitCode: code,
          success: code === 0 
        };
        resolve(code);
      });
    })
  )).then(() => results);
}

// Main execution
async function main() {
  try {
    const testFiles = discoverTestFiles();
    
    if (testFiles.length === 0) {
      console.log('❌ No test files found!');
      process.exit(1);
    }

    const batches = createBatches(testFiles, batchCount);
    const commands = generateCommands(batches);
    
    const startTime = Date.now();
    const results = await runConcurrently(commands);
    const duration = (Date.now() - startTime) / 1000;
    
    // Analyze results
    const failedBatches = results.filter(r => !r.success);
    const successfulBatches = results.filter(r => r.success);
    
    console.log(`\n📊 Test Execution Summary:`);
    console.log(`   Total time: ${duration.toFixed(1)}s`);
    console.log(`   Test files: ${testFiles.length}`);
    console.log(`   Batches: ${batches.length}`);
    console.log(`   ✅ Successful: ${successfulBatches.length}`);
    console.log(`   ❌ Failed: ${failedBatches.length}`);
    
    if (failedBatches.length > 0) {
      console.log(`\n❌ Failed batches:`);
      failedBatches.forEach(result => {
        console.log(`   Batch ${result.batch}: Exit code ${result.exitCode}`);
      });
      console.log(`\n❌ Overall test run FAILED`);
      process.exit(1);
    } else {
      console.log(`\n✅ All tests completed successfully!`);
    }
    
  } catch (error) {
    console.error(`\n❌ Test execution error: ${error.message}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received interrupt signal, shutting down...');
  process.exit(130);
});

// Run the script
main();