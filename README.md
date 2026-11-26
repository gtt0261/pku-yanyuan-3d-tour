# 北京大学一日游

解压后直接用浏览器打开 `dist/index.html`。网页、Three.js、地图和材质均随包提供，离线即可运行。浏览器需要支持 WebGL 和图形加速。也可以在项目目录运行 `python -m http.server 8000 --directory dist`，打开 `http://localhost:8000/`。

## 漫游

| 操作 | 方式 |
|---|---|
| 环顾 | 按住鼠标拖动，或在触摸屏上滑动 |
| 步行与骑行 | W A S D 移动。方向键前进、后退、转向。Shift 加速。手机使用左侧摇杆 |
| 共享单车 | 点「骑行」或按 E 到最近的单车旁取车，再按 E 原地停放。骑行时显示实际时速 |
| 定位 | 点击景点卡，或打开「校园地图」搜索楼名、楼号及别名。可点击地图上的建筑或可通行地面 |
| 昼夜与画质 | 顶部切换昼夜。画面右上角显示实测帧率，可选高、均衡、流畅三档 |
| 自动导览 | 15 秒实时相机从西门经过图书馆、博雅塔，收在未名湖畔。点击「结束导览」或按 Esc 可随时返回 |

## 范围与精度

场景覆盖燕园主校园连续地块及相接的成府园区，包括教学科研、行政办公、食堂、宿舍和其他公共建筑。主体来自校界内 240 个已标绘的建筑轮廓，另有 4 处依据燕南园总平面补绘的建筑体量。174 个公开轮廓已对上楼名，66 个保留轮廓和地图编号。建筑名录保留同楼设施、合建宿舍和别名，详见 `dist/venue-sources.txt`。

地标按北大照片与资料校对，普通楼宇依轮廓、层数、屋顶类型和公开高度生成。缺少实测数据的部分采用估算。树木、单车、灯具与水波是为漫游布置的景物。场景展示建筑外观，完整性以随包公开资料及其采集日期为限。

## 源码与复核

| 文件 | 内容 |
|---|---|
| `dist/tour.js` | 输入、步行与骑行、昼夜切换、15 秒相机曲线、FPS |
| `dist/world.js` | 按建筑轮廓生成墙面和屋顶、道路、桥梁、灯具、停车点、通行判断 |
| `dist/landmarks.js`、`dist/flora.js` | 地标、单车、树木与近景垂柳 |
| `dist/sky-water.js` | 天空材质、光照、逐视点镜面投影、动态水波与质量设置 |
| `dist/atlas.js`、`dist/postcards.js` | 可搜索地图、小地图和四张景点插画 |
| `dist/campus-data.js`、`dist/venue-directory.js` | 地理数据、建筑功能、楼名别名与对应资料 |
| `dist/map-sources.txt`、`dist/venue-sources.txt`、`dist/asset-sources.txt`、`dist/landmark-sources.txt`、`dist/vegetation-sources.txt` | 地图范围、名称核对、模型依据、素材与许可 |
| `tools/`、`tests/` | 数据及素材制作代码、几何自检和浏览器交互测试 |

可运行 `node tests/landmarks.cjs` 及 `node tests/venues.cjs` 检查模型和名录。浏览器测试使用 Playwright，运行 `node tests/browser.cjs` 及 `node tests/browser.cjs --mobile`。可通过 `TOUR_BROWSER` 指定本机 Chromium 或 Edge 的路径，`TOUR_URL` 默认为离线网页。打开作品无需安装这些测试工具。
