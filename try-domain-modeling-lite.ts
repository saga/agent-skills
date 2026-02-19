/**
 * 领域建模自动化技能 - 示例脚本
 * 
 * 演示如何使用轻量级本地数据库实现领域建模
 * 运行：npx tsx try-domain-modeling-lite.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ 模拟 better-sqlite3（避免实际依赖）============
// 实际使用时请安装：npm install better-sqlite3
// 并替换为：import Database from 'better-sqlite3';

class MockStatement {
  private db: MockDatabase;
  private sql: string;

  constructor(db: MockDatabase, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  run(...params: any[]): { lastInsertRowid: number } {
    console.log(`[SQL RUN] ${this.sql}`, params);
    return { lastInsertRowid: Date.now() };
  }

  get(...params: any[]): any {
    console.log(`[SQL GET] ${this.sql}`, params);
    if (this.sql.includes('domain_entities') && this.sql.includes('WHERE name')) {
      const name = params[0];
      return this.db.entities.find((e: any) => e.name === name);
    }
    return null;
  }

  all(...params: any[]): any[] {
    console.log(`[SQL ALL] ${this.sql}`, params);
    if (this.sql.includes('domain_entities')) {
      return this.db.entities || [];
    }
    if (this.sql.includes('entity_relations')) {
      return this.db.relations || [];
    }
    if (this.sql.includes('business_rules')) {
      return this.db.rules || [];
    }
    return [];
  }
}

class MockDatabase {
  entities: any[] = [];
  relations: any[] = [];
  rules: any[] = [];

  exec(sql: string): void {
    console.log(`[SQL EXEC] Schema initialized`);
  }

  prepare(sql: string): MockStatement {
    return new MockStatement(this, sql);
  }

  close(): void {
    console.log('[DB] Database closed');
  }
}

function createDatabase(path: string): any {
  console.log(`[DB] Connected to: ${path}`);
  return new MockDatabase();
}

// ============ 领域建模核心类 ============

interface DomainEntity {
  id: string;
  name: string;
  description: string;
  properties: string;
  lifecycle: string;
}

interface EntityRelation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string;
  description: string;
  metadata: string;
}

interface BusinessRule {
  id: string;
  entityId: string;
  ruleType: string;
  expression: string;
  errorMessage: string;
}

interface ParsedEntity {
  name: string;
  properties: Array<{ name: string; type: string; required: boolean }>;
  relationships: Array<{
    target: string;
    type: '1:1' | '1:N' | 'M:N';
    field: string;
  }>;
}

/**
 * 领域建模核心类
 */
class DomainModelingLite {
  private db: any;

  constructor(dbPath: string = ':memory:') {
    this.db = createDatabase(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        properties TEXT,
        lifecycle TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE TABLE IF NOT EXISTS entity_relations (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        description TEXT,
        metadata TEXT,
        FOREIGN KEY (source_entity_id) REFERENCES domain_entities(id),
        FOREIGN KEY (target_entity_id) REFERENCES domain_entities(id)
      );

      CREATE TABLE IF NOT EXISTS business_rules (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        rule_type TEXT NOT NULL,
        expression TEXT NOT NULL,
        error_message TEXT,
        FOREIGN KEY (entity_id) REFERENCES domain_entities(id)
      );
    `);
  }

  addEntity(entity: Omit<DomainEntity, 'createdAt' | 'updatedAt'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO domain_entities (id, name, description, properties, lifecycle)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(entity.id, entity.name, entity.description, entity.properties, entity.lifecycle);
    console.log(`✓ 实体已添加：${entity.name}`);
  }

  getEntity(name: string): DomainEntity | undefined {
    const stmt = this.db.prepare('SELECT * FROM domain_entities WHERE name = ?');
    return stmt.get(name);
  }

  listEntities(): DomainEntity[] {
    const stmt = this.db.prepare('SELECT * FROM domain_entities ORDER BY name');
    return stmt.all();
  }

  addRelation(relation: Omit<EntityRelation, 'id'>): void {
    const id = `rel_${relation.sourceEntityId}_${relation.targetEntityId}`;
    const stmt = this.db.prepare(`
      INSERT INTO entity_relations (id, source_entity_id, target_entity_id, relation_type, description, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      relation.sourceEntityId,
      relation.targetEntityId,
      relation.relationType,
      relation.description,
      relation.metadata
    );
    console.log(`✓ 关系已添加：${relation.sourceEntityId} -> ${relation.targetEntityId}`);
  }

  getRelations(entityId: string): EntityRelation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entity_relations 
      WHERE source_entity_id = ? OR target_entity_id = ?
    `);
    return stmt.all(entityId, entityId);
  }

  addRule(rule: Omit<BusinessRule, 'id'>): void {
    const id = `rule_${rule.entityId}_${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO business_rules (id, entity_id, rule_type, expression, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, rule.entityId, rule.ruleType, rule.expression, rule.errorMessage);
    console.log(`✓ 规则已添加：${rule.ruleType} for ${rule.entityId}`);
  }

  getEntityRules(entityId: string): BusinessRule[] {
    const stmt = this.db.prepare('SELECT * FROM business_rules WHERE entity_id = ?');
    return stmt.all(entityId);
  }

  getFullModel(entityName: string): any | null {
    const entity = this.getEntity(entityName);
    if (!entity) return null;

    const relations = this.getRelations(entity.id);
    const rules = this.getEntityRules(entity.id);

    return {
      entity,
      relations: relations.map(r => ({
        source: r.sourceEntityId,
        target: r.targetEntityId,
        type: r.relationType,
        description: r.description
      })),
      rules: rules.map(r => ({
        type: r.ruleType,
        expression: r.expression,
        errorMessage: r.errorMessage
      }))
    };
  }

  exportToJSON(): string {
    const entities = this.listEntities();
    const relations = this.db.prepare('SELECT * FROM entity_relations').all();
    const rules = this.db.prepare('SELECT * FROM business_rules').all();
    return JSON.stringify({ entities, relations, rules }, null, 2);
  }

  close(): void {
    this.db.close();
  }
}

/**
 * 从 TypeScript 接口/类定义中解析领域实体
 */
function parseDomainEntities(sourceCode: string): ParsedEntity[] {
  const entities: ParsedEntity[] = [];
  
  const entityRegex = /(interface|class)\s+(\w+)\s*\{([^}]+)\}/gs;
  let match: RegExpExecArray | null;

  while ((match = entityRegex.exec(sourceCode)) !== null) {
    const [, , name, body] = match;
    const entity = parseEntityBody(name, body);
    entities.push(entity);
  }

  return entities;
}

function parseEntityBody(name: string, body: string): ParsedEntity {
  const properties: ParsedEntity['properties'] = [];
  const relationships: ParsedEntity['relationships'] = [];

  const lines = body.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

  for (const line of lines) {
    const propMatch = line.match(/(\w+)(\?)?:\s*(\w+(?:<[^>]+>)?)/);
    if (propMatch) {
      const [, fieldName, optional, type] = propMatch;
      
      if (type.startsWith('Array<') || type.endsWith('[]')) {
        const targetType = type.replace(/Array<|>/g, '').replace('[]', '');
        relationships.push({
          target: targetType,
          type: '1:N',
          field: fieldName
        });
      } else if (type !== 'string' && type !== 'number' && type !== 'boolean' && type !== 'Date') {
        relationships.push({
          target: type,
          type: '1:1',
          field: fieldName
        });
      } else {
        properties.push({
          name: fieldName,
          type,
          required: !optional
        });
      }
    }
  }

  return { name, properties, relationships };
}

// ============ JSON 存储方案 ============

interface DomainModel {
  entities: Record<string, any>;
  relations: Array<{ source: string; target: string; type: string }>;
  rules: any[];
}

class DomainModelingJSON {
  private model: DomainModel;
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.model = this.load();
  }

  private load(): DomainModel {
    try {
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return { entities: {}, relations: [], rules: [] };
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.model, null, 2));
  }

  addEntity(name: string, entity: any): void {
    this.model.entities[name] = entity;
    this.save();
    console.log(`✓ [JSON] 实体已添加：${name}`);
  }

  getEntity(name: string): any {
    return this.model.entities[name];
  }

  addRelation(source: string, target: string, type: string): void {
    this.model.relations.push({ source, target, type });
    this.save();
    console.log(`✓ [JSON] 关系已添加：${source} -> ${target}`);
  }

  queryRelations(entityName: string): any[] {
    return this.model.relations.filter(
      r => r.source === entityName || r.target === entityName
    );
  }

  exportModel(): string {
    return JSON.stringify(this.model, null, 2);
  }
}

// ============ 主函数 ============

async function main() {
  console.log('='.repeat(60));
  console.log('领域建模自动化技能 - 示例演示');
  console.log('='.repeat(60));
  console.log();

  // ============ 示例 1: SQLite 方案 ============
  console.log('【示例 1】SQLite 方案');
  console.log('-'.repeat(40));

  const modeler = new DomainModelingLite('./domain-model.db');

  // 示例领域模型代码
  const sourceCode = `
    interface User {
      id: string;
      name: string;
      email: string;
      createdAt: Date;
      orders: Order[];
    }

    interface Order {
      id: string;
      userId: string;
      user: User;
      items: OrderItem[];
      status: OrderStatus;
      totalAmount: number;
    }

    interface OrderItem {
      id: string;
      orderId: string;
      productId: string;
      quantity: number;
      price: number;
    }

    interface Product {
      id: string;
      name: string;
      description: string;
      price: number;
      category: Category;
    }

    interface Category {
      id: string;
      name: string;
      parentCategory: Category;
    }
  `;

  console.log('\n📄 解析源代码中的领域实体...\n');
  const entities = parseDomainEntities(sourceCode);

  console.log('解析结果:');
  for (const entity of entities) {
    console.log(`  ${entity.name}:`);
    console.log(`    属性：${entity.properties.length} 个`);
    console.log(`    关系：${entity.relationships.length} 个`);
    for (const rel of entity.relationships) {
      console.log(`      - ${rel.type}: ${rel.target} (via ${rel.field})`);
    }
  }
  console.log();

  // 将解析结果存入数据库
  console.log('📦 将实体存入数据库...\n');
  for (const entity of entities) {
    modeler.addEntity({
      id: `entity_${entity.name.toLowerCase()}`,
      name: entity.name,
      description: `${entity.name} 领域实体 - 表示业务中的${entity.name}对象`,
      properties: JSON.stringify(entity.properties),
      lifecycle: JSON.stringify({ states: ['created', 'active', 'archived'] })
    });

    for (const rel of entity.relationships) {
      modeler.addRelation({
        sourceEntityId: `entity_${entity.name.toLowerCase()}`,
        targetEntityId: `entity_${rel.target.toLowerCase()}`,
        relationType: rel.type,
        description: `${entity.name} 通过 ${rel.field} 关联到 ${rel.target}`,
        metadata: JSON.stringify({ field: rel.field })
      });
    }
  }

  // 添加业务规则
  console.log('\n📋 添加业务规则...\n');
  modeler.addRule({
    entityId: 'entity_order',
    ruleType: 'validation',
    expression: 'totalAmount >= 0',
    errorMessage: '订单总金额不能为负数'
  });

  modeler.addRule({
    entityId: 'entity_orderitem',
    ruleType: 'constraint',
    expression: 'quantity > 0',
    errorMessage: '商品数量必须大于 0'
  });

  modeler.addRule({
    entityId: 'entity_user',
    ruleType: 'invariant',
    expression: 'email.includes("@")',
    errorMessage: '用户邮箱格式必须有效'
  });

  // 查询完整模型
  console.log('\n🔍 查询 Order 实体的完整模型:\n');
  const orderModel = modeler.getFullModel('Order');
  console.log(JSON.stringify(orderModel, null, 2));

  // 导出模型
  console.log('\n💾 导出领域模型为 JSON:\n');
  const exported = modeler.exportToJSON();
  console.log(exported);

  modeler.close();

  // ============ 示例 2: JSON 方案 ============
  console.log('\n' + '='.repeat(60));
  console.log('【示例 2】JSON 方案（更轻量）');
  console.log('-'.repeat(40));

  const jsonPath = path.join(__dirname, 'temp', 'domain-model.json');
  
  // 确保 temp 目录存在
  const tempDir = path.dirname(jsonPath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const jsonModeler = new DomainModelingJSON(jsonPath);

  console.log('\n📦 添加实体到 JSON 存储...\n');
  jsonModeler.addEntity('User', {
    description: '用户实体',
    properties: [
      { name: 'id', type: 'string', required: true },
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true }
    ]
  });

  jsonModeler.addEntity('Order', {
    description: '订单实体',
    properties: [
      { name: 'id', type: 'string', required: true },
      { name: 'userId', type: 'string', required: true },
      { name: 'totalAmount', type: 'number', required: true }
    ]
  });

  console.log('\n🔗 添加关系...\n');
  jsonModeler.addRelation('User', 'Order', '1:N');

  console.log('\n🔍 查询 User 相关关系:\n');
  const userRelations = jsonModeler.queryRelations('User');
  console.log(JSON.stringify(userRelations, null, 2));

  console.log('\n💾 JSON 文件已保存到:', jsonPath);

  console.log('\n' + '='.repeat(60));
  console.log('演示完成！');
  console.log('='.repeat(60));
  console.log('\n提示：');
  console.log('  - 实际使用时请安装：npm install better-sqlite3');
  console.log('  - 替换 MockDatabase 为真实的 Database 导入');
  console.log('  - JSON 方案无需额外依赖，直接可用');
}

main().catch(console.error);
