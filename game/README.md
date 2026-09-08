# 内容制作入口

七张地图的唯一布局来源为 `maps/ward.ldtk`、`maps/warehouse.ldtk`、`maps/plant.ldtk`、`maps/outpatient.ldtk`、`maps/surgery.ldtk`、`maps/morgue.ldtk`、`maps/garden.ldtk`。通过 `game/levels.json` 注册名称、主题、LDtk 文件、关卡标识、灯光参数和事件文件。新增同类关卡只需增加注册项和内容，不需给主场景增加地图分支。

1. LDtk 的 Architecture 图层保存墙、家具、门、出生点、出口、边界、灯具和事件区域；Loot_A / Loot_B 保存两套物资位置。图层可见状态不影响导出。
2. 保存注册表、LDtk 或事件文件时，Vite 重新导出 `game/maps/*.json` 与 `catalog.json`。构建和测试也先导出。不要直接编辑这些产物。
3. 必需实体：CameraBounds、PlayBounds、PlayerSpawn、MonsterLeft、MonsterRight、Door、DoorUse、Exit、ReturnZone、四个默认灯点，以及每套 Key_A/B、Box0_A/B、Box1_A/B、Box2_A/B。Wall、Bed、Crate、Machine、Desk、Shelf、Rack、Engine 可多个。实体名以 Zone 结尾时自动注册为同名事件区域；ReturnZone 另保留 return_corridor 别名。
4. 七张地图均为 1280×768，内部视口仍为 640×384。镜头、地面范围、灯光遮罩、怪物出生点和寻路读取地图数据。Seating / Operatingtable 为候诊排椅及手术台，Desk / Shelf 支持桌台及层架，Rack / Engine 为完全遮挡光线的高货架和大型机组；七张地图通过 DressPhoneZone / DressCrtZone / DressMemorialZone / DressDollZone 布置小型氛围摆件。Optional*Zone 区域限制可选补给与藏身柜位置，Pipe*Zone 为不参与碰撞的地面管线，不代表已经完成任意尺寸地图的美术适配。
5. 每关独立事件文件支持 wait、sound、light、message。light.target 对应注册灯具 ID 或 crt；sound.source 可引用灯具位置作为空间声源，省略时使用 pan。触发条件为 flag 与 zone 同时满足；flag 支持 first_box、second_box、all_fuses、key_collected。once=true，每事件最多 32 步，每步等待最多 30 秒。
6. EventRuntime 区分 triggered、pending、completed。暂停不推进游戏时间；结算和重开取消未完成序列，并恢复地图灯光基值。当前不支持多事件对同一灯光的优先级混合，制作事件时应避免重叠写同一目标。

`npm run content:check` 校验 LDtk、必需实体、边界、灯光及事件引用；`npm test` 检查十四种固定布局及 1,400 组随机布局可达性、锁、时序和减益上限；`npm run test:browser` 检查原三图，`npm run test:browser:clinical` 以保护辅助和实际按键检查门诊与手术室。开发网址添加 `?debug=1` 显示碰撞框、事件区域、怪物寻路节点；控制台 `window.__nightshift()` 查看事件状态与临时效果。

`game/commands.json` 是界面和服务端共享的八条观众指令目录：4 增益、4 减益。新增 drain（8 秒最多额外耗电 16%）与 alarm（6 秒暴露位置）；二者持续期间不叠加，暂停冻结、重开清空。移除旧 battery / lure webhook 指令，调用方需更新；玩家 R 诱饵保留。接口仍是开发事件桥，TT 协议与正式部署服务尚未实现。

LDtk 文件已通过 1.5.3 Schema 校验，尚未经过本机编辑器打开/保存往返验证。目前支持嵌入式 Entities 图层，不支持 Tiles、IntGrid、外部关卡、多世界。美术仍由 Phaser 绘制，Aseprite 瓦片工作流尚未接入。

太平间使用 ColdCabinet / ShroudedTrolley 家具；MorgueDrawerZone 标记抽屉伸出范围，状态机详见 `docs/morgue-validation.md`。随机布局验证包含抽屉伸出后的完整搜寻链。

医院中庭为现代日式花园，第 7 关，详见 `docs/garden-validation.md`。Garden 的 PathZone 绘制混凝土步道，GlassZone 标记温室，植被与水池各有独立家具轮廓；灯光事件不改变碰撞。
