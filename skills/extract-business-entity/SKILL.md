---
name: "extract-business-entity"
description: "从当前文档或指定文本中提取业务实体，支持增量更新到现有Domain。当用户要求识别、提取、分析业务实体，或需要将新分析结果合并到已有Domain时调用。支持多次分析同一Domain并自动合并结果。"
---

# 业务实体提取技能 (Extract Business Entity Skill)

## 目的
识别并结构化文本中的核心业务对象，支持**增量式领域建模**——可将多次分析结果合并到同一Domain，持续丰富和完善领域模型。

## 核心能力

### 1. 实体提取
从各种来源（文档、代码、PRD等）提取业务实体及其属性、关系。

### 2. 增量更新 ⭐ NEW
支持将新提取的实体**合并**到现有Domain：
- 自动检测同名实体
- 智能合并属性
- 记录属性来源
- 标记冲突待确认

### 3. Domain版本管理 ⭐ NEW
- 每个Domain有独立的版本历史
- 每次合并自动创建新版本
- 支持版本对比和回滚

---

## 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                    增量式实体提取流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 读取输入材料                                               │
│     └─ 文档 / 代码 / PRD / 业务描述                            │
│                                                             │
│  2. 提取业务实体                                               │
│     └─ 识别实体、属性、关系、业务规则                           │
│                                                             │
│  3. 指定目标Domain                                            │
│     ├─ 新建Domain → 创建新领域                                 │
│     └─ 现有Domain → 合并到已有领域                             │
│                                                             │
│  4. 实体合并 (如Domain已存在)                                  │
│     ├─ 同名实体检测                                            │
│     ├─ 属性合并策略                                            │
│     ├─ 冲突标记                                                │
│     └─ 来源追溯                                                │
│                                                             │
│  5. 生成合并报告                                               │
│     ├─ 新增实体列表                                            │
│     ├─ 更新实体列表                                            │
│     ├─ 冲突列表 (需人工确认)                                    │
│     └─ 版本变更摘要                                            │
│                                                             │
│  6. 持久化存储                                                 │
│     ├─ 更新Domain定义                                          │
│     ├─ 记录来源材料                                            │
│     └─ 创建新版本                                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 使用方法

### 场景1: 创建新Domain

```
用户: 从这份文档提取业务实体，创建一个新的Domain叫"mutual-fund"

AI: 
1. 读取文档内容
2. 提取业务实体
3. 创建 domain: mutual-fund
4. 保存提取结果到 data/domains/mutual-fund/
5. 生成提取报告
```

### 场景2: 增量更新现有Domain ⭐

```
用户: 分析这份代码，将提取的实体合并到现有的"mutual-fund" Domain

AI:
1. 读取代码内容
2. 提取业务实体
3. 读取现有Domain: mutual-fund
4. 执行实体合并:
   - 检测同名实体 (如 MutualFund)
   - 合并属性 (保留原有 + 新增)
   - 标记冲突 (如属性类型不一致)
5. 生成合并报告
6. 保存更新后的Domain (新版本)
```

### 场景3: 查看Domain演化历史 ⭐

```
用户: 显示"mutual-fund" Domain的版本历史和变更记录

AI:
1. 读取Domain元数据
2. 列出所有版本
3. 显示版本间差异
4. 展示每次合并的来源材料
```

---

## 存储结构

```
skills/extract-business-entity/
├── SKILL.md
├── data/
│   └── domains/                      # Domain级别存储
│       └── {domain-name}/            # Domain目录
│           ├── domain.json           # Domain元数据
│           ├── entities/             # 实体定义
│           │   ├── {EntityName}.json
│           │   └── ...
│           ├── sources/              # 来源材料记录
│           │   └── {source-hash}.json
│           ├── versions/             # 版本历史
│           │   └── {version}.json
│           └── merges/               # 合并日志
│               └── {timestamp}-merge.json
```

### 实体文件格式

```json
{
  "name": "MutualFund",
  "domain": "mutual-fund",
  "version": "1.2.0",
  "description": "共同基金产品",
  "attributes": [
    {
      "name": "fundId",
      "type": "String",
      "description": "基金唯一标识",
      "sources": ["doc-a", "code-b"],
      "addedAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-20T14:30:00Z"
    }
  ],
  "relationships": [
    {
      "target": "Fee",
      "type": "1:N",
      "description": "基金关联多种费用",
      "sources": ["doc-a"]
    }
  ],
  "businessRules": [
    {
      "ruleId": "BR001",
      "description": "必须披露投资目标",
      "sources": ["doc-a"]
    }
  ],
  "sources": ["doc-a", "code-b"],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-20T14:30:00Z",
  "mergeHistory": [
    {
      "timestamp": "2024-01-20T14:30:00Z",
      "source": "code-b",
      "changes": ["新增属性: nav", "更新属性: riskLevel类型"]
    }
  ]
}
```

---

## 实体合并策略

### 策略1: 同名实体合并

当新提取的实体与现有Domain中的实体同名时：

| 情况 | 处理方式 |
|-----|---------|
| 属性名相同，类型相同 | 保留，合并来源标记 |
| 属性名相同，类型不同 | 标记冲突，保留两个版本 |
| 属性名不同 | 追加新属性 |
| 关系已存在 | 合并来源标记 |
| 关系不存在 | 追加新关系 |

### 策略2: 冲突标记

```json
{
  "conflicts": [
    {
      "entity": "MutualFund",
      "attribute": "riskLevel",
      "existing": { "type": "String", "source": "doc-a" },
      "incoming": { "type": "RiskLevel(enum)", "source": "code-b" },
      "status": "pending",
      "suggested": "使用枚举类型RiskLevel"
    }
  ]
}
```

### 策略3: 来源追溯

每个属性、关系、规则都记录来源：
- `sources`: 来源材料标识列表
- `addedAt`: 首次添加时间
- `updatedAt`: 最后更新时间

---

## 输出格式

### 提取报告

```markdown
# 业务实体提取报告

## 基本信息
- **Domain**: mutual-fund
- **操作类型**: 增量更新 (v1.1.0 → v1.2.0)
- **来源材料**: code-sample.ts
- **提取时间**: 2024-01-20 14:30:00

## 统计摘要
- 新提取实体: 3个
- 新增到Domain: 2个
- 合并更新: 1个
- 冲突待确认: 1个

## 新增实体

### FeeType (枚举)
- **来源**: code-sample.ts
- **值**: SALES_LOAD, FEE_12B1, MANAGEMENT_FEE

## 更新实体

### MutualFund
**新增属性**:
- `nav` (Money): 单位净值

**更新属性**:
- `riskLevel`: String → RiskLevel(枚举)

## 冲突列表 (需确认)

| 实体 | 属性 | 现有值 | 新值 | 建议 |
|-----|------|-------|------|------|
| MutualFund | riskLevel | String | RiskLevel枚举 | 使用枚举类型 |

## 完整Domain实体列表

当前Domain共有 7个实体:
1. MutualFund (核心实体)
2. Investor (核心实体)
3. Investment (核心实体)
4. Fee (支持实体)
5. Prospectus (支持实体)
6. Transaction (支持实体)
7. FeeType (枚举 - 新增)

## 下一步建议

1. 解决冲突: MutualFund.riskLevel 类型不一致
2. 运行 domain-modeling-engine 生成完整领域模型
3. 查看版本历史: 显示Domain演化过程
```

---

## 指令

1. **Domain识别**: 首先确认用户要创建新Domain还是更新现有Domain
2. **实体提取**: 从输入材料中提取所有业务实体、属性、关系、规则
3. **增量合并**: 如Domain已存在，执行智能合并:
   - 检测同名实体
   - 合并属性（保留来源标记）
   - 标记类型冲突
   - 追加新关系
4. **来源追溯**: 为每个元素记录来源材料标识
5. **版本管理**: 每次更新创建新版本，保留历史
6. **生成报告**: 输出提取摘要、变更列表、冲突待确认项
7. **持久化**: 按存储结构保存到文件系统

## 合并算法步骤

```
function mergeEntities(domainName, newEntities, sourceId):
    existingDomain = loadDomain(domainName)
    mergeLog = { added: [], updated: [], conflicts: [] }
    
    for newEntity in newEntities:
        existingEntity = findEntity(existingDomain, newEntity.name)
        
        if not existingEntity:
            # 新增实体
            newEntity.sources = [sourceId]
            saveEntity(domainName, newEntity)
            mergeLog.added.push(newEntity.name)
        else:
            # 合并实体
            result = mergeEntity(existingEntity, newEntity, sourceId)
            mergeLog.updated.push(result.updates)
            mergeLog.conflicts.push(result.conflicts)
            saveEntity(domainName, result.entity)
    
    newVersion = bumpVersion(existingDomain.version)
    saveDomainVersion(domainName, newVersion, mergeLog)
    
    return mergeLog
```

---

## 使用示例

### 示例1: 首次创建Domain

```
用户: 从fidelity-mutual-funds-overview.md提取实体，创建"mutual-fund" Domain

AI执行:
1. 读取文档
2. 提取7个实体: MutualFund, Investor, Investment, Fee, Prospectus, Transaction, FundEvaluator
3. 创建 data/domains/mutual-fund/
4. 保存实体到 entities/
5. 创建 v1.0.0 版本
6. 输出提取报告
```

### 示例2: 增量更新

```
用户: 分析这份新的基金交易代码，合并到mutual-fund Domain

AI执行:
1. 读取代码文件
2. 提取实体: Order, TradeExecution, Settlement
3. 检测到 Order 与现有 Transaction 可能相关
4. 合并:
   - 新增: Order, TradeExecution, Settlement
   - 更新: Transaction (添加executionDate属性)
5. 创建 v1.1.0 版本
6. 输出合并报告
```

### 示例3: 查看Domain状态

```
用户: 显示mutual-fund Domain的当前状态和版本历史

AI执行:
1. 读取 domain.json
2. 显示当前版本: v1.2.0
3. 显示实体统计: 10个实体
4. 显示版本历史:
   - v1.0.0: 初始创建 (7个实体)
   - v1.1.0: 添加交易相关 (3个实体)
   - v1.2.0: 添加费用明细 (2个实体)
5. 显示待解决冲突: 1个
```
