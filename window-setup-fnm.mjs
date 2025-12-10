#!/usr/bin/env node

/**
 * Windows Setup Script for fnm (Fast Node Manager)
 * 
 * This script automates the setup of fnm for Windows PowerShell and Command Prompt (cmd.exe)
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const USER_HOME = homedir();
const POWERSHELL_PROFILE_5 = join(USER_HOME, 'Documents', 'WindowsPowerShell', 'Microsoft.PowerShell_profile.ps1');
const POWERSHELL_PROFILE_6 = join(USER_HOME, 'Documents', 'PowerShell', 'Microsoft.PowerShell_profile.ps1');
const CMD_INIT_FILE = join(USER_HOME, 'fnm_init.cmd');

console.log('🚀 Setting up fnm for Windows...\n');

// Check if fnm is installed
try {
  execSync('fnm --version', { stdio: 'ignore' });
  console.log('✅ fnm is installed');
} catch (error) {
  console.error('❌ fnm is not installed or not in PATH');
  console.error('   Please install fnm first using: choco install fnm');
  process.exit(1);
}

// Setup PowerShell profile
function setupPowerShell() {
  console.log('\n📝 Setting up PowerShell profile...');
  
  // Determine which PowerShell profile to use
  let profilePath = POWERSHELL_PROFILE_5;
  if (!existsSync(POWERSHELL_PROFILE_5) && existsSync(POWERSHELL_PROFILE_6)) {
    profilePath = POWERSHELL_PROFILE_6;
  }
  
  const fnmInitLine = 'fnm env --use-on-cd --corepack-enabled --shell powershell | Out-String | Invoke-Expression';
  
  // Check if already configured
  let profileContent = '';
  if (existsSync(profilePath)) {
    profileContent = readFileSync(profilePath, 'utf8');
    if (profileContent.includes('fnm env')) {
      console.log(`   ⚠️  PowerShell profile already contains fnm configuration`);
      console.log(`   📄 Profile location: ${profilePath}`);
      return;
    }
  } else {
    // Create directory if it doesn't exist
    const profileDir = join(profilePath, '..');
    if (!existsSync(profileDir)) {
      mkdirSync(profileDir, { recursive: true });
    }
  }
  
  // Append fnm configuration
  const newContent = profileContent 
    ? `${profileContent}\n\n# fnm (Fast Node Manager)\n${fnmInitLine}\n`
    : `# fnm (Fast Node Manager)\n${fnmInitLine}\n`;
  
  writeFileSync(profilePath, newContent, 'utf8');
  console.log(`   ✅ PowerShell profile configured`);
  console.log(`   📄 Profile location: ${profilePath}`);
}

// Setup Command Prompt (cmd.exe)
function setupCmd() {
  console.log('\n📝 Setting up Command Prompt (cmd.exe)...');
  
  // Create fnm_init.cmd file
  const cmdContent = `@echo off
:: for /F will launch a new instance of cmd so we create a guard to prevent an infinite loop
if not defined FNM_AUTORUN_GUARD (
    set "FNM_AUTORUN_GUARD=AutorunGuard"
    FOR /f "tokens=*" %%z IN ('fnm env --use-on-cd --corepack-enabled --shell cmd') DO CALL %%z
)
`;
  
  writeFileSync(CMD_INIT_FILE, cmdContent, 'utf8');
  console.log(`   ✅ Created initialization script: ${CMD_INIT_FILE}`);
  
  // Set up AutoRun in registry
  try {
    const regPath = 'HKCU\\Software\\Microsoft\\Command Processor';
    const currentAutoRun = execSync(`reg query "${regPath}" /v AutoRun 2>nul`, { encoding: 'utf8', stdio: 'pipe' }).trim();
    
    if (currentAutoRun.includes(CMD_INIT_FILE)) {
      console.log(`   ⚠️  AutoRun already configured`);
    } else {
      // Get existing AutoRun value if any
      let existingValue = '';
      try {
        const match = currentAutoRun.match(/AutoRun\s+REG_SZ\s+(.+)/);
        if (match) {
          existingValue = match[1].trim();
        }
      } catch (e) {
        // No existing AutoRun
      }
      
      // Combine with existing AutoRun if present
      const newAutoRun = existingValue 
        ? `${existingValue} & ${CMD_INIT_FILE}`
        : CMD_INIT_FILE;
      
      execSync(`reg add "${regPath}" /v AutoRun /t REG_SZ /d "${newAutoRun}" /f`, { stdio: 'ignore' });
      console.log(`   ✅ Configured AutoRun in registry`);
    }
  } catch (error) {
    console.log(`   ⚠️  Could not configure AutoRun automatically`);
    console.log(`   📝 Manual setup: Add this to registry:`);
    console.log(`      HKCU\\Software\\Microsoft\\Command Processor\\AutoRun`);
    console.log(`      Value: ${CMD_INIT_FILE}`);
  }
}

// Main execution
try {
  setupPowerShell();
  setupCmd();
  
  console.log('\n✨ Setup complete!');
  console.log('\n📋 Next steps:');
  console.log('   1. Open a new PowerShell window to test PowerShell setup');
  console.log('   2. Open a new Command Prompt window to test cmd.exe setup');
  console.log('   3. Run: fnm install <version> to install Node.js');
  console.log('   4. Run: fnm use <version> to switch Node.js versions');
  console.log('\n💡 Tip: Use "fnm install --lts" to install the latest LTS version');
} catch (error) {
  console.error('\n❌ Error during setup:', error.message);
  process.exit(1);
}

