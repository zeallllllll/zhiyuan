# 数据来源

本目录保存用于生成前端数据的官方公开 PDF。

- `shmeea-2025-pudong-mingedaqu.pdf`
  - 上海市教育考试院：《2025年上海市高中学校“名额分配到区”招生录取最低分数线（浦东新区）》
  - https://www.shmeea.edu.cn/download/20250714/1/11.pdf

- `shmeea-2024-pudong-mingedaqu.pdf`
  - 上海市教育考试院：《2024年上海市高中学校“名额分配到区”招生录取最低分数线（浦东新区）》
  - https://www.shmeea.edu.cn/download/20240715/00/310115.pdf

- `shmeea-2023-pudong-mingedaqu.pdf`
  - 上海市教育考试院：《2023年上海市高中学校“名额分配到区”招生录取最低分数线（浦东新区）》
  - https://www.shmeea.edu.cn/download/20230723/1-011.pdf

- `shmeea-2022-pudong-mingedaqu.pdf`
  - 上海市教育考试院：《2022年上海市高中学校“名额分配到区”招生录取最低分数线（浦东新区）》
  - https://www.shmeea.edu.cn/download/20220810/17304321/11.pdf

- `shmeea-2025-gaokao-benke-pingxing.pdf`
  - 上海市教育考试院：《上海市2025年普通高校招生本科普通批次平行志愿院校专业组投档分数线》
  - https://www.shmeea.edu.cn/download/20250719/186.pdf

- `shmeea-2024-gaokao-benke-pingxing.pdf`
  - 上海市教育考试院：《2024年上海市普通高校招生本科普通批次平行志愿院校专业组投档分数线》
  - https://www.shmeea.edu.cn/download/20240719/198.pdf

- `shmeea-2023-gaokao-benke-pingxing.pdf`
  - 上海市教育考试院：《2023年上海市普通高校招生本科普通批次平行志愿院校专业组投档分数线》
  - https://www.shmeea.edu.cn/download/20230721/11115.pdf

- `shmeea-2022-gaokao-benke-pingxing.pdf`
  - 上海市教育考试院：《2022年上海市普通高校招生本科普通批次平行志愿院校专业组投档分数线》
  - https://www.shmeea.edu.cn/download/20220814/02.pdf

- `shmeea-2021-gaokao-benke-pingxing.pdf`
  - 上海市教育考试院：《2021年上海市普通高校招生本科普通批次平行志愿院校专业组投档分数线》
  - https://www.shmeea.edu.cn/download/20210722/20210722_1.pdf

说明：`data.js` 中的 2025 分数线、末位语数外、数学、语文、综合测试、同分优待、综合素质评价字段来自 2025 PDF；2022-2024 录取线用于展示历年线，2024 录取线用于计算趋势。复旦大学附属复兴中学的 2024 数据按同表中的“上海市复兴高级中学”对应。当前中考页保持“名额分配到区”连续口径，因此接入 2022-2025；2021 年为旧中招批次口径，未混入本表。

高考说明：`gaokao-data.js` 中的 2025 投档线、末位投档考生语文数学合计、语文或数学较高分、外语、选考科目最高/次高/最低分、公示加分来自 2025 PDF；2021-2024 投档线用于同代码历史对照，2024 投档线用于计算趋势。官方对 580 分及以上专业组不公开具体投档分，本项目保留为“580分及以上”。
