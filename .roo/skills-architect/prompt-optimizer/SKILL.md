---
name: prompt-optimizer
description: Optimize prompts for Roo Code Architect mode with GPT-5.2 and high reasoning, specifically for investment management systems in European and APAC financial services
---

# Investment Management Prompt Optimizer

专门用于优化 Roo Code Architect 模式下的 prompt，充分利用 GPT-5.2 和 high reasoning 设置的能力。
针对**欧洲和亚太地区金融服务公司**的**投资管理领域**解决方案架构设计。

## 使用场景

- 投资管理系统架构设计（Portfolio Management, Risk Analytics, Trading Systems）
- 欧洲和亚太金融市场（GDPR, MiFID II, APRA, MAS, SFC等监管要求）
- Solution Architect 角色的深度架构分析
- 需要多方案对比和权衡决策的复杂场景

## Prompt 设计原则

### 1. 结构化思维引导
由于 reasoning 设置为 high，prompt 应当：
- 明确要求分步骤推理
- 提供清晰的问题分解框架
- 鼓励深度思考和多角度分析（技术 + 业务 + 合规）

### 2. 金融投资管理领域专业性
针对投资管理系统架构设计，prompt 应包含：
- 业务目标和监管合规要求（GDPR, MiFID II, APRA, MAS, SFC等）
- 技术栈偏好和金融行业标准（FIX, SWIFT, ISO 20022等）
- 可扩展性、高可用性（99.99% SLA）和灾备要求
- 安全性、数据隐私和审计追溯能力
- 实时性能要求（市场数据处理、交易执行延迟<100ms等）
- 多区域部署和数据本地化要求

### 3. GPT-5.2 高级推理能力利用
充分利用 GPT-5.2 的高级能力：
- 要求生成完整的架构决策文档和权衡分析
- 期待多种方案对比（技术 + 业务 + 合规维度）
- 利用其强大的金融领域知识和代码理解能力
- 要求深度分析监管合规和风险应对策略

## Prompt 模板

### 模板 1：投资组合管理系统架构设计

```
# 项目背景
- 业务领域：[Portfolio Management/Risk Analytics/Trading/Fund Accounting等]
- 目标市场：[欧洲/亚太/具体国家]
- 客户类型：[Asset Manager/Wealth Manager/Hedge Fund/Pension Fund等]
- 规模：[AUM金额、投资组合数量、资产类别]

# 监管和合规要求
- 欧洲：[GDPR, MiFID II, UCITS, AIFMD等]
- 亚太：[APRA (澳洲), MAS (新加坡), SFC (香港), FSA (日本)等]
- 数据本地化：[数据存储地域要求]
- 审计要求：[审计日志保留期限、不可篡改性等]

# 技术和性能要求
- 技术栈：[Java/C#/.NET, Python for analytics, Cloud (AWS/Azure/GCP)等]
- 市场数据：[实时行情处理量、延迟要求 <100ms]
- 计算规模：[投资组合数量、资产数量、每日计算量]
- 可用性：[99.99% SLA, RTO/RPO要求]
- 集成需求：[Bloomberg, Refinitiv, custodian banks, trading venues等]

# 架构设计任务
请作为 Investment Management Solution Architect 进行深度推理和分析：

1. **业务和监管分析**
   - 核心业务挑战识别（投资决策、风险管理、合规报告等）
   - 监管合规要点和技术实现策略
   - 跨区域部署的法律和技术风险

2. **架构方案设计**
   - 提供 2-3 种可行的架构方案（单体/微服务/事件驱动等）
   - 数据架构：OLTP vs OLAP, 时序数据库, Data Lake策略
   - 每种方案在合规性、性能、成本、运维复杂度上的对比
   - 推荐方案及金融行业实践依据

3. **详细设计**
   - 系统模块划分（前台/中台/后台系统边界）
   - 数据流设计（市场数据摄取、订单流、清算对账流程）
   - API 设计（RESTful vs GraphQL, FIX协议集成）
   - 安全架构（加密、身份认证、授权、网络隔离）
   - 技术选型理由（考虑金融行业成熟度和供应商支持）

4. **非功能性需求**
   - 高可用方案（多活数据中心、故障转移）
   - 灾备和业务连续性计划
   - 性能优化（缓存策略、计算优化、低延迟设计）
   - 可观测性（监控、告警、分布式追踪、审计日志）

5. **实施路径**
   - MVP 和分阶段实施计划（考虑监管审批周期）
   - 与现有系统的集成和迁移策略
   - 关键里程碑和风险应对
   - 测试策略（UAT, 压力测试, 灾备演练）

请充分运用你对金融投资管理行业的理解和推理能力，提供专业的分析。
```

### 模板 2：金融系统重构/优化

```
# 现有系统分析
- 系统类型：[Portfolio Management System/Risk Engine/Trading Platform等]
- 当前技术栈：[具体技术]
- 业务关键程度：[交易时段可用性要求、金额影响等]
- 问题症状：[性能问题/技术债/合规风险等]

# 重构目标
- 改进点：[性能/合规性/可审计性/可维护性等]
- 必须保持：[API契约、数据准确性、审计日志完整性]
- 约束：[监管审批要求、零停机部署、交易时段不可中断]

# 分析任务
请作为金融系统 Solution Architect 深度分析：

1. **问题诊断**
   - 当前架构的主要问题（性能瓶颈、合规风险、技术债等）
   - 对业务的影响评估（交易延迟、计算错误风险、合规风险）
   - 根因分析（数据库/网络/代码/架构层面）

2. **重构策略**
   - 推荐的重构模式（考虑金融行业最佳实践）
   - 灰度发布和蓝绿部署策略
   - 数据迁移方案（保证数据一致性和审计完整性）
   - 分步重构计划（避免影响交易时段）
   - 每步的风险评估和回滚预案

3. **技术实现**
   - 详细的代码/架构改进方案
   - 关键优化点（数据库索引、缓存、异步处理等）
   - 测试策略（单元/集成/压力测试）

4. **质量和合规保证**
   - 如何验证功能正确性（对账机制）
   - 性能对比预期（延迟、吞吐量）
   - 审计日志验证（确保监管可追溯性）
   - 安全评估和回滚策略

请进行全面的推理分析，确保方案满足金融行业的严格要求。
```

### 模板 3：金融技术选型

```
# 选型背景
- 项目类型：[Portfolio Analytics/Risk Management/Trading System等]
- 区域部署：[欧洲/新加坡/香港/澳洲/日本等]
- 监管要求：[具体监管框架和技术要求]
- 团队情况：[技术栈熟悉度/供应商支持需求]

# 待选技术
[例如：数据库(SQL/NoSQL/时序数据库)、消息中间件(Kafka/Solace)、
计算引擎(Spark/Flink)、云平台(AWS/Azure/GCP)等]

# 选型分析
请作为 Investment Management Solution Architect 进行深度分析：

1. **技术调研（金融行业视角）**
   - 每个候选技术的核心特点和金融行业应用案例
   - 监管合规性支持（审计、加密、数据驻留）
   - 金融机构采用情况和行业成熟度
   - 供应商稳定性和长期支持承诺

2. **多维度对比**
   - 性能：延迟、吞吐量、并发处理能力
   - 可靠性：可用性 SLA、故障恢复能力
   - 安全性：加密、访问控制、漏洞历史
   - 合规性：审计能力、数据本地化、认证（SOC2, ISO27001等）
   - 成本：许可费用、运维成本、云资源成本
   - 集成性：与金融行业标准系统的集成难易度
   - 长期维护成本和技术演进路线

3. **推荐方案**
   - 综合推荐结果（考虑短期和长期）
   - 决策依据详解（技术、业务、合规、成本）
   - 潜在风险预警（供应商锁定、技术过时风险等）
   - 备选方案（Plan B）

4. **实施路径**
   - PoC 验证计划（关键功能、性能基准测试）
   - 迁移策略（双写、分阶段切换）
   - 监管审批流程和时间规划
   - 培训计划和知识转移

请提供符合金融投资管理行业标准的专业建议。
```

## 优化技巧

### ✅ DO（推荐做法）

1. **提供充足的金融业务上下文**
   - AUM规模、资产类别、客户类型
   - 具体监管要求和合规框架
   - 数据规模和实时性要求
   
2. **明确非功能性需求**
   - 可用性SLA、RTO/RPO
   - 延迟要求（市场数据处理、交易执行）
   - 审计和数据保留要求

3. **要求结构化分析**
   - 分步骤推理和多方案对比
   - 权衡分析（技术 vs 业务 vs 合规）
   - 实施路径和风险评估

4. **考虑金融行业特性**
   - 现有系统集成（Bloomberg, custodians等）
   - 交易时段、清算窗口约束
   - 零停机部署和灾备要求
   - 供应商尽职调查

### ❌ DON'T（避免做法）

1. **问题过于宽泛**
   - ✗ "帮我设计一个投资管理系统"
   - ✓ "为管理€300B AUM的欧洲UCITS基金设计实时组合管理系统，需符合MiFID II和GDPR"

2. **忽略监管合规**
   - ✗ 只关注技术方案
   - ✓ 明确监管要求和合规实现策略

3. **不说明约束条件**
   - ✗ 不提及交易时段、零停机要求
   - ✓ 说明"交易时段99.99%可用性，非交易时段部署窗口"

4. **期待一步到位**
   - ✗ 要求完美方案
   - ✓ 要求MVP + 分阶段实施计划

## 金融领域关键术语

当你需要 Roo 理解投资管理场景时，在 prompt 中使用这些术语：

### 业务领域
- **投资管理**: Portfolio Management, Asset Management, Wealth Management
- **资产类别**: Equities, Fixed Income, Derivatives, Alternatives, Multi-Asset
- **系统类型**: OMS (Order Management), EMS (Execution Management), PMS (Portfolio Management), Fund Accounting
- **风险**: VaR (Value at Risk), Stress Testing, Scenario Analysis, Risk Attribution
- **性能**: Performance Attribution, Benchmark Analysis, Alpha/Beta, Sharpe Ratio
- **合规**: Pre-trade Compliance, Post-trade Surveillance, Regulatory Reporting, Best Execution

### 欧洲监管
- **MiFID II**: 交易报告、最佳执行、透明度要求
- **GDPR**: 数据隐私和保护
- **UCITS**: 基金监管（风险限额、NAV计算）
- **AIFMD**: 另类投资基金监管
- **EMIR**: 衍生品交易报告

### 亚太监管
- **APRA** (澳洲): 审慎监管
- **ASIC** (澳洲): 证券监管
- **MAS** (新加坡): 金融管理局
- **SFC** (香港): 证监会
- **HKMA** (香港): 金管局
- **FSA/JFSA** (日本): 金融厅

### 技术和集成
- **数据供应商**: Bloomberg, Refinitiv, FactSet, MSCI, S&P
- **托管银行**: State Street, BNY Mellon, Northern Trust, Citi
- **协议**: FIX Protocol, SWIFT, ISO 20022
- **平台**: SimCorp Dimension, Charles River IMS, Bloomberg AIM, Aladdin

### 技术架构
- **交易**: Low Latency, Smart Order Routing (SOR), Direct Market Access (DMA)
- **数据**: Market Data, Reference Data, Corporate Actions, Time-Series Database
- **计算**: Real-time Pricing, NAV Calculation, Portfolio Rebalancing
- **合规**: Audit Trail, Immutable Ledger, T+1/T+2 Settlement

## 实战示例

### 示例 1：欧洲资产管理公司PMS系统

**优化后的 Prompt：**
```
我需要为欧洲资产管理公司设计投资组合管理系统，请进行深度架构分析：

# 背景
- 客户：欧洲 UCITS 基金管理公司
- 规模：€300B AUM，5000+ 投资组合，覆盖股票、固收、衍生品
- 当前：遗留系统（C++），批处理为主，缺乏实时风险监控
- 目标：实时组合估值、风险分析（VaR, Stress Testing）、合规监控
- 区域：主站点伦敦，灾备法兰克福，Brexit后数据驻留要求

# 监管
- MiFID II：交易报告、最佳执行
- GDPR：客户数据保护、数据本地化
- UCITS：风险限额监控、NAV计算准确性
- 审计：7年日志保留，不可篡改

# 技术要求
- 技术栈：Java/Spring Boot 或 C#/.NET
- 云平台：AWS/Azure（欧洲区域）
- 集成：Bloomberg（市场数据）、MSCI（风险模型）、State Street（托管）
- 性能：EOD batch <2小时，实时风险<30秒，市场数据延迟<1秒
- 可用性：99.95% SLA，交易时段99.99%，RTO 1小时，RPO 15分钟

# 分析任务
请提供：
1. 业务领域建模和服务拆分策略
2. 数据架构（OLTP/OLAP分离、时序数据存储选型）
3. 关键业务流程设计（实时估值、订单管理、EOD批处理）
4. 非功能性架构（高可用、灾备、安全、监控）
5. 技术选型建议（消息中间件、计算引擎、数据库）
6. 实施和迁移路径（与遗留系统并行、监管审批）

请充分运用推理能力，分析每个决策点的权衡。
```

### 示例 2：亚太交易平台性能优化

**优化后的 Prompt：**
```
亚太电子交易平台市场波动时性能下降，需要优化方案：

# 系统
- 业务：股票/ETF交易执行平台（类Bloomberg EMSX）
- 区域：新加坡、香港、东京交易所
- 技术栈：Java/Spring Boot + PostgreSQL + Redis + Kafka
- 规模：峰值50,000订单/小时，200+并发交易员
- 监管：MAS要求交易报告延迟<1秒，订单时间戳精度到毫秒

# 问题
- 正常：订单响应<100ms ✓
- 波动时：响应5-10秒，市场数据延迟>2秒，部分订单超时 ✗

# 监控数据
- 60%延迟在数据库查询（持仓检查、合规验证）
- PostgreSQL慢查询、连接池耗尽、CPU 85%
- Redis命中率70%（期望95%+）
- Kafka lag 10秒
- JVM heap 90%，频繁GC

# 业务影响
- 最佳执行价格错失（MiFID II合规风险）
- 客户投诉、系统可靠性质疑

# 优化任务
请深度分析：
1. 根因诊断（数据库/Kafka/规则引擎/线程模型/内存）
2. 分层优化（数据库/缓存/消息/应用/架构）
3. 分阶段实施（Quick Wins/中期/长期，考虑交易时段约束）
4. 验证监控（性能测试、业务指标、合规验证）
5. 风险控制（回滚预案、灰度发布、灾备验证）

请提供可执行的优化路线图，确保满足金融系统可靠性和合规性要求。
```

## 关键提示

当使用此 skill 时：

1. **始终将监管合规作为第一优先级** - 技术方案必须满足合规要求
2. **强调审计追溯性** - 所有金融交易和数据变更必须可追溯
3. **考虑多区域复杂性** - 数据本地化、跨境传输的法律和技术约束
4. **重视业务连续性** - 高可用、灾备、零停机部署
5. **理解行业约束** - 交易时段、清算窗口、监管审批周期
6. **供应商尽职调查** - 评估长期支持和行业认可度

通过结构化、专业化的 prompt 设计，最大化发挥 Roo Code Architect + GPT-5.2 + High Reasoning 在金融投资管理系统架构设计中的价值。
