# Bilibili 低粉过滤

一个 Microsoft Edge 扩展，自动屏蔽 B 站首页推荐中粉丝数不足 5 万的 UP 主视频，减少 AI 生成的低质内容干扰。

## 功能

- 自动检测首页推荐视频的 UP 主粉丝数
- 粉丝数 < 50,000 的 UP 主视频直接从页面移除
- 支持无限滚动加载的新卡片
- 右下角显示已屏蔽数量
- 粉丝数结果缓存 24 小时，减少 API 请求

## 安装

1. 克隆或下载本仓库
2. 打开 Edge，进入 `edge://extensions/`
3. 开启右上角「开发人员模式」
4. 点击「加载解压缩的扩展」，选择本仓库目录

## 使用

安装后访问 [bilibili.com](https://www.bilibili.com) 首页，扩展自动运行。右下角蓝色标签显示当前页面已屏蔽的低粉 UP 主数量。

## 配置

默认阈值为 **5 万粉丝**，如需修改，编辑 `content.js` 第一行：

```js
const THRESHOLD = 50_000;
```

## License

[MIT](LICENSE) © Jittery5
