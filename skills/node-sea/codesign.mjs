#!/usr/bin/env node

/**
 * Cross-platform code signing utility for Node.js SEA
 * 
 * This script provides a unified interface for code signing across platforms:
 * - macOS: Uses native codesign command
 * - Windows: Uses signtool (if available)
 * - Linux: No-op (no standard signing mechanism)
 * 
 * Usage:
 *   node codesign.mjs remove <binary-path>
 *   node codesign.mjs sign <binary-path>
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const platform = process.platform;

function showUsage() {
    console.log('Cross-platform code signing utility for Node.js SEA');
    console.log('');
    console.log('Usage:');
    console.log('  node codesign.mjs remove <binary-path>  Remove code signature');
    console.log('  node codesign.mjs sign <binary-path>    Add code signature');
    console.log('  node codesign.mjs verify <binary-path>  Verify code signature');
    console.log('');
    console.log('Platform-specific behavior:');
    console.log('  macOS: Uses native codesign command');
    console.log('  Windows: Uses signtool (if available in PATH or Windows SDK)');
    console.log('  Linux: No-op (no standard code signing)');
}

function findSigntool() {
    // Try to find signtool in common Windows SDK locations
    const programFiles = process.env['ProgramFiles(x86)'] || process.env['ProgramFiles'];
    const windowsKits = path.join(programFiles, 'Windows Kits', '10', 'bin');
    
    if (fs.existsSync(windowsKits)) {
        // Find the latest version
        const versions = fs.readdirSync(windowsKits)
            .filter(dir => /^10\.\d+\.\d+\.\d+$/.test(dir))
            .sort().reverse();
        
        for (const version of versions) {
            const signtoolPath = path.join(windowsKits, version, 'x64', 'signtool.exe');
            if (fs.existsSync(signtoolPath)) {
                return signtoolPath;
            }
        }
    }
    
    // Try PATH
    try {
        execSync('where signtool', { stdio: 'ignore' });
        return 'signtool';
    } catch {
        return null;
    }
}

function removeSignature(binaryPath) {
    console.log(`Removing signature from ${binaryPath}...`);
    
    if (platform === 'darwin') {
        try {
            execSync(`codesign --remove-signature "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Signature removed successfully');
            return true;
        } catch (error) {
            console.log('No signature to remove or codesign not available');
            return false;
        }
    } else if (platform === 'win32') {
        const signtool = findSigntool();
        if (!signtool) {
            console.log('signtool not found, skipping signature removal');
            return false;
        }
        
        try {
            execSync(`"${signtool}" remove /s "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Signature removed successfully');
            return true;
        } catch (error) {
            console.log('No signature to remove or removal failed');
            return false;
        }
    } else {
        console.log('Linux does not use code signing, skipping');
        return true;
    }
}

function signBinary(binaryPath) {
    console.log(`Signing ${binaryPath}...`);
    
    if (platform === 'darwin') {
        try {
            // Use ad-hoc signing (- means ad-hoc identity)
            execSync(`codesign --sign - "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Binary signed successfully');
            return true;
        } catch (error) {
            console.error('Failed to sign binary:', error.message);
            return false;
        }
    } else if (platform === 'win32') {
        const signtool = findSigntool();
        if (!signtool) {
            console.log('signtool not found, skipping signing');
            console.log('Note: The unsigned binary is still runnable on Windows');
            return false;
        }
        
        try {
            execSync(`"${signtool}" sign /fd SHA256 "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Binary signed successfully');
            return true;
        } catch (error) {
            console.error('Failed to sign binary:', error.message);
            console.log('Note: A certificate is required for Windows signing');
            return false;
        }
    } else {
        console.log('Linux does not use code signing, skipping');
        return true;
    }
}

function verifySignature(binaryPath) {
    console.log(`Verifying signature of ${binaryPath}...`);
    
    if (platform === 'darwin') {
        try {
            execSync(`codesign --verify "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Signature verified successfully');
            return true;
        } catch (error) {
            console.log('Signature verification failed or no signature present');
            return false;
        }
    } else if (platform === 'win32') {
        const signtool = findSigntool();
        if (!signtool) {
            console.log('signtool not found, cannot verify');
            return false;
        }
        
        try {
            execSync(`"${signtool}" verify /pa "${binaryPath}"`, { stdio: 'inherit' });
            console.log('Signature verified successfully');
            return true;
        } catch (error) {
            console.log('Signature verification failed or no signature present');
            return false;
        }
    } else {
        console.log('Linux does not use code signing');
        return true;
    }
}

function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2 || args.includes('--help') || args.includes('-h')) {
        showUsage();
        process.exit(0);
    }
    
    const command = args[0];
    const binaryPath = path.resolve(args[1]);
    
    if (!fs.existsSync(binaryPath)) {
        console.error(`Error: Binary not found: ${binaryPath}`);
        process.exit(1);
    }
    
    switch (command) {
        case 'remove':
            removeSignature(binaryPath);
            break;
        case 'sign':
            signBinary(binaryPath);
            break;
        case 'verify':
            verifySignature(binaryPath);
            break;
        default:
            console.error(`Unknown command: ${command}`);
            showUsage();
            process.exit(1);
    }
}

main();
