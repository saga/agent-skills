---
name: "extract-business-entity"
description: "从当前文档或指定文本中提取业务实体。当用户要求识别、提取或分析业务实体、其数据结构及领域模型关系时调用。"
---

# 业务实体提取技能 (Extract Business Entity Skill)

## 目的
识别并结构化文本中的核心业务对象，为领域驱动设计 (DDD)、数据库建模或系统集成提供基础依据。

## 存储功能

提取结果将自动保存为 **Markdown 文件** 到 `data/entities/` 目录：
- 文件名格式：`{source_hash}_entities.md`
- 支持 YAML frontmatter 元数据
- 可选 SQLite 数据库索引（需安装 better-sqlite3）

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
5. **结果存储**: 提取完成后，将结果保存为 Markdown 文件。

## 存储文件格式

生成的 Markdown 文件示例：

```markdown
---
source_file: "document.md"
source_hash: "a1b2c3d4e5f6"
extracted_at: "2024-01-15T10:30:00Z"
entity_count: 5
relationship_count: 8
---

# 业务实体提取报告

## 来源
- **文件**: document.md
- **提取时间**: 2024-01-15 10:30:00

---

## 实体列表

### [MutualFund]

- **业务说明**: 核心投资产品，汇集投资者资金进行多元化投资的金融工具。
- **关键属性**: 
  - 核心字段：fundId (String) - 基金唯一标识
  - 核心字段：fundName (String) - 基金名称
  - 唯一标识：fundId
- **生命周期/状态**: 筹备期 → 开放认购 → 运作中 → 清算
- **关联关系**: 
  - [Prospectus]: 1:1 - 每只基金必须有招募说明书
  - [Fee]: 1:N - 基金关联多种费用
- **数据流向**:
  - **来源**: 基金公司创建发行
  - **消费**: 投资者购买、Fund Evaluator评估
- **相关系统**: Fidelity Brokerage Services, FundsNetwork

---

### [Investor]

...
```

## 使用方式

### 通过 AI 助手调用

1. AI 助手读取文档内容
2. 按照 SKILL.md 格式提取业务实体
3. 将结果保存为 Markdown 文件到 `data/entities/` 目录
4. 返回提取结果给用户

### 存储位置

```
skills/extract-business-entity/
├── SKILL.md
├── data/
│   ├── entities/
│   │   ├── a1b2c3d4_entities.md    # 提取结果
│   │   └── e5f6g7h8_entities.md
│   └── entities.db                  # 可选数据库索引
```
