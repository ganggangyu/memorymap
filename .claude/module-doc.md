# 时光信笺 · 浪漫旅程地图 — 模块文档

> 目标平台：Android 手机 App（Capacitor WebView）
> 构建：Vite → dist → Capacitor sync → Android APK

---

## 一、架构概览

```
index.html → App.tsx → Timeline.tsx (主容器，通过 viewMode 切换页面)
                        ├── HomePage        (首页)
                        ├── MapView         (地图)
                        ├── CardListView    (时间轴列表)
                        ├── CalendarView    (日历)
                        └── GalleryView     (相册/照片墙)
                        
                        Lightbox            (全屏照片浏览器，从 Timeline 打开)
                        
Modals (从 App.tsx 渲染):
  YearInReview / BirthdaySurprise / FloatingLanterns / IncenseAltar
  AchievementsModal / PhotoCollage / LoveDice / MemoryBook
```

---

## 二、各模块描述

### 1. App.tsx
**用途**: 根组件，初始化 hooks、管理全局弹窗列表
**关键数据**:
- `useEvents()` → events[], saveEvent, deleteEvent
- `useModals()` → modals 对象 {yearInReview, birthday, lanterns, incense, achievements, collage, dice, book, importUrl, dbConfig}
- `useAudio()` → 背景音乐
- `useAchievements()` → 成就系统
**修改注意**:
- 新增弹窗 → 先在 useModals.ts 加字段，再在 App.tsx 加实例

### 2. Timeline.tsx
**用途**: 主容器，底部导航切换 `viewMode`，管理详情面板和 EventForm
**路由状态**: `viewMode: 'home' | 'map' | 'list' | 'calendar' | 'gallery'`
**关键交互**:
- 底部 5 个 Tab 导航
- 打开 Lightbox: `openLightbox(images, index)`
- 打开详情: `setSelectedEventId(id)`
- 新增事件: `isAdding / isPickingLocation`

### 3. HomePage.tsx
**用途**: 首页仪表盘，显示纪念日倒计时、旅程统计、那年今日、最近回忆、快捷入口
**数据来源**: `events[]`, `achievements[]`, `achievementStatuses`
**快捷入口**: 祈福、生日、年度回顾、成就、爱心拼图、数据管理、恋爱骰子、我们的书

### 4. GalleryView.tsx (照片墙)
**用途**: 照片/视频展示，支持网格和 3D 轮播两种模式
**排序功能** (2026-06-12 新增):
- 状态: `sortMode: 'newest' | 'oldest' | 'random'`
- 最新 → sortEventsDescending
- 最早 → date 升序
- 随机 → Fisher-Yates shuffle
- 排序按钮在年份筛选栏右侧，网格/3D 切换之前
**筛选**: 按年份、按标签
**无限滚动**: 初始 12 张，滚动到底部加载 30 张
**Lightbox 入口**: 点击照片 → `onImageClick(allMedia, index)`

### 5. ThreeDCarousel.tsx
**用途**: 3D 圆环照片轮播（来自 gallery 的"3D"模式）
**交互**: 拖拽旋转、单击居中、双击打开 Lightbox
**注意**: `touchAction: 'none'` 防止浏览器手势干扰

### 6. Lightbox.tsx
**用途**: 全屏照片/视频浏览器
**触摸滑动** (2026-06-12 新增):
- `touchStartX/Y` refs，阈值 60px
- 水平滑动超过阈值且大于垂直偏移 → 切换上一张/下一张
- 防止与 zoom 点击冲突
**键盘**: ← → ESC
**桌面**: 左右按钮 (hidden on mobile via `hidden md:block`)

### 7. BirthdaySurprise.tsx
**用途**: 生日查询 / 庆生弹窗
**数据**: `MY_BIRTHDAY` / `HER_BIRTHDAY` from `src/utils/lunar.ts`
**展示规则** (2026-06-12 确认):
- 你的生日：农历九月十八 → 只显示月日，不显示年份
- 她的生日：农历正月初五 → 只显示月日，不显示年份
- 公历日期：显示"今年公历：X月X日"
- 生日当天→ 生日快乐动画 + 祝福语
- 非生日→ 显示双方生日信息

### 8. src/utils/lunar.ts
**用途**: 农历→公历转换
**数据**:
- `MY_BIRTHDAY`: 农历九月十八，solarDates 2025-2030
- `HER_BIRTHDAY`: 农历正月初五，solarDates 2025-2030
**注释中不含出生年份** (2026-06-12 已移除)

### 9. MapView.tsx / CalendarView.tsx / CardListView.tsx
**用途**: 地图视图 / 日历视图 / 时间线列表
**均包含**: 事件卡片 → 点击打开详情

### 10. EventForm.tsx / DetailPanel.tsx
**EventForm**: 新增/编辑事件表单
**DetailPanel**: 事件详情面板（支持 compact 模式用于地图底部弹出）

### 11. 仪式组件
- **FloatingLanterns.tsx**: 孔明灯，3D 火焰 + 飘浮动画
- **IncenseAltar.tsx**: 上香祈福，Three.js 粒子特效
- **HeartEmitter.tsx**: 粉红爱心雨

### 12. YearInReview.tsx
**用途**: 年度回顾幻灯片
**已有滑动手势**: touchStart/touchEnd 检测左右滑动

### 13. 其他组件
- **PhotoCollage.tsx**: 心形照片拼图生成器
- **LoveDice.tsx**: 恋爱骰子小游戏
- **MemoryBook.tsx**: 可打印的记忆书
- **AchievementsModal.tsx**: 成就系统 UI
- **DatabaseConfigModal.tsx**: 数据导入导出管理
- **ScratchCard.tsx / SouvenirModal.tsx**: 刮刮卡和纪念品生成

---

## 三、平台配置

### vite.config.ts
- `base: './'` → 相对路径，适配 Capacitor https://localhost
- build.rollupOptions 定义了 4 个 vendor chunks

### capacitor.config.ts
- `webDir: 'dist'`, `androidScheme: 'https'`
- `hostname: 'localhost'` (2026-06-12 新增)

### Android 构建环境
- **JDK**: `D:\software\jdk21` (Temurin 21.0.11)
- **Android SDK**: `D:\software\android-sdk` (platforms: android-35/36, build-tools: 35/36)
- **Gradle**: 使用 `android/gradlew.bat` (8.14.3)
- **ADB**: `D:\software\android-sdk\platform-tools\adb`
- **设备序列号**: `a143247d`

### 一键部署
```bash
# 1. 构建前端
/d/software/PS/Adobe Photoshop 2025/node ./node_modules/vite/bin/vite.js build
# 2. 同步到 Android assets
cp -r dist/* android/app/src/main/assets/public/
# 3. 编译 APK
cd android && export JAVA_HOME=/d/software/jdk21 ANDROID_SDK_ROOT=/d/software/android-sdk PATH="/d/software/jdk21/bin:$PATH" && ./gradlew assembleDebug
# 4. 安装到手机
/d/software/android-sdk/platform-tools/adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# 5. 启动应用
/d/software/android-sdk/platform-tools/adb shell am start -n com.memorymap.app/.MainActivity
```

### Android 原生文件
- **MainActivity.java** (2026-06-12 更新): 通过 `getResources().getIdentifier("webview", ...)` 找到 WebView，设置 `setOverScrollMode(OVER_SCROLL_NEVER)` 防侧滑退出
- **activity_main.xml** (2026-06-12 更新): `fitsSystemWindows=true` + `overScrollMode="never"`
- **local.properties**: `sdk.dir=/d/software/android-sdk`
- **index.html**: 资产路径必须为相对路径 `./assets/...`

### index.html / src/index.css
- `html, body { background-color: #fef9f0 }` → 防止白屏闪烁
- `overscroll-behavior: none` → 防止边缘滑动退出

---

## 四、修改清单

| 日期 | 模块 | 变更 |
|------|------|------|
| 2026-06-12 | GalleryView | 新增 sortMode 排序功能（最新/最早/随机） |
| 2026-06-12 | Lightbox | 新增触摸滑动切换照片 |
| 2026-06-12 | MainActivity.java | 沉浸模式 + WebView overscroll never |
| 2026-06-12 | activity_main.xml | fitsSystemWindows + overscroll never |
| 2026-06-12 | index.html | overscroll-behavior-y: none + -webkit-user-drag: none |
| 2026-06-12 | lunar.ts | 注释中移除出生年份 |
| 2026-06-12 | dist/index.html + Android assets | 修复资产路径 /map/ → ./ |
| 2026-06-12 | manifest.json | start_url /map/ → ./, 修复 background/theme color |
| 2026-06-12 | src/index.css | html/body 背景色 #fef9f0 防白屏 |
| 2026-06-12 | capacitor.config.ts | 新增 hostname/allowNavigation |
| 2026-06-12 | vite.config.ts | 显式设置 output fileNames |
