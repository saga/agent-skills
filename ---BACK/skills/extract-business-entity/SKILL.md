---
name: "extract-business-entity"
description: "从当前文档或指定文本中提取业务实体。当用户要求识别、提取或分析业务实体、其数据结构及领域模型关系时调用。"
---

# 业务实体提取技能 (Extract Business Entity Skill)

## 目的
识别并结构化文本中的核心业务对象，为领域驱动设计 (DDD)、数据库建模或系统集成提供基础依据。

## 存储功能

提取结果将自动保存到：
- **SQLite 数据库**: `data/business_entities.db`（如果安装了 better-sqlite3）
- **JSON 文件**: `data/entities/{source_hash}.json`（备选方案）

## 输出格式

### [实体名称]

- **业务说明**: 简述该实体在业务场景中的定义及核心价值。
- **关键属性**: 
  - 核心字段：[字段名] ([类型]) - [描述]
  - 唯一标识：[如 ID、Code 等]
- **生命周期/状态**: 该实体的核心状态流转（如：草稿、激活、已作废）。
- **关联关系**: 
  - [关联实体A]: [关系类型，如 1:N] - [业务逻辑描述]
- **数据流向**:
  - **来源 (Upstream)**: 数据产生的源头系统或输入动作。
  - **消费 (Downstream)**: 依赖此实体的后续流程或外部系统。
- **相关系统**: 管理或处理该实体的具体应用/服务。

## 指令

1. **多维识别**: 除了识别名词外，关注代码中的 Model/DTO 定义或文档中的业务术语。
2. **关系推断**: 如果文中提到"用户创建订单"，应自动推断并记录"用户"与"订单"的 1:N 关系。
3. **术语对齐**: 优先使用项目已有的命名规范（如已存在 Schema，则沿用其字段名）。
4. **缺省处理**: 未明确信息标记为"待确认"，基于逻辑推断的信息需注明"(推断)"。
5. **结果存储**: 提取完成后，使用 `save-extraction.mjs` 脚本保存结果到数据库或文件。

## 存储脚本

提取完成后，调用存储脚本保存结果：

```bash
node save-extraction.mjs --source "<source_file>" --output "<output_file>"
```

### 数据库表结构

```sql
CREATE TABLE business_entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_name TEXT NOT NULL,
    source_file TEXT,
    source_hash TEXT,
    business_description TEXT,
    attributes TEXT,  -- JSON
    lifecycle TEXT,   -- JSON
    relationships TEXT, -- JSON
    data_flow TEXT,   -- JSON
    related_systems TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entity_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity TEXT NOT NULL,
    target_entity TEXT NOT NULL,
    relationship_type TEXT NOT NULL,
    description TEXT,
    source_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 使用示例

### 通过 AI 助手调用

1. AI 助手读取文档内容
2. 按照 SKILL.md 格式提取业务实体
3. 调用 `save-extraction.mjs` 保存结果
4. 返回提取结果给用户

### 命令行调用

```bash
# 从文件提取并保存
node save-extraction.mjs --input document.md --output entities.json

# 查看已保存的实体
node save-extraction.mjs --list

# 按来源查询
node save-extraction.mjs --query "fidelity"
```
