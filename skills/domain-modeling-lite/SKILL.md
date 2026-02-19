---
name: "domain-modeling-lite"
description: "使用轻量级本地数据库实现领域建模自动化。当用户需要快速构建领域模型、管理实体关系，但不需要重型 RAG 系统时调用。"
---

# 领域建模自动化技能 (Domain Modeling Lite)

## 目的
提供一个简化的领域建模自动化方案，使用轻量级本地数据库（SQLite/JSON）存储和管理领域实体、关系及规则，避免 LightRAG/graphrag 等重型框架的复杂性。

## 何时使用

### ✅ 适用场景
- 需要快速原型验证领域模型
- 项目规模较小，不需要复杂的图查询
- 希望本地离线运行，无外部依赖
- 需要简单的 CRUD 操作和基础关系查询
- 资源受限环境（内存、CPU 有限）

### ❌ 不适用场景
- 需要复杂的图遍历和路径查询
- 需要语义搜索和向量相似度匹配
- 超大规模领域模型（>10 万实体）
- 需要分布式部署和高可用

## 核心架构

```
┌─────────────────────────────────────────────────────────┐
│                    领域建模自动化                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │  实体提取   │  │  关系推断   │  │   规则引擎      │ │
│  │  (Parser)   │  │  (Infer)    │  │   (Validator)   │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│         └────────────────┼───────────────────┘          │
│                          │                              │
│              ┌───────────▼───────────┐                  │
│              │   本地数据库层        │                  │
│              │  (SQLite / JSON)      │                  │
│              └───────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## 实现示例

### 1. 数据库 Schema 设计

```typescript
// domain-modeling-lite.ts
import Database from 'better-sqlite3';

// 领域实体表
interface DomainEntity {
  id: string;           // 实体唯一标识
  name: string;         // 实体名称
  description: string;  // 业务描述
  properties: string;   // JSON 字符串，存储属性列表
  lifecycle: string;    // JSON 字符串，存储状态流转
  createdAt: number;
  updatedAt: number;
}

// 实体关系表
interface EntityRelation {
  id: string;
  sourceEntityId: string;  // 源实体
  targetEntityId: string;  // 目标实体
  relationType: string;    // 1:1, 1:N, M:N
  description: string;
  metadata: string;        // JSON 字符串，额外信息
}

// 业务规则表
interface BusinessRule {
  id: string;
  entityId: string;
  ruleType: string;        // validation, constraint, invariant
  expression: string;      // 规则表达式
  errorMessage: string;
}

export class DomainModelingLite {
  private db: Database.Database;

  constructor(dbPath: string = ':memory:') {
    this.db = new Database(dbPath);
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

      CREATE INDEX IF NOT EXISTS idx_relations_source ON entity_relations(source_entity_id);
      CREATE INDEX IF NOT EXISTS idx_relations_target ON entity_relations(target_entity_id);
    `);
  }

  // ============ 实体操作 ============

  addEntity(entity: Omit<DomainEntity, 'createdAt' | 'updatedAt'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO domain_entities (id, name, description, properties, lifecycle)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      entity.id,
      entity.name,
      entity.description,
      entity.properties,
      entity.lifecycle
    );
  }

  getEntity(name: string): DomainEntity | undefined {
    const stmt = this.db.prepare('SELECT * FROM domain_entities WHERE name = ?');
    return stmt.get(name) as DomainEntity | undefined;
  }

  listEntities(): DomainEntity[] {
    const stmt = this.db.prepare('SELECT * FROM domain_entities ORDER BY name');
    return stmt.all() as DomainEntity[];
  }

  // ============ 关系操作 ============

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
  }

  getRelations(entityId: string): EntityRelation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entity_relations 
      WHERE source_entity_id = ? OR target_entity_id = ?
    `);
    return stmt.all(entityId, entityId) as EntityRelation[];
  }

  // ============ 规则操作 ============

  addRule(rule: Omit<BusinessRule, 'id'>): void {
    const id = `rule_${rule.entityId}_${Date.now()}`;
    const stmt = this.db.prepare(`
      INSERT INTO business_rules (id, entity_id, rule_type, expression, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, rule.entityId, rule.ruleType, rule.expression, rule.errorMessage);
  }

  // ============ 查询操作 ============

  /**
   * 获取实体的完整模型（包含关联实体和规则）
   */
  getFullModel(entityName: string): {
    entity: DomainEntity;
    relations: { relatedEntity: DomainEntity; relation: EntityRelation }[];
    rules: BusinessRule[];
  } | null {
    const entity = this.getEntity(entityName);
    if (!entity) return null;

    const relations = this.getRelations(entity.id);
    const rules = this.getEntityRules(entity.id);

    const relatedEntities = relations.map(rel => {
      const relatedId = rel.sourceEntityId === entity.id 
        ? rel.targetEntityId 
        : rel.sourceEntityId;
      const relatedEntity = this.db.prepare(
        'SELECT * FROM domain_entities WHERE id = ?'
      ).get(relatedId) as DomainEntity;

      return { relatedEntity, relation: rel };
    });

    return { entity, relations: relatedEntities, rules };
  }

  private getEntityRules(entityId: string): BusinessRule[] {
    const stmt = this.db.prepare(
      'SELECT * FROM business_rules WHERE entity_id = ?'
    );
    return stmt.all(entityId) as BusinessRule[];
  }

  // ============ 导出操作 ============

  exportToJSON(): string {
    const entities = this.listEntities();
    const relations = this.db.prepare(
      'SELECT * FROM entity_relations'
    ).all() as EntityRelation[];
    const rules = this.db.prepare(
      'SELECT * FROM business_rules'
    ).all() as BusinessRule[];

    return JSON.stringify({ entities, relations, rules }, null, 2);
  }

  close(): void {
    this.db.close();
  }
}
```

### 2. 领域模型解析器

```typescript
// domain-parser.ts

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
 * 从 TypeScript 接口/类定义中解析领域实体
 */
export function parseDomainEntities(sourceCode: string): ParsedEntity[] {
  const entities: ParsedEntity[] = [];
  
  // 匹配 interface 或 class 定义
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
    // 匹配属性：fieldName: Type 或 fieldName?: Type
    const propMatch = line.match(/(\w+)(\?)?:\s*(\w+(?:<[^>]+>)?)/);
    if (propMatch) {
      const [, fieldName, optional, type] = propMatch;
      
      // 判断是否为关系字段
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
```

### 3. 使用示例

```typescript
// example-usage.ts
import { DomainModelingLite } from './domain-modeling-lite.js';
import { parseDomainEntities } from './domain-parser.js';

async function main() {
  // 初始化数据库
  const modeler = new DomainModelingLite('./domain-model.db');

  // 示例：从代码中解析领域实体
  const sourceCode = `
    interface User {
      id: string;
      name: string;
      email: string;
      orders: Order[];
    }

    interface Order {
      id: string;
      userId: string;
      user: User;
      items: OrderItem[];
      status: OrderStatus;
    }

    interface OrderItem {
      id: string;
      orderId: string;
      productId: string;
      quantity: number;
    }
  `;

  const entities = parseDomainEntities(sourceCode);

  // 将解析结果存入数据库
  for (const entity of entities) {
    modeler.addEntity({
      id: `entity_${entity.name.toLowerCase()}`,
      name: entity.name,
      description: `${entity.name} 领域实体`,
      properties: JSON.stringify(entity.properties),
      lifecycle: JSON.stringify({ states: ['created', 'active', 'archived'] })
    });

    // 添加关系
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

  // 查询完整模型
  const orderModel = modeler.getFullModel('Order');
  console.log('Order 完整模型:', JSON.stringify(orderModel, null, 2));

  // 导出为 JSON
  const exported = modeler.exportToJSON();
  console.log('导出的领域模型:', exported);

  modeler.close();
}

main().catch(console.error);
```

### 4. JSON 存储方案（更轻量）

```typescript
// domain-modeling-json.ts

interface DomainModel {
  entities: Record<string, DomainEntity>;
  relations: Relation[];
  rules: Rule[];
}

export class DomainModelingJSON {
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

  addEntity(name: string, entity: DomainEntity): void {
    this.model.entities[name] = entity;
    this.save();
  }

  getEntity(name: string): DomainEntity | undefined {
    return this.model.entities[name];
  }

  addRelation(source: string, target: string, type: string): void {
    this.model.relations.push({ source, target, type });
    this.save();
  }

  queryRelations(entityName: string): Relation[] {
    return this.model.relations.filter(
      r => r.source === entityName || r.target === entityName
    );
  }
}
```

## 最佳实践

### DO ✅

1. **从现有代码提取** - 优先解析已有的 TypeScript 接口、类定义
2. **增量建模** - 先提取核心实体，再逐步补充关系和规则
3. **版本控制** - 将数据库文件纳入 Git 管理，便于追溯变更
4. **简单优先** - 从 JSON 方案开始，需要查询性能时再升级到 SQLite
5. **文档同步** - 在实体描述中记录业务含义，便于团队理解

### DON'T ❌

1. **不要过度设计** - 避免在原型阶段引入复杂的图数据库
2. **不要手动维护** - 尽量自动化从代码到模型的同步
3. **不要忽略验证** - 关键业务规则需要添加验证逻辑
4. **不要孤立建模** - 确保实体关系与实际业务流程一致

## 指令

### 快速开始

1. **选择存储方案**
   - 超轻量（<100 实体）：使用 JSON 方案
   - 轻量级（100-10000 实体）：使用 SQLite 方案

2. **提取领域实体**
   - 从 TypeScript 接口/类定义解析
   - 从 API 文档/需求文档提取

3. **建立关系**
   - 分析代码中的引用关系
   - 推断 1:1、1:N、M:N 关系

4. **添加规则**
   - 数据验证规则
   - 业务约束条件
   - 领域不变式

### 常用查询

```typescript
// 获取实体及其所有关联
const model = modeler.getFullModel('Order');

// 查找所有与某实体相关的关系
const relations = modeler.getRelations('entity_user');

// 导出模型用于分享或备份
const json = modeler.exportToJSON();
```

## 依赖项

```json
{
  "dependencies": {
    "better-sqlite3": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0"
  }
}
```

## 扩展方向

当项目增长需要更强大功能时，可考虑：

1. **添加全文搜索** - 使用 SQLite FTS5 扩展
2. **添加图查询** - 使用递归 CTE 实现路径查询
3. **添加版本管理** - 记录模型变更历史
4. **添加协作功能** - 支持多用户同时编辑
