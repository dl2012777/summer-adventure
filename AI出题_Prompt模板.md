# AI 出题 Prompt 模板 — 英语大冒险

**用途**: 用 AI 根据沪教版五年级英语知识点自动生成关卡题库  
**适用模型**: GPT-4 / Claude / DeepSeek 等支持 JSON 输出的 LLM  
**适用阶段**: 词汇闯关 / 语法迷宫 / Boss 关需要题库；听力题需配合 TTS 生成音频

---

## 核心 Prompt 模板

```
## 角色
你是一名小学英语教育游戏设计师，精通上海教育出版社五年级英语（沪教版/牛津上海版）的教材体系。

## 任务
根据给定的"单元知识点"，为一款面向五年级学生的 HTML5 教育小游戏生成题目。题目将用于每天的 25 分钟闯关游戏中。

## 输出格式
严格输出 JSON 数组，不要包含任何解释或 Markdown 标记。每个题目对象的结构如下：

### 词汇题 (vocabulary)
{
  "type": "vocabulary",
  "subtype": "image_select|en2cn|cn2en|spelling|match",
  "difficulty": "easy|medium|hard",
  "point_value": 100,
  "question": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": 0,         // 正确选项的索引 (0-3)
  "explanation": "简短解析（用于答错后显示）"
}

### 语法题 (grammar)
{
  "type": "grammar",
  "subtype": "fill_blank|reorder|error_fix|tense_judge",
  "difficulty": "easy|medium|hard",
  "point_value": 100,
  "question": "题目内容（填空用____表示）",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": 0,
  "explanation": "语法规则解释"
}

### Boss 关综合题 (boss)
{
  "type": "boss",
  "subtype": "mixed",
  "difficulty": "hard",
  "point_value": 100,
  "question": "题目内容",
  "options": ["选项A", "选项B", "选项C", "选项D"],
  "answer": 0,
  "explanation": "解析（含知识点回顾）",
  "time_limit": 15    // Boss 关每题限时 15 秒
}

## 评分规则（影响出题难度）
- 基础分: 100 分
- 难度系数: easy=1.0 / medium=1.5 / hard=2.0
- 速度系数: 1.0~1.3（系统自动计算）
- 连击系数: 1.0~1.5（系统自动计算）

## 出题原则
1. 每道题的 options 中正确答案必须只有一个
2. 干扰项要有迷惑性，不能一眼看出是错的
3. difficulty=hard 的题应考察易混知识点或需要推理
4. 题目语言：题干尽量用中文（降低读题门槛），选项用英文
5. 结合五年级学生的生活经验（学校、家庭、朋友、游戏等）
6. 对于听力类题型(如有)，在 question 中标注 [AUDIO] 并给出音频文本内容
7. 知识点要精确对应沪教版牛津英语教材内容，不要超纲
8. 难度分配：每关 easy:medium:hard = 4:3:3

---
```

---

## 各题型 Subtype 说明

### 词汇题 (vocabulary) 子类型

| subtype | 含义 | 示例 | difficulty 建议 |
|---------|------|------|----------------|
| `image_select` | 看图选词 | 🖼️ 苹果图片 → apple/banana/orange | easy |
| `en2cn` | 英译中 | delicious → 美味的/困难的/有趣的 | easy |
| `cn2en` | 中译英 | "图书馆" → library/hospital/school | medium |
| `spelling` | 拼写填空 | `_ p p _ _` → 输入 apple | hard |
| `match` | 词义配对 | 左列: food/drink/sport → 匹配图片 | medium |

### 语法题 (grammar) 子类型

| subtype | 含义 | 示例 | difficulty 建议 |
|---------|------|------|----------------|
| `fill_blank` | 选词填空 | She \_\_\_ a student. (is/am/are) | easy→medium |
| `reorder` | 排序成句 | is / cat / there / a → There is a cat. | medium |
| `error_fix` | 改错 | He go to school every day. → 选错并改 | hard |
| `tense_judge` | 时态判断 | He is playing football. → 哪个时态？ | medium |

---

## 实际使用示例

### 示例 1: Day 1 — 5A M1U1 My birthday

```
## 单元知识点
教材: 上海教育出版社 五年级上册 (5A) Module 1 Unit 1 — My birthday
词汇: 序数词 first, second, third, fourth, fifth, sixth, seventh, eighth, ninth, tenth
句型: When's your birthday? — It's on May 1st.
语法: 日期表达（月份+序数词）

## 题目要求
- 词汇题: 10 道 (easy×4 + medium×3 + hard×3)
- 语法题: 8 道 (easy×3 + medium×3 + hard×2)
- Boss 关: 3 道 (全部 hard，限时 15s/题)

请生成上述题目，严格按 JSON 数组格式输出。
```

### 示例 2: Day 26 — 5B M2U1-a Food and drinks

```
## 单元知识点
教材: 上海教育出版社 五年级下册 (5B) Module 2 Unit 1 — Food and drinks (Day 1)
词汇: some, any, a lot of, fruit, meat, vegetables, juice, milk, water, bread, rice
句型: Do we have any juice? — Yes, we have some. / No, we don't have any.
语法: some 用于肯定句，any 用于否定句和疑问句

## 题目要求
- 词汇题: 10 道 (easy×4 + medium×3 + hard×3)
- 语法题: 8 道 (easy×3 + medium×3 + hard×2)
- Boss 关: 3 道 (全部 hard，限时 15s/题)

请生成上述题目，严格按 JSON 数组格式输出。
```

---

## Day 1 完整出题示例（参考输出）

```json
[
  {
    "type": "vocabulary",
    "subtype": "en2cn",
    "difficulty": "easy",
    "point_value": 100,
    "question": "What does \"first\" mean?",
    "options": ["第一", "第二", "第三", "第四"],
    "answer": 0,
    "explanation": "first = 第一"
  },
  {
    "type": "vocabulary",
    "subtype": "cn2en",
    "difficulty": "medium",
    "point_value": 100,
    "question": "\"第五\" 用英语怎么说？",
    "options": ["fourth", "fifth", "sixth", "first"],
    "answer": 1,
    "explanation": "fifth = 第五"
  },
  {
    "type": "vocabulary",
    "subtype": "spelling",
    "difficulty": "hard",
    "point_value": 100,
    "question": "\"第三\" 的英语单词是 _ _ _ _",
    "options": ["therd", "third", "thrid", "tird"],
    "answer": 1,
    "explanation": "third (t-h-i-r-d) = 第三"
  },
  {
    "type": "grammar",
    "subtype": "fill_blank",
    "difficulty": "easy",
    "point_value": 100,
    "question": "When _____ your birthday?",
    "options": ["is", "am", "are", "be"],
    "answer": 0,
    "explanation": "your birthday 是第三人称单数，用 is"
  },
  {
    "type": "grammar",
    "subtype": "fill_blank",
    "difficulty": "medium",
    "point_value": 100,
    "question": "My birthday is _____ March 8th.",
    "options": ["in", "on", "at", "to"],
    "answer": 1,
    "explanation": "具体某一天用 on，on March 8th"
  },
  {
    "type": "grammar",
    "subtype": "error_fix",
    "difficulty": "hard",
    "point_value": 100,
    "question": "哪一处有错误？\"My birthday is in May 1st.\"",
    "options": ["My birthday", "is", "in", "May 1st"],
    "answer": 2,
    "explanation": "具体日期要用 on，不是 in。应该改为 \"on May 1st.\""
  },
  {
    "type": "boss",
    "subtype": "mixed",
    "difficulty": "hard",
    "point_value": 100,
    "question": "Tom: \"When's your birthday?\"  Lisa: \"It's _____ May 15th. I can't wait!\"",
    "options": ["in", "on", "at", "for"],
    "answer": 1,
    "explanation": "具体日期 + 月份用 on May 15th。\"I can't wait!\" 表示期待。"
  }
]
```

---

## 批量出题指令模板（一键生成一周题库）

```
## 任务
请根据以下一周的课程表，生成 Day {{DAY_START}} 到 Day {{DAY_END}} 的所有题目。
每天需包含:
- 词汇题 10 道
- 语法题 8 道  
- Boss 关 3 道

## 周课程表
{{WEEK_SCHEDULE}}

严格按 JSON 数组输出，不需要 Markdown 格式。
数据量可能较大，可分批输出，每次输出一天的题目。
```

### 使用这个模板时填入的内容示例

```
DAY_START: 1
DAY_END: 5

WEEK_SCHEDULE:
Day 1 - 5A M1U1 My birthday: 序数词 first~tenth, When's your birthday?, 日期表达
Day 2 - 5A M1U1 My birthday: 序数词 11th~31st, 完整生日句, invite/party
Day 3 - 5A M1U2 My way to school: by bus/car/bike/metro, on foot, How do you come to school?
Day 4 - 5A M1U3 My future: 职业词汇, What do you want to be? I want to be a...
Day 5 - Review M1: 全部 M1 词汇和句型混合复习
```

---

## 题库容量规划

| 周期 | 天数 | 每天题量 | 子题量 | 子题小计 |
|------|------|---------|--------|---------|
| 双日单元(7个×2天) | 14 天 | 21 题 | 词汇10+语法8+Boss3 | 294 题 |
| 单日单元(10个) | 10 天 | 21 题 | 同上 | 210 题 |
| 复习日(8个) | 8 天 | 21 题(混合) | 全题型混合 | 168 题 |
| 冲刺/Boss(8天) | 8 天 | 21~40 题 | Day40=40题 | 200 题 |
| **总计** | **40 天** | — | — | **~872 题** |

> **建议**: 实际生成时至少准备 1,000 道题，预留冗余和重做空间。

---

## 注意事项

1. **听力题暂未纳入 JSON 格式** — 听力需要 TTS 或真人录音配合，prompt 中可以标注 `[AUDIO]` 占位符，后续用 TTS 引擎生成。
2. **图片题暂用文字描述** — `image_select` 类型的题在 prompt 中用 `[IMAGE: 描述]` 标注，前端根据描述匹配对应图片资源。
3. **排序题 (reorder)** 前端需要拖拽交互，JSON 中给出乱序词数组：
   ```json
   {
     "type": "grammar",
     "subtype": "reorder",
     "words": ["is", "there", "cat", "a"],
     "answer": [2, 3, 1, 0]
   }
   ```
4. **每次生成后人工抽检** — 重点检查: 题目是否超纲、干扰项是否合理、答案是否正确。
