#!/usr/bin/env node

/**
 * Business Entity Extraction Storage Script
 * Saves extracted business entities to SQLite database or JSON files
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EntityStorage {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(__dirname, 'data', 'business_entities.db');
        this.db = null;
        this.useDatabase = false;
    }

    async init() {
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        try {
            const Database = (await import('better-sqlite3')).default;
            this.db = new Database(this.dbPath);
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS business_entities (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    entity_name TEXT NOT NULL,
                    source_file TEXT,
                    source_hash TEXT,
                    business_description TEXT,
                    attributes TEXT,
                    lifecycle TEXT,
                    relationships TEXT,
                    data_flow TEXT,
                    related_systems TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS entity_relationships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source_entity TEXT NOT NULL,
                    target_entity TEXT NOT NULL,
                    relationship_type TEXT NOT NULL,
                    description TEXT,
                    source_hash TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_entity_source ON business_entities(source_hash);
                CREATE INDEX IF NOT EXISTS idx_rel_source ON entity_relationships(source_hash);
            `);
            this.useDatabase = true;
            console.log(`Database initialized: ${this.dbPath}`);
            return true;
        } catch (error) {
            console.log(`Note: Database storage unavailable (${error.message}). Using JSON file storage.`);
            console.log(`To enable database storage: npm install better-sqlite3`);
            return false;
        }
    }

    generateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
    }

    async saveEntities(entities, sourceFile = null) {
        const sourceHash = sourceFile ? this.generateHash(sourceFile) : this.generateHash(JSON.stringify(entities));
        const savedEntities = [];
        const savedRelationships = [];

        for (const entity of entities) {
            const entityRecord = {
                entity_name: entity.name,
                source_file: sourceFile,
                source_hash: sourceHash,
                business_description: entity.description || '',
                attributes: JSON.stringify(entity.attributes || []),
                lifecycle: JSON.stringify(entity.lifecycle || {}),
                relationships: JSON.stringify(entity.relationships || []),
                data_flow: JSON.stringify(entity.dataFlow || {}),
                related_systems: JSON.stringify(entity.relatedSystems || []),
                created_at: new Date().toISOString()
            };

            if (this.useDatabase && this.db) {
                try {
                    const stmt = this.db.prepare(`
                        INSERT INTO business_entities 
                        (entity_name, source_file, source_hash, business_description, attributes, lifecycle, relationships, data_flow, related_systems)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `);
                    const result = stmt.run(
                        entityRecord.entity_name,
                        entityRecord.source_file,
                        entityRecord.source_hash,
                        entityRecord.business_description,
                        entityRecord.attributes,
                        entityRecord.lifecycle,
                        entityRecord.relationships,
                        entityRecord.data_flow,
                        entityRecord.related_systems
                    );
                    entityRecord.id = result.lastInsertRowid;
                } catch (error) {
                    console.error(`Database save error for entity ${entity.name}: ${error.message}`);
                }
            }

            savedEntities.push(entityRecord);

            if (entity.relationships && Array.isArray(entity.relationships)) {
                for (const rel of entity.relationships) {
                    const relRecord = {
                        source_entity: entity.name,
                        target_entity: rel.targetEntity || rel.entity,
                        relationship_type: rel.type || rel.relationshipType || 'unknown',
                        description: rel.description || '',
                        source_hash: sourceHash,
                        created_at: new Date().toISOString()
                    };

                    if (this.useDatabase && this.db) {
                        try {
                            const stmt = this.db.prepare(`
                                INSERT INTO entity_relationships 
                                (source_entity, target_entity, relationship_type, description, source_hash)
                                VALUES (?, ?, ?, ?, ?)
                            `);
                            stmt.run(
                                relRecord.source_entity,
                                relRecord.target_entity,
                                relRecord.relationship_type,
                                relRecord.description,
                                relRecord.source_hash
                            );
                        } catch (error) {
                            console.error(`Database save error for relationship: ${error.message}`);
                        }
                    }

                    savedRelationships.push(relRecord);
                }
            }
        }

        const jsonPath = path.join(path.dirname(this.dbPath), 'entities', `${sourceHash}.json`);
        const jsonDir = path.dirname(jsonPath);
        if (!fs.existsSync(jsonDir)) {
            fs.mkdirSync(jsonDir, { recursive: true });
        }
        fs.writeFileSync(jsonPath, JSON.stringify({
            source_file: sourceFile,
            source_hash: sourceHash,
            entities: savedEntities,
            relationships: savedRelationships,
            saved_at: new Date().toISOString()
        }, null, 2), 'utf8');
        console.log(`Saved to JSON: ${jsonPath}`);

        return {
            success: true,
            storage: this.useDatabase ? 'database+json' : 'json',
            sourceHash,
            entityCount: savedEntities.length,
            relationshipCount: savedRelationships.length,
            jsonPath
        };
    }

    async listEntities(limit = 50) {
        if (this.useDatabase && this.db) {
            const stmt = this.db.prepare('SELECT * FROM business_entities ORDER BY created_at DESC LIMIT ?');
            return stmt.all(limit);
        }

        const entitiesDir = path.join(path.dirname(this.dbPath), 'entities');
        if (!fs.existsSync(entitiesDir)) return [];

        const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.json'));
        const allEntities = [];
        
        for (const file of files.slice(0, limit)) {
            const content = JSON.parse(fs.readFileSync(path.join(entitiesDir, file), 'utf8'));
            allEntities.push(...(content.entities || []));
        }

        return allEntities;
    }

    async queryEntities(searchTerm) {
        if (this.useDatabase && this.db) {
            const stmt = this.db.prepare(`
                SELECT * FROM business_entities 
                WHERE entity_name LIKE ? OR business_description LIKE ? OR source_file LIKE ?
                ORDER BY created_at DESC
            `);
            const pattern = `%${searchTerm}%`;
            return stmt.all(pattern, pattern, pattern);
        }

        const entitiesDir = path.join(path.dirname(this.dbPath), 'entities');
        if (!fs.existsSync(entitiesDir)) return [];

        const files = fs.readdirSync(entitiesDir).filter(f => f.endsWith('.json'));
        const results = [];
        const lowerSearch = searchTerm.toLowerCase();

        for (const file of files) {
            const content = JSON.parse(fs.readFileSync(path.join(entitiesDir, file), 'utf8'));
            const matches = (content.entities || []).filter(e => 
                (e.entity_name || '').toLowerCase().includes(lowerSearch) ||
                (e.business_description || '').toLowerCase().includes(lowerSearch) ||
                (e.source_file || '').toLowerCase().includes(lowerSearch)
            );
            results.push(...matches);
        }

        return results;
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        input: null,
        output: null,
        source: null,
        list: false,
        query: null,
        entities: null
    };

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--input' || args[i] === '-i') {
            options.input = args[++i];
        } else if (args[i] === '--output' || args[i] === '-o') {
            options.output = args[++i];
        } else if (args[i] === '--source' || args[i] === '-s') {
            options.source = args[++i];
        } else if (args[i] === '--list' || args[i] === '-l') {
            options.list = true;
        } else if (args[i] === '--query' || args[i] === '-q') {
            options.query = args[++i];
        } else if (args[i] === '--entities' || args[i] === '-e') {
            options.entities = args[++i];
        }
    }

    return options;
}

function showUsage() {
    console.log('Usage: node save-extraction.mjs [options]');
    console.log('');
    console.log('Options:');
    console.log('  --input, -i <file>     Input file containing entity extraction results');
    console.log('  --output, -o <file>    Output JSON file path');
    console.log('  --source, -s <file>    Source document file path');
    console.log('  --entities, -e <json>  Entity data as JSON string');
    console.log('  --list, -l             List all saved entities');
    console.log('  --query, -q <term>     Search entities by term');
    console.log('');
    console.log('Examples:');
    console.log('  node save-extraction.mjs --input entities.json --source document.md');
    console.log('  node save-extraction.mjs --list');
    console.log('  node save-extraction.mjs --query "fidelity"');
}

async function main() {
    const options = parseArgs();

    if (process.argv.length <= 2) {
        showUsage();
        process.exit(0);
    }

    const storage = new EntityStorage();
    await storage.init();

    try {
        if (options.list) {
            const entities = await storage.listEntities();
            console.log('\n=== Saved Business Entities ===\n');
            entities.forEach((e, i) => {
                console.log(`${i + 1}. ${e.entity_name}`);
                console.log(`   Source: ${e.source_file || 'N/A'}`);
                console.log(`   Description: ${(e.business_description || '').substring(0, 100)}...`);
                console.log('');
            });
            console.log(`Total: ${entities.length} entities`);
        } else if (options.query) {
            const entities = await storage.queryEntities(options.query);
            console.log(`\n=== Search Results for "${options.query}" ===\n`);
            entities.forEach((e, i) => {
                console.log(`${i + 1}. ${e.entity_name}`);
                console.log(`   Source: ${e.source_file || 'N/A'}`);
                console.log('');
            });
            console.log(`Found: ${entities.length} entities`);
        } else if (options.input || options.entities) {
            let entities;
            
            if (options.input) {
                const content = fs.readFileSync(options.input, 'utf8');
                entities = JSON.parse(content);
                if (entities.entities) {
                    entities = entities.entities;
                }
            } else if (options.entities) {
                entities = JSON.parse(options.entities);
            }

            if (!Array.isArray(entities)) {
                console.error('Error: Entity data must be an array');
                process.exit(1);
            }

            const result = await storage.saveEntities(entities, options.source);
            console.log('\n=== Save Result ===');
            console.log(`Storage: ${result.storage}`);
            console.log(`Source Hash: ${result.sourceHash}`);
            console.log(`Entities Saved: ${result.entityCount}`);
            console.log(`Relationships Saved: ${result.relationshipCount}`);
            console.log(`JSON Path: ${result.jsonPath}`);

            if (options.output) {
                fs.writeFileSync(options.output, JSON.stringify(entities, null, 2), 'utf8');
                console.log(`Output: ${options.output}`);
            }
        } else {
            showUsage();
        }
    } finally {
        storage.close();
    }
}

const isMainModule = typeof process.argv[1] === 'string' && 
    import.meta.url.startsWith('file://') && 
    (process.argv[1].endsWith('save-extraction.mjs') || 
     import.meta.url.includes(process.argv[1].replace(/\\/g, '/')));

if (isMainModule) {
    main().catch(console.error);
}

export default EntityStorage;
