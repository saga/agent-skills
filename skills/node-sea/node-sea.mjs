#!/usr/bin/env node

/**
 * Node.js Single Executable Application (SEA) Builder
 * 
 * This script packages a Node.js application into a single executable file
 * that can run on systems without Node.js installed.
 * 
 * Requirements:
 * - Node.js v20.6.0 or later (v22 LTS recommended)
 * - postject npm package (installed automatically if needed)
 * 
 * Usage:
 *   node node-sea.mjs <entry-file> [options]
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeSEABuilder {
    constructor() {
        this.entryFile = null;
        this.outputName = null;
        this.useCodeCache = false;
        this.useSnapshot = false;
        this.assets = {};
        this.disableWarning = true;
    }

    /**
     * Parse command line arguments
     */
    parseArgs() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
            this.showUsage();
            process.exit(0);
        }

        this.entryFile = args[0];

        // Parse options
        for (let i = 1; i < args.length; i++) {
            const arg = args[i];
            switch (arg) {
                case '--output':
                case '-o':
                    this.outputName = args[++i];
                    break;
                case '--use-code-cache':
                    this.useCodeCache = true;
                    break;
                case '--use-snapshot':
                    this.useSnapshot = true;
                    break;
                case '--asset':
                case '-a':
                    const assetSpec = args[++i];
                    const [name, filePath] = assetSpec.split('=');
                    if (name && filePath) {
                        this.assets[name] = filePath;
                    }
                    break;
                case '--disable-warning':
                    this.disableWarning = true;
                    break;
                default:
                    if (arg.startsWith('-')) {
                        console.error(`Unknown option: ${arg}`);
                        this.showUsage();
                        process.exit(1);
                    }
            }
        }

        // Validate entry file
        if (!fs.existsSync(this.entryFile)) {
            console.error(`Error: Entry file not found: ${this.entryFile}`);
            process.exit(1);
        }

        // Default output name
        if (!this.outputName) {
            const basename = path.basename(this.entryFile, path.extname(this.entryFile));
            this.outputName = process.platform === 'win32' ? `${basename}.exe` : basename;
        }
    }

    /**
     * Show usage information
     */
    showUsage() {
        console.log('Node.js Single Executable Application (SEA) Builder');
        console.log('');
        console.log('Usage: node node-sea.mjs <entry-file> [options]');
        console.log('');
        console.log('Options:');
        console.log('  -o, --output <name>      Output executable name (default: entry-file name)');
        console.log('  --use-code-cache         Enable code cache for faster startup');
        console.log('  --use-snapshot           Enable snapshot for faster startup');
        console.log('  -a, --asset <name=path>  Add asset file (can be used multiple times)');
        console.log('  --disable-warning        Disable SEA experimental warning');
        console.log('  -h, --help               Show this help message');
        console.log('');
        console.log('Examples:');
        console.log('  node node-sea.mjs app.js');
        console.log('  node node-sea.mjs app.js -o myapp');
        console.log('  node node-sea.mjs app.js --use-code-cache');
        console.log('  node node-sea.mjs app.js -a config.json=./config.json -a data.db=./data.db');
        console.log('');
        console.log('Requirements:');
        console.log('  - Node.js v20.6.0 or later (v22 LTS recommended)');
        console.log('  - postject will be installed automatically if needed');
    }

    /**
     * Check Node.js version
     */
    checkNodeVersion() {
        const version = process.version;
        const major = parseInt(version.slice(1).split('.')[0]);
        
        if (major < 20) {
            console.error(`Error: Node.js v20.6.0 or later required. Current: ${version}`);
            process.exit(1);
        }
        
        console.log(`Node.js version: ${version}`);
    }

    /**
     * Ensure postject is installed
     */
    ensurePostject() {
        try {
            execSync('npx postject --version', { stdio: 'ignore' });
            console.log('postject is already available');
        } catch {
            console.log('Installing postject...');
            try {
                execSync('npm install -g postject', { stdio: 'inherit' });
            } catch (error) {
                console.log('Trying local installation of postject...');
                try {
                    execSync('npm install postject', { stdio: 'inherit' });
                } catch (localError) {
                    console.error('Failed to install postject:', localError.message);
                    process.exit(1);
                }
            }
        }
    }

    /**
     * Generate SEA configuration
     */
    generateConfig() {
        const config = {
            main: path.resolve(this.entryFile),
            output: path.resolve('sea-prep.blob'),
            disableExperimentalSEAWarning: this.disableWarning
        };

        if (this.useCodeCache) {
            config.useCodeCache = true;
        }

        if (this.useSnapshot) {
            config.useSnapshot = true;
        }

        if (Object.keys(this.assets).length > 0) {
            config.assets = {};
            for (const [name, filePath] of Object.entries(this.assets)) {
                config.assets[name] = path.resolve(filePath);
            }
        }

        const configPath = 'sea-config.json';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`Generated ${configPath}`);
        
        return configPath;
    }

    /**
     * Generate the blob
     */
    generateBlob(configPath) {
        console.log('Generating SEA blob...');
        try {
            execSync(`node --experimental-sea-config ${configPath}`, { stdio: 'inherit' });
        } catch (error) {
            console.error('Failed to generate blob:', error.message);
            process.exit(1);
        }
    }

    /**
     * Copy Node.js binary
     */
    copyNodeBinary() {
        console.log('Creating executable...');
        
        const nodePath = process.execPath;
        const outputPath = path.resolve(this.outputName);

        try {
            fs.copyFileSync(nodePath, outputPath);
            console.log(`Copied Node.js binary to ${this.outputName}`);
        } catch (error) {
            console.error('Failed to copy Node.js binary:', error.message);
            process.exit(1);
        }

        return outputPath;
    }

    /**
     * Get path to bundled codesign tool
     */
    getCodesignPath() {
        const bundledCodesign = path.resolve(__dirname, 'codesign.mjs');
        if (fs.existsSync(bundledCodesign)) {
            return bundledCodesign;
        }
        return null;
    }

    /**
     * Remove signature (Windows and macOS only)
     */
    removeSignature(outputPath) {
        const codesignPath = this.getCodesignPath();
        
        if (codesignPath) {
            console.log('Removing signature using bundled codesign tool...');
            try {
                execSync(`node "${codesignPath}" remove "${outputPath}"`, { stdio: 'inherit' });
            } catch {
                console.log('Signature removal completed with warnings');
            }
        } else {
            // Fallback to direct system commands
            if (process.platform === 'darwin') {
                console.log('Removing macOS signature...');
                try {
                    execSync(`codesign --remove-signature "${outputPath}"`, { stdio: 'ignore' });
                } catch {
                    console.log('No signature to remove or codesign not available');
                }
            } else if (process.platform === 'win32') {
                console.log('Removing Windows signature (if present)...');
                try {
                    execSync(`signtool remove /s "${outputPath}"`, { stdio: 'ignore' });
                } catch {
                    console.log('No signature to remove or signtool not available');
                }
            }
        }
    }

    /**
     * Inject blob into binary
     */
    injectBlob(outputPath) {
        console.log('Injecting blob into executable...');
        
        const blobPath = path.resolve('sea-prep.blob');
        const isWindows = process.platform === 'win32';
        
        let postjectCmd;
        if (isWindows) {
            postjectCmd = `npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
        } else if (process.platform === 'darwin') {
            postjectCmd = `npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA`;
        } else {
            postjectCmd = `npx postject ${outputPath} NODE_SEA_BLOB ${blobPath} --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2`;
        }

        try {
            execSync(postjectCmd, { stdio: 'inherit' });
        } catch (error) {
            console.error('Failed to inject blob:', error.message);
            process.exit(1);
        }
    }

    /**
     * Sign binary (optional, macOS and Windows only)
     */
    signBinary(outputPath) {
        const codesignPath = this.getCodesignPath();
        
        if (codesignPath) {
            console.log('Signing binary using bundled codesign tool...');
            try {
                execSync(`node "${codesignPath}" sign "${outputPath}"`, { stdio: 'inherit' });
            } catch {
                console.log('Signing completed with warnings');
            }
        } else {
            // Fallback to direct system commands
            if (process.platform === 'darwin') {
                console.log('Signing macOS binary...');
                try {
                    execSync(`codesign --sign - "${outputPath}"`, { stdio: 'ignore' });
                    console.log('Binary signed successfully');
                } catch {
                    console.log('Warning: Could not sign binary');
                }
            } else if (process.platform === 'win32') {
                console.log('Windows signing skipped (requires certificate)');
                console.log('The unsigned binary is still runnable');
            }
        }
    }

    /**
     * Clean up temporary files
     */
    cleanup() {
        try {
            if (fs.existsSync('sea-config.json')) {
                fs.unlinkSync('sea-config.json');
            }
            if (fs.existsSync('sea-prep.blob')) {
                fs.unlinkSync('sea-prep.blob');
            }
            console.log('Cleaned up temporary files');
        } catch (error) {
            console.log('Warning: Could not clean up all temporary files');
        }
    }

    /**
     * Run the build process
     */
    async run() {
        try {
            this.parseArgs();
            this.checkNodeVersion();
            this.ensurePostject();

            const configPath = this.generateConfig();
            this.generateBlob(configPath);
            const outputPath = this.copyNodeBinary();
            this.removeSignature(outputPath);
            this.injectBlob(outputPath);
            this.signBinary(outputPath);
            this.cleanup();

            console.log('');
            console.log('========================================');
            console.log('Build successful!');
            console.log('========================================');
            console.log(`Executable: ${path.resolve(this.outputName)}`);
            console.log('');
            console.log('Usage:');
            if (process.platform === 'win32') {
                console.log(`  .\\${this.outputName} [arguments]`);
            } else {
                console.log(`  ./${this.outputName} [arguments]`);
            }
            console.log('');
            console.log('Note: The executable can run on systems without Node.js installed');

        } catch (error) {
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Run if called directly
const isMainModule = import.meta.url.startsWith('file://') && 
    (process.argv[1].endsWith('node-sea.mjs') || 
     import.meta.url.includes(process.argv[1].replace(/\\/g, '/')));

if (isMainModule) {
    const builder = new NodeSEABuilder();
    builder.run();
}

export default NodeSEABuilder;
