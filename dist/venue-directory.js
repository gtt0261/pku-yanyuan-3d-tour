/* © OpenStreetMap contributors, ODbL 1.0. Names and usage cross-checked against PKU publications. */
(() => {
  "use strict";
  const campus = window.CAMPUS_DATA;
  const sources = {
    osm: ["公开地理要素", "https://www.openstreetmap.org/copyright"],
    map: ["北京大学校园图（第一页）", "https://qbio.pku.edu.cn/QB2025/docs/20241225182041085560.pdf"],
    directory: ["北大留办 · 燕园校区地图", "https://isdplus.pku.edu.cn/dfiles/pdf/map.pdf"],
    dining: ["北大餐饮中心 · 食堂名录", "https://cyzx.pku.edu.cn/bmgk/zzjg/index.htm"],
    chengfu: ["北大新闻 · 成府园食堂位置", "https://news.pku.edu.cn/xwzh/adbbb6cafe1748558f3c4393732bffd7.htm"],
    dorms: ["北大公寓服务中心 · 公寓楼号", "https://dorm.pku.edu.cn/guide/xsgy_fw/ggylpmt/index.htm"],
    shao5: ["基建工程部 · 2026年勺园5号楼、5甲楼改造交付", "https://jjgcb.pku.edu.cn/gcdt/a2028f5edae04662b7eaa0ef0c9c0bf1.htm"],
    shaoyuan: ["勺园 · 公寓与客房", "https://shaoyuan.pku.edu.cn/gysy/xxry/js/index.htm"],
    shaoOffice: ["北大机关 · 勺园5乙办公楼", "https://news.pku.edu.cn/ztwz111/bwcxljsmztjy/xxpt_bwcx/44fdc22f947748c4abc3e32875a3aa74.htm"],
    hospitality: ["北京大学 · 勺园中、西餐厅", "https://old.pku.edu.cn/visitors/cy/index.htm"],
    service: ["北京大学 · 生活配套服务", "https://news.pku.edu.cn/xwzh/5a81533082db47a5b4e159a448b5caec.htm"],
    cityOffice: ["北京大学 · 燕园大厦办公单位", "https://news.pku.edu.cn/info/7921/2843711.htm"],
    housing2025: ["公寓服务中心 · 43楼与勺园2号楼改造", "https://dorm.pku.edu.cn/sylm/gzdt/zxdt/1064gyzx169541.htm"],
    law: ["法学院 · 陈明楼与顾颉刚故居", "https://www.law.pku.edu.cn/xwzx/xwdt/29052.htm"],
    red: ["北大文物保护 · 德才均备斋", "https://zys.pku.edu.cn/wwbh/wwxx/6bazys324.htm"],
    south: ["北大新闻 · 南门19—24楼修缮", "https://news.pku.edu.cn/info/2921/184301.htm"],
    life: ["生命科学学院 · 楼宇名称", "https://www.bio.pku.edu.cn/homes/Index/news_img_jz/68/68.html"],
    bicmr: ["北大人事部 · 北京国际数学研究中心院区", "https://hr.pku.edu.cn/rczp/jxky/348345393e6b4f8580a65a3374899b0f.htm"],
    sis: ["国际关系学院 · 北、中、南楼名称", "https://www.sis.pku.edu.cn/history9001/gz60/zxbd/1201886sis_20191382412.htm"],
    humanities: ["北大研究生院 · 院系联系地址", "https://admission.pku.edu.cn/lxxx/lxyx/index.htm"],
    humanitiesLibrary: ["北大图书馆 · 院系分馆位置", "https://www.lib.pku.edu.cn/portal/cn/node/995"],
    langrun: ["北大基建工程部 · 朗润园及燕南园保护修缮", "https://jjgcb.pku.edu.cn/sylm/bmdt/1059jjgcb158538.htm"],
    scholars: ["北大基建工程部 · 朗润园8–13号高访公寓", "https://jjgcb.pku.edu.cn/gcdt/1059jjgcb124515.htm"],
    yannan: ["北大文物保护 · 燕南园50–66号院", "https://fdcb.pku.edu.cn/yyww/wwxx/6b647accaf9a47c789793d785785200c.htm"],
    yannanmap: ["燕南园楼号与总平面", "https://paper.xinmin.cn/html/xmwb/2023-05-07/16/160806.html"],
    garden: ["北大对外交流中心 · 治贝子园会议场所", "https://oec.pku.edu.cn/xwdt/7jlzx160790.htm"],
    pavilion: ["北大文物保护 · 鲁斯亭", "https://fdcb.pku.edu.cn/yyww/wwxx/1038696418f74c3eaf89b10fdb3d729a.htm"],
    packard: ["北大文物保护 · 体斋、健斋与帕卡德公寓", "https://fdcb.pku.edu.cn/yyww/wwxx/ef2cbd42cd164905a4ed4a5327549746.htm"],
    visit: ["北京大学 · 燕园景观", "https://www.pku.edu.cn/visit.html"],
    teaching: ["北大招生办 · 燕园考场一览", "https://admission.pku.edu.cn/docs/20251216213609234453.pdf"]
  };

  // Each row keeps the geometry reference, preferred name, use, source and searchable aliases together.
  const records = {
    r3249649: ["北京大学图书馆", "culture", "map", "图书馆", "北大图书馆"],
    r3249764: ["理科五号楼", "academic", "map", "理科5号楼", "理五"],
    r11823277: ["综合科研一号楼", "academic", "map", "综合科研1号楼", "逸夫楼"],
    r11975583: ["微纳电子大厦", "academic", "map"],
    r11975584: ["刘水楼", "academic", "map", "环境科学与工程学院"],
    r11975585: ["理科三号楼", "academic", "map", "曙东楼", "理科3号楼", "理三"],
    r13059307: ["理科一号楼", "academic", "map", "理科1号楼", "理一"],
    r13059308: ["金光生命科学大楼", "academic", "life", "理科四号楼", "理科4号楼", "理四", "生命科学学院大楼", "金光楼"],
    r13059309: ["北京大学医院", "service", "map", "校医院"],
    r13068022: ["光华管理学院1号楼", "academic", "map", "光华楼", "光华老楼", "光华一号楼"],
    r13259482: ["吕志和楼", "academic", "map"],
    r13259483: ["顾颉刚故居", "culture", "law", "法治与发展研究院", "法学院科研办公室"],
    r13281267: ["全斋", "academic", "bicmr", "北京国际数学研究中心"],
    r14320161: ["北京大学教育基金会", "office", "map", "教育基金会"],
    r14962081: ["理科二号楼", "academic", "map", "逸夫苑", "理科2号楼", "理二"],
    r21822650: ["农园食堂", "dining", "dining", "农园餐厅", "农园"],
    r21822651: ["赛克勒考古与艺术博物馆", "culture", "map", "赛克勒博物馆", "考古博物馆"],
    w33457546: ["邱德拔体育馆", "sport", "map"],
    w104345641: ["遥感楼", "academic", "map"],
    w163926083: ["廖凯原楼", "academic", "map", "政府管理学院", "政府管理大楼", "成府园3号楼"],
    w188711087: ["百周年纪念讲堂", "culture", "map", "百年讲堂", "大讲堂", "百讲"],
    w188712163: ["艺园食堂", "dining", "dining", "艺园餐厅", "艺园二楼"],
    w226702307: ["第一教学楼", "academic", "map", "一教"],
    w226703041: ["第二体育馆", "sport", "map", "二体"],
    w226703926: ["西校门", "culture", "visit", "西门", "校友门"],
    w226704221: ["化学北楼", "academic", "map", "大雅堂"],
    w226704234: ["化学南楼", "academic", "map"],
    w226704254: ["北京大学校史馆", "culture", "map", "校史馆"],
    w226704412: ["北京大学档案馆", "office", "map", "档案馆"],
    w240825539: ["学生宿舍38、39楼", "residence", "dorms", "38楼", "39楼"],
    w240825542: ["学生宿舍40、41、42楼", "residence", "dorms", "40楼", "41楼", "42楼"],
    w240825543: ["学生宿舍36、37楼", "residence", "dorms", "36楼", "37楼"],
    w240825544: ["学生宿舍33、34A、34B楼", "residence", "map", "33楼", "34楼", "34A楼", "34B楼"],
    w240825554: ["王克桢楼", "academic", "map"],
    w240825555: ["第四教学楼", "academic", "map", "四教"],
    w240825556: ["第三教学楼", "academic", "teaching", "刘卿楼", "三教"],
    w240825557: ["第二教学楼", "academic", "teaching", "李兆基楼", "二教"],
    w240825562: ["博雅塔", "culture", "visit", "水塔"],
    w240825566: ["陈明楼", "academic", "map", "法学院陈明楼", "法学楼"],
    w240825568: ["光华管理学院2号楼", "academic", "map", "光华新楼", "光华二号楼"],
    w240825569: ["法学院凯原楼", "academic", "map", "凯原楼"],
    w240832215: ["外文楼", "academic", "map"],
    w240832216: ["办公楼（贝公楼）", "office", "map", "贝公楼", "校长办公楼"],
    w240832218: ["民主楼", "academic", "map", "穆楼"],
    w240832219: ["德斋", "office", "red", "红一楼", "红1楼", "斐斋"],
    w240832220: ["才斋", "office", "red", "红二楼", "红2楼", "蔚斋"],
    w240832221: ["红五楼", "office", "directory", "红5楼", "审计室"],
    w240832222: ["均斋", "office", "red", "红三楼", "红3楼", "干斋"],
    w240832223: ["备斋", "office", "red", "红四楼", "红4楼", "复斋"],
    w240832224: ["红六楼", "office", "directory", "红6楼"],
    w240832226: ["第一体育馆", "sport", "map", "一体"],
    w240832229: ["勺园4号楼", "residence", "dorms", "勺四"],
    w240832231: ["勺园5号楼", "residence", "shao5", "勺五"],
    w988601892: ["勺园5甲楼", "residence", "shao5", "勺园5号楼甲"],
    w240832232: ["国际关系学院大楼", "academic", "sis", "国关楼", "国政楼", "瓦洛里楼"],
    w1086578215: ["陈瑞鸿楼", "academic", "sis", "国际关系学院北楼"],
    w1086578216: ["新鸿基楼", "academic", "sis", "国际关系学院南楼"],
    w240832236: ["勺园6号楼", "residence", "shaoyuan", "勺园留学生公寓"],
    w240832237: ["勺园7号楼", "service", "map", "正大国际中心", "弘雅厅"],
    w240832238: ["勺园8号楼", "service", "shaoyuan", "勺园客房"],
    w240832239: ["勺园9号楼", "service", "shaoyuan", "勺园客房"],
    w240832243: ["学五食堂", "dining", "dining", "学五"],
    w240832249: ["教育学院楼", "academic", "map", "教育学院"],
    w240832250: ["方李邦琴楼", "academic", "map", "信息管理系", "对外汉语教育学院"],
    w240832251: ["蒙民伟楼", "academic", "map", "新闻与传播学院"],
    w240832252: ["资源楼", "office", "map", "资源东楼", "资源西楼"],
    w240832253: ["五四体育中心", "sport", "map", "五四体育馆"],
    w272349096: ["鲁斯亭", "culture", "pavilion", "岛亭", "湖心岛亭"],
    w272353673: ["北阁", "office", "directory", "南北阁"],
    w272353674: ["南阁", "office", "directory", "南北阁", "国际合作部"],
    w272353675: ["临湖轩", "culture", "map"],
    w272361848: ["俄文楼", "academic", "map"],
    w272362583: ["哲学楼", "academic", "map"],
    w372944573: ["文史楼", "academic", "map"],
    w372945805: ["学一食堂", "dining", "dining", "学一"],
    w444894328: ["松林餐厅", "dining", "dining", "松林快餐", "松林包子铺"],
    w444894329: ["家园食堂", "dining", "dining", "家园餐厅", "餐饮综合楼"],
    w444991872: ["理科教学楼", "academic", "teaching", "黄廷方楼", "理教"],
    w444991873: ["英杰交流中心", "service", "map", "英杰"],
    w445012603: ["地学楼", "academic", "map", "老地学楼"],
    w445012604: ["老化学楼", "academic", "map", "计量生物学中心", "本科招生办公室"],
    w445012606: ["智华楼", "academic", "map", "电教", "电化教学楼", "数学科学学院"],
    w445012607: ["老生物楼", "academic", "map"],
    w445014559: ["体斋", "service", "packard", "帕卡德国际访问学者公寓"],
    w445016203: ["勺园食堂", "dining", "dining"],
    w445016204: ["佟园食堂", "dining", "dining", "佟园餐厅", "清真食堂"],
    w445016205: ["勺园1号楼", "residence", "directory", "勺一"],
    w445016206: ["勺园3号楼", "residence", "directory", "勺三"],
    w445016207: ["勺园2号楼", "residence", "housing2025", "勺二"],
    w445016209: ["新太阳学生中心", "service", "map", "新太阳", "原16楼旧址", "原17楼旧址", "原18楼旧址"],
    w446944417: ["燕南食堂", "dining", "dining", "燕南美食", "燕南餐厅"],
    w568727714: ["伟利楼", "office", "directory", "守仁国际中心"],
    w568832327: ["健斋", "service", "packard", "帕卡德公寓", "国际访问学者公寓"],
    w628032101: ["阿卜杜勒·阿齐兹国王公共图书馆北京大学分馆", "culture", "map", "古籍图书馆", "沙特国王图书馆"],
    w628032103: ["生物标本馆", "culture", "map"],
    w656386276: ["方楼", "academic", "map"],
    w679485574: ["生物技术楼", "academic", "map"],
    w679485570: ["保护生物学楼", "academic", "life", "熊猫楼"],
    w680594294: ["燕园大厦", "office", "cityOffice", "研究生院", "研究生招生办公室", "教务部", "保卫部综合服务大厅", "教师教学发展中心", "创新创业学院"],
    w783033431: ["孝义金晖楼", "academic", "map", "经济学院"],
    w866277585: ["综合科研二号楼", "academic", "life", "综合科研2号楼", "设备二号楼"],
    w866277589: ["核磁共振中心", "academic", "map", "核磁中心", "北京核磁共振中心"],
    w876428136: ["科维理天文与天体物理研究所", "academic", "map", "科维理所", "KIAA"],
    w880624074: ["北大博雅国际酒店", "service", "map", "博雅国际酒店"],
    w1075644751: ["李兆基人文学苑1号楼", "academic", "map", "人文学苑一号楼"],
    w939378517: ["李兆基人文学苑2号楼", "academic", "humanities", "哲学系", "宗教学系"],
    w986745065: ["李兆基人文学苑3号楼", "academic", "humanities", "历史学系招生办公室"],
    w939378516: ["李兆基人文学苑4号楼", "academic", "humanitiesLibrary", "高等人文研究院"],
    w939378519: ["李兆基人文学苑6号楼", "academic", "humanities", "中国语言文学系", "中文系"],
    w986745062: ["李兆基人文学苑5号楼", "academic", "map", "历史学系"],
    w1009051998: ["考古文博学院", "academic", "map", "文博楼"],
    w1009052001: ["实验动物中心B座", "academic", "map"],
    w1009052052: ["外国语学院", "academic", "map", "外院新楼"],
    w1056350630: ["校景亭", "culture", "map"],
    w1063568534: ["实验动物中心A座", "academic", "map"],
    w1075644757: ["建筑学研究中心", "academic", "map"],
    w1075644759: ["恩善苑", "academic", "map", "北京大学－香港理工大学中国社会工作研究中心"],
    w1075644736: ["北京大学花房", "service", "map", "花房"],
    w1086578219: ["章桂堂", "service", "directory", "章桂楼", "守仁国际中心"],
    w1086578221: ["亨利楼", "office", "directory", "守仁国际中心"],
    w1573362349: ["北京国际数学研究中心", "academic", "bicmr", "镜春园78号院", "数学中心"],
    w1568420018: ["慈济寺山门", "culture", "visit", "花神庙山门"],
    w1009052041: ["中国画法研究院", "academic", "map"],
    w1009052036: ["中国诗歌研究院", "academic", "map"],
    w1118943554: ["北大科技园", "service", "map"]
  };

  const dormIds = {
    w240832247: 28, w240832245: 29, w240832246: 30, w240832244: 31, w240825546: 32, w240825545: 35,
    w444894330: 43, w240825551: 44, w272303341: 45, w272303337: "45甲", w272303338: "45乙",
    w986745069: 46, w986745070: 47, w986745071: 48
  };
  for (const [id, number] of Object.entries(dormIds)) {
    records[id] = ["学生宿舍" + number + "楼", "residence", "dorms", number + "楼", number + "号楼"];
  }
  records.w444894330[2] = "housing2025";
  const formerDorms = {r12815351: 19, r12815354: 20, r12815350: 21, r12815352: 22, r12815355: 23, r12815353: 24};
  for (const [id, number] of Object.entries(formerDorms)) {
    records[id] = ["南门" + number + "号楼", "academic", "south", number + "楼", "燕园" + number + "号楼"];
  }
  records.r12815352.push("外国哲学研究所", "外哲所");
  const gardens = ["一", "二", "三", "四", "五", "六"];
  gardens.forEach((n, i) => {
    records["w" + (272364819 + i)] = ["静园" + n + "院", "academic", "map", n + "院", "静园" + (i + 1) + "院"];
  });
  const oldHomes = {
    w866277607: 50, w866277593: 51, w866277594: 52, w866277598: 53, w866277599: 54,
    w866277606: 55, w866277600: 56, w866277597: 59, w866277595: 60,
    w866277604: 61, w866277605: 63
  };
  for (const [id, number] of Object.entries(oldHomes)) {
    records[id] = ["燕南园" + number + "号院", "culture", "yannanmap", "燕南园" + number + "号楼"];
  }
  records.w866277607.push("教师交流中心南区");
  records.w866277600.push("美学与美育研究中心");
  records.w866277605.push("马寅初故居");
  records.r11823278 = ["燕南园57、58号院", "culture", "yannanmap", "燕南园57号院", "燕南园58号院", "三松堂", "冯友兰故居", "汤用彤故居"];
  const scholarHouses = {w873446764: 8, w873446763: 9, w873446762: 10, w873446761: 11, w873446760: 12, w873446769: 13};
  for (const [id, number] of Object.entries(scholarHouses)) {
    records[id] = ["朗润园" + number + "号楼", "residence", "scholars", "高访公寓" + number + "号楼", "朗润园" + number + "公寓"];
  }

  const venues = [];
  for (const building of campus.buildings) {
    const row = records[building.id] || [building.name, building.kind, "osm"];
    if (!row[0]) continue;
    let area = 0, sumX = 0, sumZ = 0;
    const ring = building.ring;
    for (let i = 0; i < ring.length; i++) {
      const [x, z] = ring[i], [nextX, nextZ] = ring[(i + 1) % ring.length];
      const cross = x * nextZ - nextX * z;
      area += cross;
      sumX += (x + nextX) * cross;
      sumZ += (z + nextZ) * cross;
    }
    const [name, kind, source, ...aliases] = row;
    const x = Math.round(10 * sumX / (3 * area)) / 10;
    const z = Math.round(10 * sumZ / (3 * area)) / 10;
    venues.push({id: building.id, osmId: building.id, name, kind, aliases, x, z, source});
  }

  // A facility can share a building, or occupy a courtyard with multiple roofs.
  const points = [
    ["n8156964521", "r13059309", "成府园食堂", "dining", -284.8, -494.7, "chengfu", "成府园餐厅"],
    ["shao6dining", "w240832236", "勺园西餐厅", "dining", -993.7, 154.5, "hospitality"],
    ["shao7dining", "w240832237", "勺园中餐厅", "dining", -977.2, 214.6, "hospitality", "勺园7号楼中餐厅"],
    ["shao5b", "w445016203", "勺园5乙办公楼", "office", -1027.2, 67.3, "shaoOffice", "勺园5乙楼"],
    ["n10295028973", null, "北京大学斯坦福中心", "academic", -675.8, -603.5, "map", "斯坦福中心"],
    ["n10295028974", null, "中国古代史研究中心", "academic", -695.9, -631.1, "map", "中古史中心"],
    ["n10295028975", null, "朗润园教学建筑群", "academic", -652.1, -609, "langrun", "致福轩", "万众楼", "万众苑", "新结构经济学研究院", "中国经济研究中心旧址"],
    ["n10286861604", "w628032103", "电话室", "office", -495.8, -73.3, "map"],
    ["n4459857289", "w272303337", "45甲物美地下超市", "service", -1019.7, 314.1, "service", "物美超市"],
    ["n5938457342", "w444894330", "北京大学邮政所", "service", -911.1, 546.7, "service", "邮局"],
    ["w880624098", null, "治贝子园", "culture", -259.5, 361.1, "garden", "治贝子园会议中心"],
    ["w783033430", null, "五四体育场", "sport", -373.4, 521.0, "map", "五四运动场"],
    ["n11270757354", "w680594294", "燕园派出所", "service", -193.4, 489.6, "osm"]
  ];
  for (const [id, osmId, name, kind, x, z, source, ...aliases] of points) {
    venues.push({id, osmId, name, kind, x, z, source, aliases, poi: true});
  }

  // Missing footprint centers are registered to the published campus diagram. Small volumes are illustrative.
  const inferredHouses = [
    [62, -748, 357, 25, 10, 6.1],
    [64, -804, 284, 16, 9, 6.1],
    [65, -788, 261, 12, 9, 6.1],
    [66, -785, 221, 14, 9, 6.5, "冰心、吴文藻旧居", "朱光潜故居"]
  ];
  for (const [n,x,z,width,depth,height,...aliases] of inferredHouses) {
    venues.push({id: "yannan-" + n, osmId: null, name: "燕南园" + n + "号院", aliases: ["燕南园" + n + "号楼", ...aliases], kind: "culture", x, z,
      source: "yannanmap", precision: "院落总平面配准的近似位置", model: {width, depth, height, angle: 0}});
  }
  window.VENUE_DIRECTORY = {venues, sources, scope: "燕园校门内连续区域", checkedOn: "2026-11-18"};
})();
