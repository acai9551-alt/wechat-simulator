// ==================== 跨周目存档管理 ====================
const MetaSave = {
  KEY: 'wechat-sim-meta',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.getDefault();
      return JSON.parse(raw);
    } catch { return this.getDefault(); }
  },

  getDefault() {
    return {
      totalRuns: 0,
      endings: [],
      achievements: [],
      archivesViewed: [],
      seenBranches: [],
      bestStats: { maxUsers: 0, maxReputation: 0, maxCreativity: 0 },
      allChoices: [],
      lastPlayerName: ''
    };
  },

  save(meta) {
    try { localStorage.setItem(this.KEY, JSON.stringify(meta)); } catch {}
  },

  // 一周目结束时调用：写入跨周目数据
  commitRun(gameState, endingTitle) {
    const meta = this.load();
    meta.totalRuns++;
    // 结局收集（去重）
    if (endingTitle && !meta.endings.includes(endingTitle)) meta.endings.push(endingTitle);
    // 成就合并（去重）
    for (const a of gameState.achievements) {
      if (!meta.achievements.includes(a)) meta.achievements.push(a);
    }
    // 档案合并
    for (const a of gameState.archivesViewed) {
      if (!meta.archivesViewed.includes(a)) meta.archivesViewed.push(a);
    }
    // 分支合并
    for (const b of gameState.branchTriggered) {
      if (!meta.seenBranches.includes(b)) meta.seenBranches.push(b);
    }
    // 最佳记录
    meta.bestStats.maxUsers = Math.max(meta.bestStats.maxUsers, gameState.stats.users);
    meta.bestStats.maxReputation = Math.max(meta.bestStats.maxReputation, gameState.stats.reputation);
    meta.bestStats.maxCreativity = Math.max(meta.bestStats.maxCreativity, gameState.stats.creativity);
    // 选择记录
    meta.allChoices.push({ run: meta.totalRuns, choices: [...gameState.choices] });
    // 名字
    if (gameState.playerName && gameState.playerName !== '我') {
      meta.lastPlayerName = gameState.playerName;
    }
    this.save(meta);
    return meta;
  },

  // 获取上一周目同轮次的选择（用于对比展示）
  getPrevRunChoices() {
    const meta = this.load();
    if (meta.allChoices.length < 1) return null;
    // 取倒数第一次完成的记录（当前正在玩的还没commit，所以取最后一条）
    return meta.allChoices[meta.allChoices.length - 1];
  }
};

// ==================== 游戏引擎 ====================
const Game = {
  state: {
    playerName: '',
    prologueStep: 0,
    round: 0,
    stats: { users:0, reputation:0, creativity:45, resource:30 },
    // 记录每轮数值快照（用于阶段结算对比）
    statsHistory: [],
    initialStats: null,
    tags: { aggressiveGrowth:0, techDebt:0, teamNeglect:0, commercialFirst:0, longTermism:0, userFirst:0 },
    choices: [],
    delayedEffects: [],
    pendingStatChanges: {},
    achievements: [],
    currentFeedback: [],
    lastChoice: null,
    archivesViewed: [],
    branchTriggered: [],
    pendingBranch: null,
    inBranch: false,
    currentBranch: null,
    isTransitioning: false,
    statsIntroShown: false,
    prologueTyping: false,
    achSeenCount: 0,
    resourceRequests: 0,
    resourceCostMultiplier: 1,
    cleverBonus: false,
    phaseResourceRequested: {}  // 每阶段是否已申请过资源 { '萌芽期': true, ... }
  },

  formatUsers(n) {
    return n.toLocaleString('en-US');
  },

  // 用户数在一定范围内随机波动，模拟真实后台数据
  _userFluctuationTimer: null,
  _userFluctuationEls: [],

  startUserFluctuation() {
    this.stopUserFluctuation();
    this._userFluctuationEls = document.querySelectorAll('[data-fluctuate="users"]');
    if (this._userFluctuationEls.length === 0) return;
    const base = this.state.stats.users;
    if (base <= 0) return; // 0用户不波动

    const fluctuate = () => {
      const base = this.state.stats.users;
      if (base <= 0) return;
      // 波动范围：±0.3% 的真实值，至少 ±3
      const range = Math.max(3, Math.floor(base * 0.003));
      const display = base + Math.floor(Math.random() * range * 2) - range;
      const text = display.toLocaleString('en-US');
      this._userFluctuationEls.forEach(el => {
        el.textContent = text;
      });
    };
    fluctuate();
    this._userFluctuationTimer = setInterval(fluctuate, 2000);
  },

  stopUserFluctuation() {
    if (this._userFluctuationTimer) {
      clearInterval(this._userFluctuationTimer);
      this._userFluctuationTimer = null;
    }
  },

  // 微信版本→时代映射（版本号来自真实微信版本界面图集）
  ERA_MAP: {
    '2011': { era:'2011', ver:'v1.0' },
    '2012': { era:'2012', ver:'v4.0' },
    '2013': { era:'modern', ver:'v5.0' },
    '2014': { era:'modern', ver:'v6.0' },
    '2015': { era:'modern', ver:'v6.0' },
    '2017': { era:'modern', ver:'v6.6' },
    '2018': { era:'modern', ver:'v7.0' },
    '2020': { era:'modern', ver:'v8.0' },
    '2025': { era:'modern', ver:'v9.0' }
  },

  // What's New 版本映射：当游戏首次进入某个微信版本时展示
  WHATSNEW_MAP: {
    'v4.0': { img:'images/whatsnew-4.0.jpg', ver:'微信 4.0 · 朋友圈' },
    'v5.0': { img:'images/whatsnew-5.0.png', ver:'微信 5.0 · 飞机大战' },
    'v6.0': { img:'images/whatsnew-6.2.jpg', ver:'微信 6.0' },
    'v6.6': { img:'images/whatsnew-6.6.1.jpg', ver:'微信 6.6 · 小游戏' },
    'v7.0': { img:'images/whatsnew-7.0.jpg', ver:'微信 7.0' },
    'v8.0': { img:'images/whatsnew-8.0.gif', ver:'微信 8.0' }
  },
  shownWhatsNew: [],  // 已展示过的版本
  lastVer: null,       // 上一轮的版本号，用于检测版本变化

  setEra(year, ver) {
    const info = this.ERA_MAP[year] || { era:'2011', ver:'v1.0' };
    const scene = document.getElementById('scene-game');
    scene.setAttribute('data-era', info.era);
    // 如果传入了明确的版本号（如同年份内有多个版本），优先使用
    document.getElementById('eraBarVer').textContent = ver || info.ver;
  },

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },

  // 可被点击打断的 sleep，用于消息显示间隔
  msgSleep(ms) {
    return new Promise(r => {
      this._skipResolve = () => { clearTimeout(tid); r(); };
      const tid = setTimeout(() => { this._skipResolve = null; r(); }, ms);
    });
  },

  // 点击加速：跳过当前消息等待
  skipCurrentDelay() {
    if (this._skipResolve) { this._skipResolve(); this._skipResolve = null; }
  },

  getMsgDelay(msg) {
    const len = (msg.text || msg.caption || '').length;
    if (msg.type === 'time') return 300;
    if (msg.type === 'image' && !msg.name) return 400;  // 场景图片，快速出现
    if (msg.type === 'image') return msg.name ? 800 : 400;
    if (msg.type === 'scene') {
      if (len <= 10) return 500;
      if (len <= 30) return 900;
      if (len <= 60) return 1400;
      if (len <= 100) return 2000;
      return Math.min(2800, 1000 + len * 20);
    }
    if (msg.type === 'narrator') return 400;
    // 普通对话气泡
    if (len <= 10) return 600;
    if (len <= 25) return 1000;
    if (len <= 40) return 1400;
    return Math.min(2500, 800 + len * 25);
  },

  // 将消息文本中的模板标记替换为玩家名字
  // {player} → 有名字时替换，没名字（playerName='我'）时替换为'你'
  // {player_call} → 有名字时替换为'名字，'（含逗号），没名字时替换为空串（去掉称呼）
  tpl(text) {
    if (!text) return text;
    const name = this.state.playerName;
    const hasName = name && name !== '我';
    return text
      .replace(/\{player_call\}/g, hasName ? name + '，' : '')
      .replace(/\{player\}/g, hasName ? name : '你');
  },

  // 平滑滚动到底部
  smoothScrollToBottom(el) {
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  },

  switchScene(id) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  // ===== 初始化 =====
  init() {
    // 加载跨周目数据
    this.meta = MetaSave.load();
    this._canSkipPrologue = this.meta.totalRuns > 0;

    // 直接从序章开始
    this.state.prologueStep = 0;
    this.renderPrologueScreen(0);
    document.getElementById('scene-prologue').addEventListener('click', () => this.advancePrologue());

    // 点击消息流区域可加速消息出现
    document.getElementById('messageFlow').addEventListener('click', (e) => {
      // 不拦截图片预览、按钮等交互元素的点击
      if (e.target.closest('.msg-screenshot, button, .clue-btn, .clue-card, .game-choice-btn, a')) return;
      this.skipCurrentDelay();
    });
  },

  // ===== What's New 过渡画面 =====
  showWhatsNew(verKey, callback) {
    this.dismissAchievementToast();
    const data = this.WHATSNEW_MAP[verKey];
    if (!data || this.shownWhatsNew.includes(verKey)) {
      if (callback) callback();
      return;
    }
    this.shownWhatsNew.push(verKey);

    const overlay = document.getElementById('whatsnewOverlay');
    const img = document.getElementById('whatsnewImg');
    const ver = document.getElementById('whatsnewVer');
    const btn = document.getElementById('whatsnewBtn');

    img.src = data.img;
    ver.textContent = data.ver;

    // Reset animation
    overlay.classList.remove('fade-out');
    overlay.classList.add('show');
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });

    const dismiss = () => {
      btn.removeEventListener('click', dismiss);
      overlay.removeEventListener('click', dismissClick);
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.remove('show', 'fade-out');
        overlay.style.opacity = '';
        if (callback) callback();
      }, 600);
    };

    // 点击按钮或空白区域关闭
    const dismissClick = (e) => {
      if (e.target === overlay || e.target === btn) dismiss();
    };
    btn.addEventListener('click', dismiss);
    overlay.addEventListener('click', dismissClick);
  },

  renderPrologueScreen(idx) {
    const screen = PROLOGUE_SCREENS[idx];
    if (!screen) return;
    const c = document.getElementById('prologueContent');
    c.innerHTML = '';

    // 包裹层
    const wrap = document.createElement('div');
    wrap.className = 'prologue-inner-wrap';

    // 前3屏：居中显示，用 JS 设 min-height 确保撑满
    if (idx < 3) {
      wrap.classList.add('spread');
      const availH = c.clientHeight - 80;
      if (availH > 0) {
        wrap.style.minHeight = availH + 'px';
      }
    }

    // 第1屏邮件使用逐字打出效果
    const isEmailScreen = screen.blocks.some(b => b.type === 'email-header' || b.type === 'email-body');

    screen.blocks.forEach((b, i) => {
      const d = document.createElement('div');
      d.className = 'typewriter-block';
      if (b.type === 'email-header') d.innerHTML = `<div class="email-header"></div>`;
      else if (b.type === 'email-body') {
        d.innerHTML = `<div class="email-body"></div>`;
        // 第1封邮件body后插入分组间隔（i=1表示第1封body）
        if (isEmailScreen && i === 1) {
          d.innerHTML += `<div class="email-group-gap"></div>`;
        }
      }
      else if (b.type === 'yaogaole') d.innerHTML = `<div class="yao-gao-le">${b.text}</div>`;
      else if (b.type === 'code') d.innerHTML = `<div class="code-block"><span class="ln">1</span><span class="tg">&lt;?</span><span class="kw">xml</span> <span class="at">version</span>=<span class="st">"1.0"</span><span class="tg">?&gt;</span><br><span class="ln">2</span><span class="tg">&lt;metainfo</span> <span class="at">filename</span>=<span class="st">"Account"</span><span class="tg">&gt;</span><br><span class="ln">3</span>  <span class="tg">&lt;struct</span> <span class="at">name</span>=<span class="st">"User"</span><span class="tg">&gt;</span><br><span class="ln">4</span>    <span class="tg">&lt;field</span> <span class="at">name</span>=<span class="st">"Username"</span> <span class="at">type</span>=<span class="st">"*char"</span><span class="tg">/&gt;</span><br><span class="ln">5</span>  <span class="tg">&lt;/struct&gt;</span><br><span class="ln">6</span><span class="tg">&lt;/metainfo&gt;</span></div>`;
      else if (b.type === 'code-caption') d.innerHTML = `<div class="code-caption">${b.text.replace(/\n/g,'<br>')}</div>`;
      else if (b.type === 'narration') d.innerHTML = `<div class="narration">${b.text.replace(/\n/g,'<br>')}</div>`;
      else if (b.type === 'narration-center') d.innerHTML = `<div class="narration-center">${b.text.replace(/\n/g,'<br>')}</div>`;
      else if (b.type === 'divider') d.innerHTML = `<div class="prologue-divider"></div>`;
      else if (b.type === 'era-danmaku') {
        d.style.display = 'none';
        d.dataset.danmaku = JSON.stringify(b.items);
      }
      else if (b.type === 'highlight') d.innerHTML = `<div class="highlight-text">${b.text}</div>`;
      else if (b.type === 'highlight-sub') d.innerHTML = `<div class="highlight-sub">${b.text}</div>`;
      else if (b.type === 'prologue-image') d.innerHTML = `<div style="text-align:center;margin:12px 0;"><img src="${b.src}" alt="${b.caption||''}" style="max-width:180px;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.3);"><div style="font-size:10px;color:#555;margin-top:6px;">${b.caption||''}</div></div>`;
      else if (b.type === 'quote') d.innerHTML = `<div class="quote-text">${b.text.replace(/\n/g,'<br>')}</div>`;
      wrap.appendChild(d);
    });

    c.appendChild(wrap);

    if (isEmailScreen) {
      this.typewriterEmailBlocks(c, screen.blocks);
    } else {
      wrap.querySelectorAll('.typewriter-block').forEach((d, i) => {
        setTimeout(() => d.classList.add('visible'), 200 + i * 450);
      });
    }

    // 弹幕层：检查是否有 era-danmaku 数据
    const danmakuEl = wrap.querySelector('[data-danmaku]');
    if (danmakuEl) {
      const items = JSON.parse(danmakuEl.dataset.danmaku);
      this.startDanmaku(items);
    } else {
      this.stopDanmaku();
    }

    c.scrollTop = 0;
  },

  // 邮件逐字打出效果
  async typewriterEmailBlocks(container, blocks) {
    this.state.prologueTyping = true;
    const els = container.querySelectorAll('.typewriter-block');
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const el = els[i];
      el.classList.add('visible');

      if (b.type === 'email-header' || b.type === 'email-body') {
        const target = el.querySelector('.' + b.type);
        target.classList.add('typing');
        const fullText = b.text;
        const speed = b.type === 'email-header' ? 18 : 28;
        let charIdx = 0;
        await new Promise(resolve => {
          const timer = setInterval(() => {
            if (charIdx < fullText.length) {
              const ch = fullText[charIdx];
              if (ch === '\n') {
                target.appendChild(document.createElement('br'));
              } else {
                target.appendChild(document.createTextNode(ch));
              }
              charIdx++;
              container.scrollTop = container.scrollHeight;
            } else {
              clearInterval(timer);
              target.classList.remove('typing');
              resolve();
            }
          }, speed);
        });
        await this.sleep(200);
      } else {
        await this.sleep(400);
      }
    }
    // 打字结束后，最后一个邮件块保留闪烁光标，等用户翻页时自然清除
    const lastEmailEl = container.querySelector('.typewriter-block:last-child .email-body, .typewriter-block:last-child .email-header');
    if (lastEmailEl) lastEmailEl.classList.add('idle-cursor');
    this.state.prologueTyping = false;
  },

  // ===== 弹幕系统 =====
  _danmakuTimer: null,
  _danmakuLayer: null,
  _danmakuLanes: null,  // 轨道占用时间戳

  startDanmaku(items) {
    this.stopDanmaku();
    const scene = document.getElementById('scene-prologue');
    let layer = scene.querySelector('.era-danmaku-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'era-danmaku-layer';
      scene.insertBefore(layer, scene.firstChild);
    }
    layer.innerHTML = '';
    this._danmakuLayer = layer;

    // 将屏幕垂直方向划分为若干轨道，每条弹幕约占 28px 高度
    const LANE_HEIGHT = 32;  // 轨道间距（px）
    const LANE_START = 0.06; // 起始位置（屏幕高度比例）
    const LANE_END = 0.90;   // 结束位置
    const sceneH = scene.offsetHeight || 600;
    const startPx = sceneH * LANE_START;
    const endPx = sceneH * LANE_END;
    const laneCount = Math.floor((endPx - startPx) / LANE_HEIGHT);
    // 每个轨道记录「可用时间」，过了这个时间才允许新弹幕进入
    this._danmakuLanes = new Array(laneCount).fill(0);

    let idx = 0;
    const spawn = () => {
      if (!this._danmakuLayer) return;
      const now = Date.now();

      // 找一个空闲轨道
      const freeLanes = [];
      for (let i = 0; i < laneCount; i++) {
        if (this._danmakuLanes[i] <= now) freeLanes.push(i);
      }
      if (freeLanes.length === 0) return; // 所有轨道满，跳过

      // 随机选一个空闲轨道
      const lane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      const topPx = startPx + lane * LANE_HEIGHT;

      const text = items[idx % items.length];
      const el = document.createElement('span');
      el.className = 'era-danmaku';
      el.textContent = text;

      const goRight = Math.random() > 0.5;
      el.classList.add(goRight ? 'd-ltr' : 'd-rtl');
      el.style.top = topPx + 'px';

      if (goRight) {
        el.style.left = '-10px';
      } else {
        el.style.right = '-10px';
      }

      const duration = 14 + Math.random() * 8;
      el.style.animationDuration = duration + 's';

      // 占用轨道：弹幕需要一段时间飘过后才释放轨道给下一条
      // 大约走过一半屏幕后（duration * 0.4）轨道可复用
      this._danmakuLanes[lane] = now + duration * 400;

      el.addEventListener('animationend', () => el.remove());
      layer.appendChild(el);
      idx++;
    };

    // 初始批量发射
    for (let i = 0; i < 4; i++) {
      setTimeout(() => spawn(), i * 700);
    }

    this._danmakuTimer = setInterval(spawn, 2400);
  },

  stopDanmaku() {
    if (this._danmakuTimer) {
      clearInterval(this._danmakuTimer);
      this._danmakuTimer = null;
    }
    if (this._danmakuLayer) {
      this._danmakuLayer.remove();
      this._danmakuLayer = null;
    }
  },

  advancePrologue() {
    if (this.state.prologueTyping) return;
    this.state.prologueStep++;
    if (this.state.prologueStep < PROLOGUE_SCREENS.length) {
      // 二周目起：点击两次即跳过序章所有屏
      if (this._canSkipPrologue && this.state.prologueStep >= 1) {
        this.state.prologueStep = PROLOGUE_SCREENS.length;
        this.showNameInput();
        return;
      }
      this.renderPrologueScreen(this.state.prologueStep);
    } else {
      // 序章结束，进入工卡起名
      this.showNameInput();
    }
  },

  // ===== 玩家起名（工卡样式）=====
  showNameInput() {
    this.stopDanmaku();
    this.switchScene('scene-choice');
    const el = document.getElementById('scene-choice');
    // 随机工号（6位）
    const badgeNo = String(Math.floor(Math.random() * 90000) + 10000).padStart(6, '0');
    // 二周目起预填上次的名字
    const meta = this.meta || MetaSave.load();
    const prefillName = meta.lastPlayerName || '';
    const runHint = meta.totalRuns > 0 ? `<div class="badge-run-hint">第 ${meta.totalRuns + 1} 周目</div>` : '';
    // 读取已保存的头像
    const savedAvatar = localStorage.getItem('wechat-sim-avatar');
    const avatarSrc = savedAvatar || 'images/badge-avatar.png';
    el.innerHTML = `<div class="badge-scene">
      <div class="badge-hint">你的工卡</div>
      ${runHint}
      <div class="badge-card">
        <div class="badge-lanyard"></div>
        <div class="badge-card-front">
          <div class="badge-number">${badgeNo}</div>
          <div class="badge-avatar" id="badgeAvatar">
            <img src="${avatarSrc}" alt="头像" id="badgeAvatarImg">
            <div class="badge-avatar-upload" id="badgeAvatarUpload">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
              <span>上传照片</span>
            </div>
            <input type="file" accept="image/*" id="badgeAvatarInput" style="display:none">
          </div>
          <div class="badge-name-area">
            <input type="text" id="playerNameInput" maxlength="8" placeholder="输入姓名" class="badge-name-input" value="${prefillName}">
            <div class="badge-dept-line">广州研发中心 · 微信项目组</div>
          </div>
          <div class="badge-bottom-bar">
            <span class="badge-tencent-logo">T</span>
            <span class="badge-tencent-text">Tencent 腾讯</span>
          </div>
        </div>
        <div class="badge-type-bar">
          <span class="badge-type-dot"></span>
          <span class="badge-type-text">正式员工</span>
        </div>
      </div>
      <button class="green-btn badge-confirm-btn" id="confirmNameBtn">确认入职</button>
    </div>`;
    const input = document.getElementById('playerNameInput');
    input.focus();
    // 如果有预填名字，光标移到末尾
    if (prefillName) {
      input.setSelectionRange(prefillName.length, prefillName.length);
    }

    // 头像上传逻辑
    const avatarUpload = document.getElementById('badgeAvatarUpload');
    const avatarInput = document.getElementById('badgeAvatarInput');
    const avatarImg = document.getElementById('badgeAvatarImg');
    // 如果已有上传头像，隐藏覆盖层
    if (savedAvatar) avatarUpload.classList.add('has-photo');

    avatarUpload.addEventListener('click', (e) => {
      e.stopPropagation();
      avatarInput.click();
    });
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      // 压缩图片后存入localStorage
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          // 居中裁切为正方形
          const min = Math.min(img.width, img.height);
          const sx = (img.width - min) / 2;
          const sy = (img.height - min) / 2;
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          avatarImg.src = dataUrl;
          avatarUpload.classList.add('has-photo');
          try { localStorage.setItem('wechat-sim-avatar', dataUrl); } catch(e) {}
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });

    const confirm = () => {
      const name = input.value.replace(/\s+/g, '').trim() || '我';
      this.state.playerName = name;
      this.enterGameScene();
    };
    document.getElementById('confirmNameBtn').addEventListener('click', confirm);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
  },

  // ===== 进入游戏场景 =====
  enterGameScene() {
    this.state.round = 1;
    this.state.initialStats = { ...this.state.stats };
    this.switchScene('scene-game');
    this.setEra('2011', 'demo');
    this.renderStatsPanel();
    // 浮窗先不显示，等仪表盘引导完成后才出现
    this.initStatsFab(false);
    // 通过聊天对话介绍背景和资源
    this.showChatIntro();
  },

  // ===== 数值浮窗（微信小程序浮窗风格） =====
  _fabInitialized: false,
  initStatsFab(showImmediately = true) {
    const fab = document.getElementById('statsFab');
    const overlay = document.getElementById('statsPanelOverlay');
    const closeBtn = document.getElementById('statsPanelClose');

    if (showImmediately) fab.classList.add('visible');

    // 防止重复绑定事件监听器
    if (this._fabInitialized) return;
    this._fabInitialized = true;

    // --- 拖拽支持 ---
    let isDragging = false;
    let dragMoved = false;
    let startX, startY, fabStartX, fabStartY;

    const onPointerDown = (e) => {
      isDragging = true;
      dragMoved = false;
      const rect = fab.getBoundingClientRect();
      const parentRect = fab.parentElement.getBoundingClientRect();
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      fabStartX = rect.left - parentRect.left;
      fabStartY = rect.top - parentRect.top;
      fab.style.transition = 'none';
      e.preventDefault();
    };
    const onPointerMove = (e) => {
      if (!isDragging) return;
      const cx = e.clientX || (e.touches && e.touches[0].clientX);
      const cy = e.clientY || (e.touches && e.touches[0].clientY);
      const dx = cx - startX;
      const dy = cy - startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      if (!dragMoved) return;
      const parent = fab.parentElement;
      const pw = parent.offsetWidth;
      const ph = parent.offsetHeight;
      let nx = fabStartX + dx;
      let ny = fabStartY + dy;
      nx = Math.max(0, Math.min(pw - fab.offsetWidth, nx));
      ny = Math.max(0, Math.min(ph - fab.offsetHeight, ny));
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      fab.style.left = nx + 'px';
      fab.style.top = ny + 'px';
    };
    const onPointerUp = () => {
      if (!isDragging) return;
      isDragging = false;
      fab.style.transition = '';
      if (!dragMoved) {
        overlay.classList.add('show');
        this.markAchSeen();
        // 引导阶段：玩家重新打开面板时移除重试提示
        const retryHint = document.getElementById('statsGuideRetryHint');
        if (retryHint) retryHint.remove();
        this.startUserFluctuation();
      }
    };
    fab.addEventListener('mousedown', onPointerDown);
    fab.addEventListener('touchstart', onPointerDown, {passive:false});
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('touchmove', onPointerMove, {passive:false});
    document.addEventListener('mouseup', onPointerUp);
    document.addEventListener('touchend', onPointerUp);

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      overlay.classList.remove('show');
      this.stopUserFluctuation();
      // 如果是引导阶段完成且已探索足够数值，触发继续
      if (this._statsGuideCallback && this._statsGuideReady) {
        const cb = this._statsGuideCallback;
        this._statsGuideCallback = null;
        this._statsGuideIncompleteCallback = null;
        this._statsGuideReady = false;
        cb();
      } else if (this._statsGuideCallback && !this._statsGuideReady && this._statsGuideIncompleteCallback) {
        this._statsGuideIncompleteCallback();
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('show');
        this.stopUserFluctuation();
        if (this._statsGuideCallback && this._statsGuideReady) {
          const cb = this._statsGuideCallback;
          this._statsGuideCallback = null;
          this._statsGuideIncompleteCallback = null;
          this._statsGuideReady = false;
          cb();
        } else if (this._statsGuideCallback && !this._statsGuideReady && this._statsGuideIncompleteCallback) {
          this._statsGuideIncompleteCallback();
        }
      }
    });
  },

  _statsGuideCallback: null,
  _statsGuideReady: false,

  showStatsFab() {
    document.getElementById('statsFab').classList.add('visible');
  },

  updateFabBadge() {
    const s = this.state.stats;
    const badge = document.getElementById('statsFabBadge');
    if (s.resource <= 15 || s.creativity <= 15) {
      badge.classList.add('warn');
    } else {
      badge.classList.remove('warn');
    }
  },

  // ===== 聊天式开场介绍（背景+资源+为什么做）=====
  async showChatIntro() {
    const flow = document.getElementById('messageFlow');
    flow.innerHTML = '';
    this.hideGameChoices();

    document.getElementById('roundInfo').textContent = '微信创业模拟器';
    document.getElementById('roundTitle').textContent = '第一天';
    document.getElementById('roundYear').textContent = '2011';

    document.getElementById('statsPanelOverlay').classList.remove('show');

    const messages = [
      { type:'time', text:'2010年12月 · 南方通讯大厦六楼' },
      { type:'scene', text:'{player}第一天来报到。走廊尽头，一间没有窗户的会议室。门口贴着一张A4纸：「微信项目组」。' },
      { type:'image', src:'images/blackroom-empty.jpg', caption:'小黑屋' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'{player_call}坐这儿。电脑到了自己装。' },
      { type:'scene', text:'屋里挤了十来个人。后来他们管这里叫「小黑屋」。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'我们一共13个人。iOS、Android、Symbian三个平台同时做。后台三个，产品两个，设计一个。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'米聊已经在做了，我们得快。公司那边说两个月内要能发布。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'说下我的想法。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'手机上，传统IM的在线状态没有意义了。我们要做的是一个免费发短信的工具。需求简单、清晰、易懂。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'做成一个需求单一的简单工具，会更有力。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'资源就这些。手中邮那边的开发也调过来了，弹药用完项目就没了。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'没有人知道未来会怎么样。开始做吧。' },
    ];

    for (const msg of messages) {
      const div = document.createElement('div');
      const t = this.tpl(msg.text);
      if (msg.type === 'time') {
        div.className = 'msg-time'; div.textContent = t;
      } else if (msg.type === 'scene') {
        div.className = 'msg-scene';
        div.innerHTML = t.replace(/\n/g,'<br>');
      } else if (msg.type === 'image') {
        if (msg.name) {
          div.className = 'msg-bubble';
          const imgAv = msg.avatar || msg.name.charAt(0);
          div.innerHTML = `<div class="msg-avatar ${msg.avatarClass||''}">${imgAv}</div><div class="msg-body"><div class="msg-name">${msg.name}</div><img class="msg-screenshot" src="${msg.src}" alt="${msg.caption||''}" data-src="${msg.src}" data-caption="${msg.caption||''}"><div style="font-size:11px;color:var(--text-hint);margin-top:4px;">${msg.caption||''}</div></div>`;
        } else {
          div.className = 'msg-scene';
          div.innerHTML = `${t ? t.replace(/\n/g,'<br>') + '<br>' : ''}<img class="msg-screenshot scene-img" src="${msg.src}" alt="${msg.caption||''}" data-src="${msg.src}" data-caption="${msg.caption||''}"><div style="font-size:11px;color:var(--text-hint);margin-top:6px;">${msg.caption||''}</div>`;
        }
        const imgEl = div.querySelector('.msg-screenshot');
        if (imgEl) {
          imgEl.addEventListener('click', () => {
            this.showScreenshotPreview(imgEl.dataset.src, imgEl.dataset.caption);
          });
        }
      } else {
        div.className = 'msg-bubble';
        const av = msg.avatar || (msg.name ? msg.name.charAt(0) : '?');
        div.innerHTML = `<div class="msg-avatar ${msg.avatarClass||''}">${av}</div><div class="msg-body"><div class="msg-name">${msg.name}</div><div class="msg-text">${t}</div></div>`;
      }
      flow.appendChild(div);
      await new Promise(r => requestAnimationFrame(() => {
        div.classList.add('visible');
        this.smoothScrollToBottom(flow);
        setTimeout(r, 200);
      }));
      await this.msgSleep(this.getMsgDelay(msg));
    }

    await this.msgSleep(400);

    // 小龙转头问你
    const askDiv = document.createElement('div');
    askDiv.className = 'msg-bubble';
    askDiv.innerHTML = `<div class="msg-avatar alan">龙</div><div class="msg-body"><div class="msg-name">小龙</div><div class="msg-text">你为什么想做这个？</div></div>`;
    flow.appendChild(askDiv);
    await new Promise(r => requestAnimationFrame(() => {
      askDiv.classList.add('visible');
      this.smoothScrollToBottom(flow);
      setTimeout(r, 200);
    }));
    await this.msgSleep(500);

    // 展示三个选项
    this.showPrologueMotivation(flow);
  },

  // 选项显示后滚动消息流到底部，确保最后一条消息不被遮盖
  scrollFlowAfterChoicesShow() {
    const flow = document.getElementById('messageFlow');
    requestAnimationFrame(() => {
      this.smoothScrollToBottom(flow);
    });
  },

  // 序章动机选择
  showPrologueMotivation(flow) {
    const MOTIVATION_OPTIONS = [
      { label:'A', text:'「我觉得这是个风口。手机会越来越普及，抢先做出来就是赢。」', tag:'务实派',
        feedback:'小龙后来在给团队的邮件中写道——\n「移动互联网才是未来的方向，手机是人的肢体的延伸，甚至比肢体更发达，因为通过手机可以连接整个世界。」\n\n方向看对了。但光看对方向不够，还得做对。' },
      { label:'B', text:'「短信太贵了，又不好用。我想做一个更好的替代品。」', tag:'产品派',
        feedback:'小龙在2010年那封邮件里写的是——\n「做成一个需求单一的简单工具，会更有力。」\n\n微信的第一份产品文档只有两页A4纸。核心定位四个字——免费短信。' },
      { label:'C', text:'「说实话，我也不确定。但我觉得可以试试看。」', tag:'探索派',
        feedback:'这很诚实。\n小龙后来说——「整个过程起点就是一两个小时，突然搭错了一个神经，写了那封邮件，就开始了。」\n\n最伟大的事情，有时候就是从「试试看」开始的。' }
    ];

    const el = document.getElementById('gameChoices');
    el.innerHTML = `<div class="game-choices-hint">选择你的回应</div>` + MOTIVATION_OPTIONS.map(o =>
      `<div class="game-choice-btn prologue-motive-btn" data-label="${o.label}"><div class="gc-label">${o.tag}</div><div class="gc-text">${o.text}</div></div>`).join('');
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();

    el.querySelectorAll('.prologue-motive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = btn.dataset.label;
        const opt = MOTIVATION_OPTIONS.find(o => o.label === label);
        this.hideGameChoices();
        this.showMotivationResult(flow, opt);
      });
    });
  },

  async showMotivationResult(flow, opt) {
    const pName = this.state.playerName || '我';

    // 玩家说的话
    const playerDiv = document.createElement('div');
    playerDiv.className = 'msg-bubble msg-bubble-right';
    playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${opt.text}</div></div>`;
    flow.appendChild(playerDiv);
    await new Promise(r => requestAnimationFrame(() => {
      playerDiv.classList.add('visible');
      this.smoothScrollToBottom(flow);
      setTimeout(r, 200);
    }));
    await this.msgSleep(800);

    // 反馈（系统通知风格，统一样式）
    const fbDiv = document.createElement('div');
    fbDiv.className = 'msg-scene';
    fbDiv.innerHTML = opt.feedback.replace(/\n/g,'<br>');
    flow.appendChild(fbDiv);
    await new Promise(r => requestAnimationFrame(() => {
      fbDiv.classList.add('visible');
      this.smoothScrollToBottom(flow);
      setTimeout(r, 200);
    }));
    await this.msgSleep(1000);

    // 小龙点头
    const nodDiv = document.createElement('div');
    nodDiv.className = 'msg-bubble';
    nodDiv.innerHTML = `<div class="msg-avatar alan">龙</div><div class="msg-body"><div class="msg-name">小龙</div><div class="msg-text">好。开始吧。</div></div>`;
    flow.appendChild(nodDiv);
    await new Promise(r => requestAnimationFrame(() => {
      nodDiv.classList.add('visible');
      this.smoothScrollToBottom(flow);
      setTimeout(r, 200);
    }));
    await this.msgSleep(600);

    // 进入仪表盘引导
    this.showStatsGuide(flow);
  },

  // ===== 仪表盘互动引导 =====
  async showStatsGuide(flow) {
    await this.msgSleep(300);

    // 系统提示（一条搞定，不重复）
    const sysDiv = document.createElement('div');
    sysDiv.className = 'msg-system-notice';
    sysDiv.id = 'statsGuideHint';
    sysDiv.innerHTML = `<div class="msn-text stats-guide-tap-hint">点击 <span style="font-family:monospace;color:#00ff41">>_</span> 查看你的家底</div>`;
    flow.appendChild(sysDiv);
    await new Promise(r => requestAnimationFrame(() => {
      sysDiv.classList.add('visible');
      this.smoothScrollToBottom(flow);
      setTimeout(r, 200);
    }));
    await this.msgSleep(400);

    // 显示 fab 图标（带引导动画）
    const fab = document.getElementById('statsFab');
    fab.classList.add('visible');
    fab.style.transform = 'scale(1.3)';
    setTimeout(() => { fab.style.transform = ''; }, 400);

    // 同时给 fab 加呼吸引导动画
    fab.classList.add('guide-pulse');

    // 准备面板内的引导内容
    this.renderStatsGuidePanel();

    // 注册回调：关闭面板后显示继续按钮
    this._statsGuideCallback = () => {
      this.showStatsGuideComplete(flow);
    };
    // 如果玩家未探索完就关闭面板，再次提示
    this._statsGuideIncompleteCallback = () => {
      this._showGuideRetryHint(flow);
    };
  },

  // 引导未完成时关闭面板的重新提示
  _showGuideRetryHint(flow) {
    // 如果已有提示，不重复添加
    if (document.getElementById('statsGuideRetryHint')) return;
    const hint = document.createElement('div');
    hint.className = 'msg-system-notice';
    hint.id = 'statsGuideRetryHint';
    hint.innerHTML = `<div class="msn-text stats-guide-tap-hint">还有卡片没看完，再点 <span style="font-family:monospace;color:#00ff41">>_</span> 看看</div>`;
    flow.appendChild(hint);
    requestAnimationFrame(() => {
      hint.classList.add('visible');
      this.smoothScrollToBottom(flow);
    });
  },

  // 在仪表盘面板内渲染引导式数值介绍
  renderStatsGuidePanel() {
    const statGuides = [
      { icon:'👥', label:'用户', value:'0', desc:'微信还没上线，一切从零开始。产品做好了，用户自然会来。', color:'#07c160', key:'users' },
      { icon:'⭐', label:'口碑', value:'0%', desc:'还没有人知道微信是什么。你的每个决策都会影响口碑。', color:'#ff9800', key:'reputation' },
      { icon:'💡', label:'创造力', value:'45%', desc:'13个人，没有流程，想到就干。人少，反而逼出最巧的办法。', color:'#9c27b0', key:'creativity' },
      { icon:'🔋', label:'资源', value:'30%', desc:'弹药有限。归零，项目就关了。', color:'#e91e63', key:'resource' }
    ];

    const panel = document.getElementById('statsPanel');
    panel.innerHTML = '<div class="stats-guide-intro-wrap">' +
      '<div class="stats-guide-grid stats-guide-grid-4">' +
      statGuides.map((s, i) =>
        `<div class="stats-guide-cell" data-idx="${i}" style="--card-color:${s.color}">` +
        `<div class="sgc-icon">${s.icon}</div>` +
        `<div class="sgc-value">${s.value}</div>` +
        `<div class="sgc-label">${s.label}</div>` +
        `<div class="sgc-desc">${s.desc}</div></div>`
      ).join('') +
      '</div>' +
      '<div class="stats-guide-progress" id="statsGuideProgress">点击卡片了解详情</div>' +
      '<div class="stats-guide-goal">' +
        '<div class="sgg-title">📋 萌芽期目标</div>' +
        '<div class="sgg-text">活下来，找到用户。在资源耗尽前，让微信被足够多的人用起来。</div>' +
        '<div class="sgg-hint">💡 好的产品应该是自然增长的</div>' +
      '</div>' +
      '</div>';

    let revealedCount = 0;
    const self = this;
    const totalCards = statGuides.length;
    panel.querySelectorAll('.stats-guide-cell').forEach(card => {
      card.addEventListener('click', function() {
        if (this.classList.contains('revealed')) return;
        this.classList.add('revealed');
        revealedCount++;
        const idx = parseInt(this.dataset.idx);
        if (idx === 3) this.classList.add('critical-pulse');
        document.getElementById('statsGuideProgress').textContent = `${revealedCount}/${totalCards}`;
        if (revealedCount >= 3) {
          self._statsGuideReady = true;
          document.getElementById('statsGuideProgress').innerHTML = `<span style="color:var(--wechat-green)">关闭面板继续</span>`;
        }
      });
    });
  },

  showStatsGuideComplete(flow) {
    // 移除引导提示和脉冲动画
    const hint = document.getElementById('statsGuideHint');
    if (hint) hint.remove();
    const fab = document.getElementById('statsFab');
    fab.classList.remove('guide-pulse');

    // 恢复正常面板内容
    this.renderStatsPanel();

    const tip = document.createElement('div');
    tip.className = 'msg-scene';
    tip.innerHTML = '你点了点头。弹药不多，但够用。';
    flow.appendChild(tip);
    requestAnimationFrame(() => {
      tip.classList.add('visible');
      this.smoothScrollToBottom(flow);
    });

    const el = document.getElementById('gameChoices');
    el.innerHTML = '<div class="game-choice-btn" id="statsGuideNext">' +
      '<div class="gc-text" style="text-align:center;color:var(--wechat-green);font-weight:500;">现在开工。</div>' +
      '</div>';
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();
    document.getElementById('statsGuideNext').addEventListener('click', () => {
      this.state.statsIntroShown = true;
      this.hideGameChoices();
      // 进入下一轮
      this.showRoundTransition(ROUNDS_DATA[1], () => {
        this.startGameRound(1);
      });
    });
  },

  // ===== 数值面板 =====
  STAT_META: [
    {icon:'👥',label:'用户',key:'users',fmt:'users'},
    {icon:'⭐',label:'口碑',key:'reputation'},
    {icon:'💡',label:'创造力',key:'creativity'},
    {icon:'🔋',label:'资源',key:'resource'}
  ],

  getStatDisplay(key, val) {
    if (key === 'users') return this.formatUsers(val);
    return val + '%';
  },

  renderStatsPanel() {
    const s = this.state.stats;
    const items = this.STAT_META.map(m => ({
      ...m,
      value: this.getStatDisplay(m.key, s[m.key]),
      raw: s[m.key]
    }));
    const panel = document.getElementById('statsPanel');
    // 确保面板自身有正确的网格类
    panel.className = 'sfp-grid sfp-grid-4';

    const PERCENT_COLORS = {
      reputation: '#ff9800',
      creativity: '#9c27b0',
      resource: '#e91e63'
    };

    panel.innerHTML = items.map(it => {
      const warn = (['resource','creativity'].includes(it.key) && s[it.key] <= 15) ? ' warning' : '';
      const isUsers = it.key === 'users';
      const fluctAttr = isUsers ? ' data-fluctuate="users"' : '';

      // 百分制指标加进度条
      let barHTML = '';
      if (!isUsers) {
        const pct = Math.max(0, Math.min(100, it.raw));
        const color = PERCENT_COLORS[it.key] || '#4caf50';
        barHTML = `<div class="stat-bar"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>`;
      }

      return '<div class="stat-item">' +
        `<div class="stat-icon">${it.icon}</div>` +
        `<span class="stat-value${warn}" id="sv-${it.key}"${fluctAttr}>${it.value}</span>` +
        barHTML +
        `<div class="stat-label">${it.label}</div>` +
        `<div class="stat-change" id="sc-${it.key}"></div>` +
        '</div>';
    }).join('');
    this.updateFabBadge();
    this.renderFeedback();
    this.renderAchInPanel();
    // 启动用户数波动
    this.startUserFluctuation();
  },

  renderFeedback() {
    const el = document.getElementById('statsFeedback');
    if (!el) return;
    const fb = this.state.currentFeedback;
    if (!fb || fb.length === 0) {
      el.innerHTML = '';
      return;
    }
    el.innerHTML = `<div class="sfp-feedback-title">💬 用户声音</div>` +
      fb.map(f => `<div class="feedback-item">
        <div class="feedback-avatar">👤</div>
        <div class="feedback-body">
          <div class="feedback-user">${f.user}</div>
          <div class="feedback-text ${f.type}">${f.text}</div>
        </div>
      </div>`).join('');
  },

  updateFeedback(roundOrBranch, choice) {
    const key = this.state.inBranch ? this.state.currentBranch : roundOrBranch;
    const pool = USER_FEEDBACK[key];
    if (pool && pool[choice]) {
      this.state.currentFeedback = pool[choice];
    }
  },

  showStatChange(key, delta) {
    const el = document.getElementById(`sc-${key}`);
    const valEl = document.getElementById(`sv-${key}`);
    if (!el) return;
    const pos = delta > 0;
    const display = key==='users'
      ? this.formatUsers(Math.abs(delta))
      : Math.abs(delta) + '%';
    el.className = `stat-change ${pos?'positive':'negative'} show`;
    el.textContent = (pos?'+':'-') + display;
    if (valEl) {
      valEl.classList.add(pos?'flash-up':'flash-down');
      valEl.classList.add(pos?'pop-up':'pop-down');
      setTimeout(() => valEl.classList.remove('flash-up','flash-down','pop-up','pop-down'), 1000);
    }
    setTimeout(() => el.classList.remove('show'), 2500);
  },

  applyStatsSilent(effects) {
    for (const [k,v] of Object.entries(effects)) {
      if (this.state.stats[k] === undefined) continue; // skip removed stats
      this.state.stats[k] += v;
      if (['reputation','creativity','resource'].includes(k)) {
        this.state.stats[k] = Math.max(0, Math.min(100, this.state.stats[k]));
      }
    }
  },

  // ===== 轮次过渡动画 =====
  showRoundTransition(rd, callback) {
    this.dismissAchievementToast();
    this.state.isTransitioning = true;
    const el = document.getElementById('roundTransition');
    document.getElementById('rtPhase').textContent = rd.phase;
    document.getElementById('rtRound').textContent = `ROUND ${this.state.round}`;
    document.getElementById('rtTitle').textContent = rd.title;
    document.getElementById('rtYear').textContent = rd.year;

    el.classList.remove('animate', 'fade-out');
    el.classList.add('show');
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.classList.add('animate');
    });

    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.classList.remove('show', 'animate', 'fade-out');
        this.state.isTransitioning = false;
        // 检查是否需要展示 What's New（仅在版本变化时）
        const eraInfo = this.ERA_MAP[rd.year];
        if (eraInfo && eraInfo.ver !== this.lastVer) {
          const prevVer = this.lastVer;
          this.lastVer = eraInfo.ver;
          if (prevVer) {
            // 版本发生了变化，展示新版本的 What's New
            this.showWhatsNew(eraInfo.ver, callback);
          } else {
            // 首次进入游戏，不展示 What's New
            if (callback) callback();
          }
        } else {
          if (callback) callback();
        }
      }, 500);
    }, 2000);
  },

  showBranchTransition(bd, callback) {
    this.dismissAchievementToast();
    this.state.isTransitioning = true;
    const el = document.getElementById('roundTransition');
    document.getElementById('rtPhase').textContent = '分支事件';
    document.getElementById('rtRound').textContent = '⚡';
    document.getElementById('rtTitle').textContent = bd.title;
    document.getElementById('rtYear').textContent = bd.year;

    el.classList.remove('animate', 'fade-out');
    el.classList.add('show');
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.classList.add('animate');
    });

    setTimeout(() => {
      el.classList.add('fade-out');
      setTimeout(() => {
        el.classList.remove('show', 'animate', 'fade-out');
        this.state.isTransitioning = false;
        if (callback) callback();
      }, 500);
    }, 1800);
  },

  // ===== 消息系统 =====
  showScreenshotPreview(src, caption) {
    const preview = document.getElementById('screenshotPreview');
    document.getElementById('spImage').src = src;
    document.getElementById('spCaption').textContent = caption || '';
    preview.classList.add('show');
  },

  addScreenshotButton(images, flow) {
    if (!flow) flow = document.getElementById('messageFlow');
    const btn = document.createElement('button');
    btn.className = 'screenshot-btn';
    btn.textContent = '📱 查看当时的产品界面';
    const card = document.createElement('div');
    card.className = 'screenshot-card';
    card.innerHTML = images.map(img =>
      `<img src="${img.src}" alt="${img.caption}" class="msg-screenshot" data-src="${img.src}" data-caption="${img.caption}">
       <div class="sc-caption">${img.caption}</div>`
    ).join('');
    btn.addEventListener('click', () => {
      card.classList.toggle('show');
      if (card.classList.contains('show')) {
        this.smoothScrollToBottom(flow);
      }
    });
    card.querySelectorAll('.msg-screenshot').forEach(img => {
      img.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showScreenshotPreview(img.dataset.src, img.dataset.caption);
      });
    });
    flow.appendChild(btn);
    flow.appendChild(card);
    this.smoothScrollToBottom(flow);
  },

  async showMessages(messages) {
    const flow = document.getElementById('messageFlow');
    for (const msg of messages) {
      const div = document.createElement('div');
      const t = this.tpl(msg.text);
      if (msg.type === 'time') {
        div.className = 'msg-time'; div.textContent = t;
      } else if (msg.type === 'scene') {
        div.className = 'msg-scene';
        div.innerHTML = t.replace(/\n/g,'<br>');
      } else if (msg.type === 'image') {
        if (msg.name) {
          div.className = 'msg-bubble';
          const imgAv = msg.avatar || msg.name.charAt(0);
          const imgAvClass = msg.avatarClass || '';
          div.innerHTML = `<div class="msg-avatar ${imgAvClass}">${imgAv}</div><div class="msg-body"><div class="msg-name">${msg.name}</div><img class="msg-screenshot" src="${msg.src}" alt="${msg.caption||''}" data-src="${msg.src}" data-caption="${msg.caption||''}"><div style="font-size:11px;color:var(--text-hint);margin-top:4px;">${msg.caption||''}</div></div>`;
        } else {
          div.className = 'msg-scene';
          div.innerHTML = `${t ? t.replace(/\n/g,'<br>') + '<br>' : ''}<img class="msg-screenshot scene-img" src="${msg.src}" alt="${msg.caption||''}" data-src="${msg.src}" data-caption="${msg.caption||''}"><div style="font-size:11px;color:var(--text-hint);margin-top:6px;">${msg.caption||''}</div>`;
        }
      } else if (msg.type === 'narrator') {
        div.className = 'msg-system-notice';
        div.innerHTML = `<div class="msn-text">${t}</div>`;
      } else if (msg.type === 'voice') {
        div.className = 'msg-bubble';
        div.innerHTML = `<div class="msg-avatar ${msg.avatarClass||''}">${msg.avatar}</div><div class="msg-body"><div class="msg-name">${msg.name}</div><div class="msg-text voice">${t}</div></div>`;
      } else {
        div.className = 'msg-bubble';
        const av = msg.avatar || (msg.name ? msg.name.charAt(0) : '?');
        div.innerHTML = `<div class="msg-avatar ${msg.avatarClass||''}">${av}</div><div class="msg-body"><div class="msg-name">${msg.name||''}</div><div class="msg-text">${t}</div></div>`;
      }
      flow.appendChild(div);
      // 图片点击预览
      const imgEl = div.querySelector('.msg-screenshot');
      if (imgEl) {
        imgEl.addEventListener('click', () => {
          this.showScreenshotPreview(imgEl.dataset.src, imgEl.dataset.caption);
        });
      }
      await new Promise(r => requestAnimationFrame(() => {
        div.classList.add('visible');
        this.smoothScrollToBottom(flow);
        setTimeout(r, 200);
      }));
      await this.msgSleep(this.getMsgDelay(msg));
    }
  },

  // ===== 计算选项的实际资源消耗（考虑膨胀系数） =====
  _getOptionResourceCost(opt) {
    if (!opt.immediateEffects || !opt.immediateEffects.resource) return 0;
    const raw = opt.immediateEffects.resource;
    if (raw >= 0) return 0; // 正数是获得资源，不算消耗
    return Math.round(raw * this.state.resourceCostMultiplier);
  },

  // ===== 获取当前阶段名 =====
  _getCurrentPhase() {
    const rd = ROUNDS_DATA[this.state.round];
    return rd ? rd.phase : '萌芽期';
  },

  // ===== 选项 =====
  showGameChoices(options, roundData) {
    const el = document.getElementById('gameChoices');
    const isMulti = roundData && roundData.multiSelect;

    if (isMulti) {
      // 多选题模式 —— 带实时资源校验
      const confirmText = roundData.multiSelectConfirmText || '确定';
      const minSelect = roundData.multiSelectMin || 1;
      const currentResource = this.state.stats.resource;
      const phase = this._getCurrentPhase();
      const phaseAlreadyRequested = !!this.state.phaseResourceRequested[phase];
      this._multiSelected = new Set();

      // 动态 hint：显示当前资源
      const hintText = `可多选，但资源只剩 ${currentResource}%。每个功能都有代价。`;

      el.innerHTML = `<div class="game-choices-hint" id="multiHint">${hintText}</div>` +
        options.map((o,i) => {
          const cost = this._getOptionResourceCost(o);
          const costAbs = Math.abs(cost);
          return `<div class="game-choice-btn game-choice-multi" data-idx="${i}" data-label="${o.label}" data-res-cost="${costAbs}"><div class="gc-check"><span class="gc-check-box"></span></div><div class="gc-main"><div class="gc-label">选项${o.label}</div><div class="gc-text">${o.text}</div>${o.cost ? `<div class="gc-cost" id="gc-cost-${o.label}">${o.cost}</div>` : ''}</div></div>`;
        }).join('') +
        `<div class="game-choice-confirm" id="multiConfirmBtn"><div class="gc-text" style="color:var(--text-hint);font-weight:500;text-align:center;">至少选择${minSelect}项</div></div>`;

      el.style.display = 'block';
      this.scrollFlowAfterChoicesShow();

      const confirmBtn = document.getElementById('multiConfirmBtn');
      const hintEl = document.getElementById('multiHint');

      const updateConfirmBtn = () => {
        const count = this._multiSelected.size;
        if (count < minSelect) {
          confirmBtn.classList.remove('active', 'resource-warning', 'resource-blocked');
          confirmBtn.innerHTML = `<div class="gc-text" style="color:var(--text-hint);font-weight:500;text-align:center;">至少选择${minSelect}项</div>`;
          if (hintEl) hintEl.textContent = hintText;
          return;
        }
        // 计算已选总消耗
        const selectedOpts = options.filter(o => this._multiSelected.has(o.label));
        let totalCost = 0;
        for (const opt of selectedOpts) {
          totalCost += Math.abs(this._getOptionResourceCost(opt));
        }
        const deficit = totalCost - currentResource;

        if (deficit <= 0) {
          // 资源够用
          confirmBtn.classList.add('active');
          confirmBtn.classList.remove('resource-warning', 'resource-blocked');
          confirmBtn.innerHTML = `<div class="gc-text" style="color:var(--wechat-green);font-weight:500;text-align:center;">${confirmText}</div>`;
          if (hintEl) hintEl.textContent = `已选消耗 ${totalCost}% / 可用 ${currentResource}%`;
          hintEl.classList.remove('resource-hint-warn');
        } else if (!phaseAlreadyRequested) {
          // 资源不够 + 本阶段未申请过 → 可以向总部申请
          confirmBtn.classList.add('active', 'resource-warning');
          confirmBtn.classList.remove('resource-blocked');
          confirmBtn.innerHTML = `<div class="gc-text" style="font-weight:500;text-align:center;">⚠️ 资源不足（差${deficit}%）· 需向总部申请</div>`;
          if (hintEl) {
            hintEl.textContent = `已选消耗 ${totalCost}% / 可用 ${currentResource}% — 超出 ${deficit}%`;
            hintEl.classList.add('resource-hint-warn');
          }
        } else {
          // 资源不够 + 本阶段已申请过 → 不可点击
          confirmBtn.classList.remove('active', 'resource-warning');
          confirmBtn.classList.add('resource-blocked');
          confirmBtn.innerHTML = `<div class="gc-text" style="font-weight:500;text-align:center;">❌ 本阶段已无法申请，请减少选项</div>`;
          if (hintEl) {
            hintEl.textContent = `已选消耗 ${totalCost}% / 可用 ${currentResource}% — 本阶段资源申请次数已用完`;
            hintEl.classList.add('resource-hint-warn');
          }
        }
      };

      el.querySelectorAll('.game-choice-multi').forEach(btn => {
        btn.addEventListener('click', () => {
          const label = btn.dataset.label;
          if (this._multiSelected.has(label)) {
            this._multiSelected.delete(label);
            btn.classList.remove('selected');
          } else {
            this._multiSelected.add(label);
            btn.classList.add('selected');
          }
          updateConfirmBtn();
        });
      });

      confirmBtn.addEventListener('click', () => {
        if (this._multiSelected.size < minSelect) return;
        if (confirmBtn.classList.contains('resource-blocked')) return;
        // 判断是否超支需要申请
        const selectedOpts = options.filter(o => this._multiSelected.has(o.label));
        let totalCost = 0;
        for (const opt of selectedOpts) {
          totalCost += Math.abs(this._getOptionResourceCost(opt));
        }
        const deficit = totalCost - currentResource;
        if (deficit > 0) {
          // 超支 → 进入资源申请流程
          this._pendingMultiRoundData = roundData;
          this._pendingMultiDeficit = deficit;
          this.hideGameChoices();
          this._showMultiResourceRequest(roundData, deficit);
        } else {
          this.handleMultiChoice(roundData);
        }
      });
    } else {
      // 单选题模式 —— 带资源不足提示
      const currentResource = this.state.stats.resource;
      el.innerHTML = `<div class="game-choices-hint">选择你的回应</div>` + options.map((o,i) => {
        const cost = Math.abs(this._getOptionResourceCost(o));
        const insufficient = cost > currentResource;
        const costClass = insufficient ? 'gc-cost gc-cost-warn' : 'gc-cost';
        const costText = o.cost ? (insufficient ? `${o.cost}<span class="gc-cost-alert"> ⚠️ 资源不足</span>` : o.cost) : '';
        return `<div class="game-choice-btn${insufficient ? ' resource-insufficient' : ''}" data-idx="${i}"><div class="gc-label">选项${o.label}</div><div class="gc-text">${o.text}</div>${costText ? `<div class="${costClass}">${costText}</div>` : ''}</div>`;
      }).join('');
      el.style.display = 'block';
      this.scrollFlowAfterChoicesShow();
      el.querySelectorAll('.game-choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const opt = options[idx];
          const cost = Math.abs(this._getOptionResourceCost(opt));
          if (cost > currentResource) {
            // 单选也需要资源申请
            const phase = this._getCurrentPhase();
            const phaseAlreadyRequested = !!this.state.phaseResourceRequested[phase];
            if (phaseAlreadyRequested) {
              // 本阶段已申请过，不能选
              this._showCannotAffordToast();
              return;
            }
            // 进入资源申请
            this._pendingSingleChoiceIdx = idx;
            this.hideGameChoices();
            this._showSingleResourceRequest(options, idx, cost - currentResource);
          } else {
            this.handleChoice(idx);
          }
        });
      });
    }
  },

  // 资源不足提示 toast
  _showCannotAffordToast() {
    const toast = document.getElementById('achievementToast');
    document.getElementById('atIcon').textContent = '⚠️';
    document.getElementById('atName').textContent = '本阶段已无法申请资源';
    document.getElementById('atDesc').textContent = '请选择消耗更少的方案';
    toast.querySelector('.at-title').textContent = '';
    toast.classList.add('show');
    setTimeout(() => { toast.classList.add('fade-out'); setTimeout(() => { toast.classList.remove('show', 'fade-out'); }, 300); }, 2000);
  },

  // ===== 多选题超支 → 资源申请场景 =====
  async _showMultiResourceRequest(roundData, deficit) {
    const phase = this._getCurrentPhase();
    const data = RESOURCE_REQUEST_DATA[phase];
    if (!data) { this.showGameChoices(roundData.options, roundData); return; }

    const flow = document.getElementById('messageFlow');

    // 资源告急分隔线
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = '—— 资源告急 ——';
    flow.appendChild(timeDiv);
    await new Promise(r => requestAnimationFrame(() => { timeDiv.classList.add('visible'); r(); }));
    await this.msgSleep(400);

    // 团队反馈
    await this.showMessages(data.messages);

    // 小龙问
    await this.showMessages([
      { name:'小龙', avatar:'龙', avatarClass:'alan', text: data.xiaolongAsk }
    ]);

    // 选项
    const creativityPenalty = 8 + (this.state.resourceRequests * 3);
    const el = document.getElementById('gameChoices');
    el.innerHTML = `<div class="game-choices-hint">资源决策 · 本阶段仅一次机会</div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="accept"><div class="gc-label">A</div><div class="gc-text">${data.acceptLine}</div><div class="gc-cost">🔋 资源 +${data.amount} · ⚠️ 资源充裕后精力易分散，创造力 -${creativityPenalty}%</div></div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="refuse"><div class="gc-label">B</div><div class="gc-text">自己想办法，减少选项</div><div class="gc-cost">退回选择界面，重新规划</div></div>`;
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();

    el.querySelectorAll('.resource-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        this.hideGameChoices();
        if (action === 'accept') {
          // 接受：补资源 + 立即扣创新度 + 标记本阶段已用
          this.state.resourceRequests++;
          this.state.phaseResourceRequested[phase] = true;
          this.applyStatsSilent({ resource: data.amount, creativity: -creativityPenalty });
          this.state.pendingStatChanges.resource = (this.state.pendingStatChanges.resource || 0) + data.amount;
          this.state.pendingStatChanges.creativity = (this.state.pendingStatChanges.creativity || 0) - creativityPenalty;
          this.state.resourceCostMultiplier *= 1.15;
          this.state._resourceRequestCreativityPenalty = creativityPenalty;

          // 玩家台词
          const playerDiv = document.createElement('div');
          playerDiv.className = 'msg-bubble msg-bubble-right';
          playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${data.acceptLine}</div></div>`;
          flow.appendChild(playerDiv);
          await new Promise(r => requestAnimationFrame(() => { playerDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
          await this.msgSleep(800);

          await this.showMessages(data.acceptResponse);
          this.renderStatsPanel();
          await this.msgSleep(600);

          // 申请完成后，继续多选提交
          this.handleMultiChoice(roundData);
        } else {
          // 拒绝：退回多选界面，保留已选状态
          const refuseDiv = document.createElement('div');
          refuseDiv.className = 'msg-bubble msg-bubble-right';
          refuseDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">不用。我们自己想办法。</div></div>`;
          flow.appendChild(refuseDiv);
          await new Promise(r => requestAnimationFrame(() => { refuseDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
          await this.msgSleep(600);

          await this.showMessages([
            { name:'小龙', avatar:'龙', avatarClass:'alan', text:'嗯。那就想清楚再动手。' }
          ]);
          await this.msgSleep(400);
          // 重新展示多选界面（保留已选状态会被重建，需要重新选）
          this.showGameChoices(roundData.options, roundData);
        }
      });
    });
  },

  // ===== 单选题超支 → 资源申请场景 =====
  async _showSingleResourceRequest(options, choiceIdx, deficit) {
    const phase = this._getCurrentPhase();
    const data = RESOURCE_REQUEST_DATA[phase];
    const roundData = this.state.inBranch ? BRANCHES_DATA[this.state.currentBranch] : ROUNDS_DATA[this.state.round];
    if (!data) { this.handleChoice(choiceIdx); return; }

    const flow = document.getElementById('messageFlow');

    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = '—— 资源告急 ——';
    flow.appendChild(timeDiv);
    await new Promise(r => requestAnimationFrame(() => { timeDiv.classList.add('visible'); r(); }));
    await this.msgSleep(400);

    await this.showMessages(data.messages);
    await this.showMessages([
      { name:'小龙', avatar:'龙', avatarClass:'alan', text: data.xiaolongAsk }
    ]);

    const creativityPenalty = 8 + (this.state.resourceRequests * 3);
    const el = document.getElementById('gameChoices');
    el.innerHTML = `<div class="game-choices-hint">资源决策 · 本阶段仅一次机会</div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="accept"><div class="gc-label">A</div><div class="gc-text">${data.acceptLine}</div><div class="gc-cost">🔋 资源 +${data.amount} · 创造力立即 -${creativityPenalty}%</div></div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="refuse"><div class="gc-label">B</div><div class="gc-text">自己想办法，换个方案</div><div class="gc-cost">退回选择界面</div></div>`;
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();

    el.querySelectorAll('.resource-req-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        this.hideGameChoices();
        if (action === 'accept') {
          this.state.resourceRequests++;
          this.state.phaseResourceRequested[phase] = true;
          this.applyStatsSilent({ resource: data.amount, creativity: -creativityPenalty });
          this.state.pendingStatChanges.resource = (this.state.pendingStatChanges.resource || 0) + data.amount;
          this.state.pendingStatChanges.creativity = (this.state.pendingStatChanges.creativity || 0) - creativityPenalty;
          this.state.resourceCostMultiplier *= 1.15;

          const playerDiv = document.createElement('div');
          playerDiv.className = 'msg-bubble msg-bubble-right';
          playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${data.acceptLine}</div></div>`;
          flow.appendChild(playerDiv);
          await new Promise(r => requestAnimationFrame(() => { playerDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
          await this.msgSleep(800);

          await this.showMessages(data.acceptResponse);
          this.renderStatsPanel();
          await this.msgSleep(600);

          // 申请完成后，继续执行该选择
          this.handleChoice(choiceIdx);
        } else {
          const refuseDiv = document.createElement('div');
          refuseDiv.className = 'msg-bubble msg-bubble-right';
          refuseDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">不用。我们换个方案。</div></div>`;
          flow.appendChild(refuseDiv);
          await new Promise(r => requestAnimationFrame(() => { refuseDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
          await this.msgSleep(600);

          await this.showMessages([
            { name:'小龙', avatar:'龙', avatarClass:'alan', text:'嗯。' }
          ]);
          await this.msgSleep(400);
          // 重新展示选项界面
          this.showGameChoices(roundData.options, roundData);
        }
      });
    });
  },

  hideGameChoices() { document.getElementById('gameChoices').style.display = 'none'; },

  // ===== 结果以对话形式展示 =====
  async showResultAsChat(result) {
    const flow = document.getElementById('messageFlow');

    // 标题分隔
    const titleDiv = document.createElement('div');
    titleDiv.className = 'msg-time';
    titleDiv.textContent = `—— ${result.title} ——`;
    flow.appendChild(titleDiv);
    this.smoothScrollToBottom(flow);
    await this.msgSleep(500);

    // 结果对话消息——检查是否有 publish-break 分割点
    if (result.messages) {
      const breakIdx = result.messages.findIndex(m => m.type === 'publish-break');
      if (breakIdx !== -1) {
        // 先播放 break 之前的消息（开发/准备阶段）
        const preMessages = result.messages.slice(0, breakIdx);
        const postMessages = result.messages.slice(breakIdx + 1);
        if (preMessages.length > 0) {
          await this.showMessages(preMessages);
        }
        await this.msgSleep(300);

        // 显示"发布"按钮，等待玩家点击
        const curData = this.state.inBranch ? BRANCHES_DATA[this.state.currentBranch] : ROUNDS_DATA[this.state.round];
        const publishLabel = (curData && curData.continueText) ? curData.continueText : '发布';
        await new Promise(resolve => {
          const el = document.getElementById('gameChoices');
          el.innerHTML = '<div class="game-choice-btn" id="publishBreakBtn" style="text-align:center;">' +
            `<div class="gc-text" style="color:var(--wechat-green);font-weight:500;">${publishLabel} →</div></div>`;
          el.style.display = 'block';
          this.scrollFlowAfterChoicesShow();
          document.getElementById('publishBreakBtn').addEventListener('click', () => {
            this.hideGameChoices();
            // 发布后，版本号更新为当前轮的版本
            if (curData && curData.ver) {
              document.getElementById('eraBarVer').textContent = curData.ver;
            }
            resolve();
          });
        });

        // 点击后播放 break 之后的消息（上线后反应）
        await this.msgSleep(300);
        if (postMessages.length > 0) {
          await this.showMessages(postMessages);
        }
      } else {
        // 没有 publish-break，正常播放全部消息
        await this.showMessages(result.messages);
      }
    }

    await this.msgSleep(300);

    // 系统反思（如有）——独立卡片样式，不用气泡
    if (result.reflection) {
      const reflectDiv = document.createElement('div');
      reflectDiv.className = 'msg-reflection';
      reflectDiv.innerHTML = `<div class="msg-reflection-inner"><div class="msg-reflection-label">复盘</div><div class="msg-reflection-text">${result.reflection}</div></div>`;
      flow.appendChild(reflectDiv);
      await new Promise(r => requestAnimationFrame(() => {
        reflectDiv.classList.add('visible');
        this.smoothScrollToBottom(flow);
        setTimeout(r, 200);
      }));
      await this.msgSleep(300);
    }

    // 历史档案按钮（嵌在消息流中，图文混排）
    const currentRoundData = ROUNDS_DATA[this.state.round];
    const archive = result.archive || (currentRoundData && currentRoundData.archive);
    if (archive) {
      const archBtn = document.createElement('button');
      archBtn.className = 'clue-btn';
      archBtn.textContent = '📂 解锁历史档案';
      const archCard = document.createElement('div');
      archCard.className = 'clue-card';
      archCard.style.borderLeftColor = '#f0a040';
      // 档案标题
      let archHTML = `<div class="clue-title" style="color:#f0a040;">真实选择：${archive.realChoice}</div>`;
      // 图文混排 sections
      if (archive.sections) {
        for (const sec of archive.sections) {
          if (sec.text) {
            archHTML += `<div class="clue-text">${sec.text}</div>`;
          }
          if (sec.img) {
            archHTML += `<div class="archive-img-wrap"><img class="clue-img" src="${sec.img}" alt="${sec.caption||''}" data-src="${sec.img}" data-caption="${sec.caption||''}"><div class="clue-img-caption">${sec.caption||''}</div></div>`;
          }
        }
      } else if (archive.text) {
        archHTML += `<div class="clue-text">${archive.text}</div>`;
      }
      if (archive.quote) {
        archHTML += `<div class="clue-text" style="color:var(--link);font-style:italic;margin-top:10px;padding:10px 14px;background:rgba(87,107,149,0.06);border-radius:8px;border-left:3px solid var(--link);">"${archive.quote}"</div>`;
      }
      // 额外截图（兼容旧数据）
      if (result.screenshots && result.screenshots.length > 0) {
        archHTML += `<div class="archive-screenshots">`;
        for (const img of result.screenshots) {
          archHTML += `<div class="archive-img-wrap"><img class="clue-img" src="${img.src}" alt="${img.caption}" data-src="${img.src}" data-caption="${img.caption}"><div class="clue-img-caption">${img.caption}</div></div>`;
        }
        archHTML += `</div>`;
      }
      archCard.innerHTML = archHTML;
      archBtn.addEventListener('click', () => {
        archCard.classList.toggle('show');
        if (!this.state.archivesViewed.includes(this.state.round)) this.state.archivesViewed.push(this.state.round);
      });
      // 图片点击预览
      archCard.querySelectorAll('.clue-img').forEach(img => {
        img.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showScreenshotPreview(img.dataset.src, img.dataset.caption);
        });
      });
      flow.appendChild(archBtn);
      flow.appendChild(archCard);
      this.smoothScrollToBottom(flow);
    }

    await this.msgSleep(200);

    // 底部"继续"按钮——进入结算过场
    // 如果 messages 中有 publish-break，"发布/上线"按钮已在前面展示，这里统一用"继续"
    // 如果没有 publish-break，使用 continueText（如"上线"）
    const hasPublishBreak = result.messages && result.messages.some(m => m.type === 'publish-break');
    const curData2 = this.state.inBranch ? BRANCHES_DATA[this.state.currentBranch] : ROUNDS_DATA[this.state.round];
    const continueLabel = hasPublishBreak ? '继续' : ((curData2 && curData2.continueText) ? curData2.continueText : '继续');
    const el = document.getElementById('gameChoices');
    el.innerHTML = '<div class="game-choice-btn" id="continueBtn" style="text-align:center;">' +
      `<div class="gc-text" style="color:var(--wechat-green);font-weight:500;">${continueLabel} →</div></div>`;
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();
    document.getElementById('continueBtn').addEventListener('click', () => {
      this.hideGameChoices();
      // 如果本轮没有 publish-break，在"继续"时更新版本号
      if (!hasPublishBreak && curData2 && curData2.ver) {
        document.getElementById('eraBarVer').textContent = curData2.ver;
      }
      // 进入结算过场（用户反馈弹幕+数值结算），完成后再进下一轮/分支
      const afterSettle = () => {
        if (this.state.pendingBranch) {
          const br = this.state.pendingBranch;
          this.state.pendingBranch = null;
          this.startBranch(br);
        } else {
          this.nextRound();
        }
      };
      this.showSettlement(afterSettle);
    });
  },

  // ===== 成就 =====
  dismissAchievementToast() {
    const t = document.getElementById('achievementToast');
    if (t.classList.contains('show')) {
      t.classList.add('fade-out');
      setTimeout(() => { t.classList.remove('show', 'fade-out'); }, 300);
    }
    if (this._achTimer) { clearTimeout(this._achTimer); this._achTimer = null; }
  },

  showAchievement(icon, name, desc) {
    if (this.state.achievements.includes(name)) return;
    this.state.achievements.push(name);
    document.getElementById('atIcon').textContent = icon;
    document.getElementById('atName').textContent = name;
    document.getElementById('atDesc').textContent = desc;
    const t = document.getElementById('achievementToast');
    t.classList.remove('fade-out');
    t.classList.add('show');
    if (this._achTimer) clearTimeout(this._achTimer);
    this._achTimer = setTimeout(() => this.dismissAchievementToast(), 3500);
    this.updateAchFab();
  },

  updateAchFab() {
    // 成就已整合到仪表盘面板内，更新面板中的成就区域 + FAB红点
    this.renderAchInPanel();
    this.updateAchBadge();
  },

  updateAchBadge() {
    const badge = document.getElementById('statsFabAchBadge');
    if (!badge) return;
    const newCount = this.state.achievements.length - this.state.achSeenCount;
    if (newCount > 0) {
      badge.textContent = newCount;
      badge.classList.add('show');
    } else {
      badge.classList.remove('show');
    }
  },

  markAchSeen() {
    this.state.achSeenCount = this.state.achievements.length;
    this.updateAchBadge();
  },

  // 成就定义（round = 该成就最早可见的轮次）
  ACH_REGISTRY: [
    // ===== 第一章：萌芽期（Round 1-3） =====
    {icon:'🛋️',name:'南通6楼的幽灵',desc:'你可能发明了另一个邮箱。',hint:'试试在第2轮做一个不同寻常的选择',chapter:1,round:2},
    {icon:'✨',name:'极简主义者',desc:'你做了一个无法被超越的功能。',hint:'极简方能不被超越',chapter:1,round:3},
    {icon:'💪',name:'全都要',desc:'资源撑得住吗？',hint:'试试全选',chapter:1,round:3},
    {icon:'🏃',name:'日拱一卒',desc:'每一步都踩在了历史的脚印上。',hint:'每一步都踩在历史的脚印上',chapter:1,round:3},
    {icon:'🧘',name:'克制大师',desc:'你从未选择最激进的那条路。',hint:'从不选择最激进的那条路',chapter:1,round:3},
    // ===== 第二章：爆发期（Round 4-7） =====
    {icon:'🏛️',name:'有边界的广场',desc:'40个版本，只为一条规则。',hint:'40个版本只为一条规则',chapter:2,round:4},
    {icon:'💰',name:'商业鬼才',desc:'营收破千万，但用户还在吗？',hint:'让营收突破1000M',chapter:2,round:4},
    {icon:'💸',name:'卡券大王',desc:'优惠券发了一地，效果嘛……',hint:'在第6轮尝试发卡券',chapter:2,round:6},
    {icon:'💣',name:'偷袭珍珠港',desc:'连续两轮闪击战，对手措手不及。',hint:'在第6轮和第7轮都选择最激进的路线',chapter:2,round:7},
    {icon:'🧨',name:'技术债务之王',desc:'春晚那晚，系统炸了。',hint:'积累过多技术债务',chapter:2,round:4},
    {icon:'💛',name:'用户是目的',desc:'用户不是手段，是目的本身。',hint:'始终把用户放在第一位',chapter:2,round:4},
    // ===== 第三章：平台期（Round 8-10） =====
    {icon:'📚',name:'Allen的书架',desc:'长期主义者的书架上，总有一些不同的东西。',hint:'坚持长期主义路线',chapter:3,round:8},
    {icon:'🎯',name:'细节之神',desc:'触发了两个最隐蔽的分支。',hint:'找到隐藏的分支',chapter:3,round:8},
    {icon:'❤️',name:'赤子之心',desc:'口碑始终在线，从未商业优先。',hint:'保持高口碑且从不商业优先',chapter:3,round:8},
    {icon:'📜',name:'历史学家',desc:'查看了所有的历史档案。',hint:'查看所有历史档案',chapter:3,round:8},
  ],

  // 获取当前章节编号
  _getCurrentChapter() {
    const r = this.state.round;
    if (r <= 3) return 1;
    if (r <= 7) return 2;
    if (r <= 10) return 3;
    if (r <= 12) return 4;
    if (r <= 14) return 5;
    return 6;
  },

  // 渐进式解锁：只显示当前轮次及之前可见的成就
  _getMaxVisibleRound() {
    return Math.min(this.state.round, 10); // demo上限Round 10
  },

  renderAchInPanel() {
    const el = document.getElementById('sfpAchievements');
    if (!el) return;
    const achCount = this.state.achievements.length;
    const maxRound = this._getMaxVisibleRound();
    const visibleAchs = this.ACH_REGISTRY.filter(a => a.round <= maxRound);
    const unlockedAchs = visibleAchs.filter(a => this.state.achievements.includes(a.name));
    const lockedCount = visibleAchs.length - unlockedAchs.length;

    let html = `<div class="sfp-ach-title">⭐ 成就 <span class="sfp-ach-badge">${achCount}/${visibleAchs.length}</span></div><div class="ach-list">`;

    if (unlockedAchs.length > 0) {
      html += unlockedAchs.map(a => {
        return `<div class="ach-item">
          <div class="ach-item-icon">${a.icon}</div>
          <div class="ach-item-info">
            <div class="ach-item-name">${a.name}</div>
            <div class="ach-item-desc">${a.desc}</div>
          </div>
        </div>`;
      }).join('');
    } else {
      html += '<div class="ach-empty-hint">还没有解锁成就，继续探索吧</div>';
    }

    if (lockedCount > 0) {
      html += `<div class="ach-locked-summary">🔒 还有 ${lockedCount} 个成就等待发现</div>`;
    }
    html += '</div>';
    el.innerHTML = html;
  },

  // ===== 延迟效果 =====
  processDelayedEffects() {
    const toProcess = this.state.delayedEffects.filter(e => e.triggerRound <= this.state.round);
    for (const ef of toProcess) {
      this.applyStatsSilent(ef.effects);
    }
    this.state.delayedEffects = this.state.delayedEffects.filter(e => e.triggerRound > this.state.round);
  },

  // ===== 资源申请机制（轮间触发） =====
  shouldTriggerResourceRequest(nextRound) {
    const phase = nextRound.phase;
    // 如果本阶段已经申请过，不再触发
    if (this.state.phaseResourceRequested[phase]) return false;
    const s = this.state.stats;
    const opts = nextRound.options || [];
    const affordableCount = opts.filter(opt => {
      const cost = (opt.immediateEffects && opt.immediateEffects.resource) || 0;
      return s.resource + cost >= 0;
    }).length;
    return affordableCount <= 1;
  },

  async showResourceRequest(nextRound, callback) {
    const phase = nextRound.phase;
    const data = RESOURCE_REQUEST_DATA[phase];
    if (!data) { callback(); return; }

    const flow = document.getElementById('messageFlow');
    flow.innerHTML = '';

    // 时间标签
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = '—— 资源告急 ——';
    flow.appendChild(timeDiv);
    await new Promise(r => requestAnimationFrame(() => { timeDiv.classList.add('visible'); r(); }));
    await this.msgSleep(400);

    // 团队成员抱怨
    await this.showMessages(data.messages);

    // 小龙问玩家
    await this.showMessages([
      { name:'小龙', avatar:'龙', avatarClass:'alan', text: data.xiaolongAsk }
    ]);

    // 展示两个选项
    const creativityPenalty = 8 + (this.state.resourceRequests * 3);
    const el = document.getElementById('gameChoices');
    el.innerHTML = `<div class="game-choices-hint">资源决策 · 本阶段仅一次机会</div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="accept"><div class="gc-label">A</div><div class="gc-text">${data.acceptLine}</div><div class="gc-cost">🔋 资源 +${data.amount} · 创造力立即 -${creativityPenalty}%</div></div>` +
      `<div class="game-choice-btn resource-req-btn" data-action="refuse"><div class="gc-label">B</div><div class="gc-text">${data.refuseLine}</div><div class="gc-cost">🔋 资源不变 · 逼出更巧的方案</div></div>`;
    el.style.display = 'block';
    this.scrollFlowAfterChoicesShow();

    el.querySelectorAll('.resource-req-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        this.hideGameChoices();
        this._handleResourceRequest(action === 'accept', data, phase, callback);
      });
    });
  },

  async _handleResourceRequest(accepted, data, phase, callback) {
    const flow = document.getElementById('messageFlow');

    if (accepted) {
      this.state.resourceRequests++;
      this.state.phaseResourceRequested[phase] = true;  // 标记本阶段已用
      const creativityPenalty = 8 + ((this.state.resourceRequests - 1) * 3);
      // 立即扣创新度 + 补资源
      this.applyStatsSilent({ resource: data.amount, creativity: -creativityPenalty });
      this.state.pendingStatChanges.resource =
        (this.state.pendingStatChanges.resource || 0) + data.amount;
      this.state.pendingStatChanges.creativity =
        (this.state.pendingStatChanges.creativity || 0) - creativityPenalty;

      // 资源消耗膨胀：每次申请 ×1.15
      this.state.resourceCostMultiplier *= 1.15;

      // 玩家台词
      const playerDiv = document.createElement('div');
      playerDiv.className = 'msg-bubble msg-bubble-right';
      playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${data.acceptLine}</div></div>`;
      flow.appendChild(playerDiv);
      await new Promise(r => requestAnimationFrame(() => { playerDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
      await this.msgSleep(800);

      await this.showMessages(data.acceptResponse);
    } else {
      this.state.cleverBonus = true;

      // 小幅创造力提升
      this.applyStatsSilent({ creativity: 3 });
      this.state.pendingStatChanges.creativity =
        (this.state.pendingStatChanges.creativity || 0) + 3;

      // 玩家台词
      const playerDiv = document.createElement('div');
      playerDiv.className = 'msg-bubble msg-bubble-right';
      playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${data.refuseLine}</div></div>`;
      flow.appendChild(playerDiv);
      await new Promise(r => requestAnimationFrame(() => { playerDiv.classList.add('visible'); this.smoothScrollToBottom(flow); setTimeout(r, 200); }));
      await this.msgSleep(800);

      await this.showMessages(data.refuseResponse);
    }

    await this.sleep(1500);
    callback();
  },

  // ===== 上一轮效果动画 =====
  showPendingChanges() {
    const pending = this.state.pendingStatChanges;
    if (Object.keys(pending).length > 0) {
      this.renderStatsPanel();
      // 自动展开面板，让玩家看到数值变化
      const overlay = document.getElementById('statsPanelOverlay');
      overlay.classList.add('show');
      // 逐项展示数值变化，带延迟
      let delay = 300;
      for (const [k,v] of Object.entries(pending)) {
        setTimeout(() => this.showStatChange(k, v), delay);
        delay += 400;
      }
      // 足够时间看完再收起
      setTimeout(() => overlay.classList.remove('show'), Math.max(4000, delay + 1500));
      this.state.pendingStatChanges = {};
    }
  },

  // ===== 轮次结算过场（用户反馈弹幕 + 数值结算） =====
  _settleTimer: null,

  showSettlement(callback) {
    const overlay = document.getElementById('settleOverlay');
    const danmakuLayer = document.getElementById('settleDanmaku');
    const statsPanel = document.getElementById('settleStats');
    const continueBtn = document.getElementById('settleContinue');
    const restartBtn = document.getElementById('settleRestart');

    danmakuLayer.innerHTML = '';
    overlay.classList.remove('fade-out');
    continueBtn.classList.remove('visible');
    if (restartBtn) restartBtn.classList.remove('visible');
    overlay.classList.add('show');

    // 结算期间隐藏仪表盘FAB
    const fab = document.getElementById('statsFab');
    if (fab) fab.classList.add('settle-hidden');

    // — 1. 数值结算面板（先渲染，以便计算高度） —
    const pending = this.state.pendingStatChanges;
    const s = this.state.stats;
    const statItems = this.STAT_META.map(m => ({
      ...m,
      value: this.getStatDisplay(m.key, s[m.key]),
      prevValue: this.getStatDisplay(m.key, s[m.key] - (pending[m.key] || 0))
    }));

    statsPanel.innerHTML =
      '<div class="settle-stats-title">数据结算</div>' +
      '<div class="settle-stats-grid settle-stats-grid-4">' +
      statItems.map(it => {
        const delta = pending[it.key] || 0;
        const hasChange = delta !== 0;
        let changeHTML = '';
        if (hasChange) {
          const pos = delta > 0;
          const display = it.key==='users' ? this.formatUsers(Math.abs(delta)) : Math.abs(delta) + '%';
          changeHTML = `<div class="settle-stat-change ${pos?'positive':'negative'}" id="ssc-${it.key}">${pos?'+':'−'}${display}</div>`;
        } else {
          changeHTML = '<div class="settle-stat-change"></div>';
        }
        return `<div class="settle-stat-item" id="ssi-${it.key}">
          <div class="settle-stat-icon">${it.icon}</div>
          <div class="settle-stat-label">${it.label}</div>
          <div class="settle-stat-value-wrap">
            <span class="settle-stat-value" id="ssv-${it.key}" data-prev="${it.prevValue}" data-next="${it.value}">${it.prevValue}</span>
          </div>
          ${changeHTML}
        </div>`;
      }).join('') + '</div>' +
      this._buildSettleInsight(pending);

    // — 2. 动态调整弹幕层，避开底部面板+继续按钮 —
    requestAnimationFrame(() => {
      const panelH = statsPanel.offsetHeight || 0;
      const actionsEl = document.getElementById('settleActions');
      const actionsH = actionsEl ? actionsEl.offsetHeight : (continueBtn.offsetHeight || 0);
      const bottomPx = panelH + actionsH + 24; // 24px安全间距
      const overlayH = overlay.offsetHeight || 600;
      const bottomPct = Math.ceil((bottomPx / overlayH) * 100);
      danmakuLayer.style.bottom = Math.max(bottomPct, 45) + '%';
    });

    // — 3. 用户反馈弹幕 —
    const feedback = this.state.currentFeedback || [];
    if (feedback.length > 0) {
      this._startSettleDanmaku(danmakuLayer, feedback);
    }

    // 逐项展示数值计数器累加动画
    let delay = 1200;
    for (const m of this.STAT_META) {
      const k = m.key;
      const delta = pending[k] || 0;
      if (delta === 0) continue;
      setTimeout(() => {
        const valEl = document.getElementById(`ssv-${k}`);
        const changeEl = document.getElementById(`ssc-${k}`);
        const itemEl = document.getElementById(`ssi-${k}`);
        if (!valEl) return;

        const fromVal = s[k] - delta;
        const toVal = s[k];
        const duration = 1200; // 累加动画时长 ms
        const steps = 30;
        const stepTime = duration / steps;
        let step = 0;

        // 变色
        valEl.style.color = delta > 0 ? '#4caf50' : '#fa5151';

        const counter = setInterval(() => {
          step++;
          // easeOutCubic 缓动
          const t = step / steps;
          const ease = 1 - Math.pow(1 - t, 3);
          const current = Math.round(fromVal + (toVal - fromVal) * ease);
          valEl.textContent = this.getStatDisplay(k, current);
          if (step >= steps) {
            clearInterval(counter);
            valEl.textContent = this.getStatDisplay(k, toVal);
            setTimeout(() => { valEl.style.color = '#fff'; }, 800);
          }
        }, stepTime);

        // 变化数字弹出
        setTimeout(() => {
          if (changeEl) changeEl.classList.add('show');
          if (itemEl) itemEl.classList.add(delta > 0 ? 'changed-positive' : 'changed-negative');
        }, 400);
      }, delay);
      delay += 800;
    }

    // 清空 pendingStatChanges（已在结算过场展示完毕）
    this.state.pendingStatChanges = {};

    // — 3. 点击继续 / 重新开始 —
    let canDismiss = false;
    // 计算动画总时长：每个有变化的stat用600ms，从1200ms开始，再加上翻页动画本身约1100ms
    const changedCount = this.STAT_META.filter(m => (pending[m.key] || 0) !== 0).length;
    const animDuration = changedCount > 0 ? 1200 + changedCount * 800 + 1200 : 1500;
    setTimeout(() => {
      canDismiss = true;
      continueBtn.classList.add('visible');
      if (restartBtn) restartBtn.classList.add('visible');
    }, Math.min(animDuration, 3000));

    const dismiss = () => {
      if (this._settleDismissed) return;
      this._settleDismissed = true;
      overlay.removeEventListener('click', onOverlayClick);
      continueBtn.removeEventListener('click', onContinueClick);
      if (restartBtn) restartBtn.removeEventListener('click', onRestartClick);
      this._stopSettleDanmaku();
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.remove('show', 'fade-out');
        danmakuLayer.innerHTML = '';
        this._settleDismissed = false;
        // 恢复仪表盘FAB
        const fab = document.getElementById('statsFab');
        if (fab) fab.classList.remove('settle-hidden');
        if (callback) callback();
      }, 500);
    };
    const onOverlayClick = (e) => {
      if (!canDismiss) return;
      // 点击重新开始按钮时不触发继续
      if (restartBtn && restartBtn.contains(e.target)) return;
      dismiss();
    };
    const onContinueClick = () => {
      if (!canDismiss) return;
      dismiss();
    };
    const onRestartClick = (e) => {
      e.stopPropagation();
      if (!canDismiss) return;
      if (this._settleDismissed) return;
      this._settleDismissed = true;
      overlay.removeEventListener('click', onOverlayClick);
      continueBtn.removeEventListener('click', onContinueClick);
      restartBtn.removeEventListener('click', onRestartClick);
      this._stopSettleDanmaku();
      overlay.classList.add('fade-out');
      setTimeout(() => {
        overlay.classList.remove('show', 'fade-out');
        danmakuLayer.innerHTML = '';
        this._settleDismissed = false;
        this.restartGame();
      }, 500);
    };
    this._settleDismissed = false;
    overlay.addEventListener('click', onOverlayClick);
    continueBtn.addEventListener('click', onContinueClick);
    if (restartBtn) restartBtn.addEventListener('click', onRestartClick);
  },

  _startSettleDanmaku(layer, feedback) {
    // 构建弹幕列表（反馈条目循环播放）
    const items = feedback.map(f => ({ user:f.user, text:f.text, type:f.type }));
    const sceneEl = layer.parentElement;
    const LANE_HEIGHT = 42;  // 轨道间距
    const sceneH = sceneEl.offsetHeight || 600;
    const layerH = layer.offsetHeight || (sceneH * 0.5);
    const startPx = 12;
    const endPx = layerH - 10;  // 弹幕层实际高度内分配轨道
    const laneCount = Math.max(3, Math.floor((endPx - startPx) / LANE_HEIGHT));
    const lanes = new Array(laneCount).fill(0);
    let idx = 0;

    const spawn = () => {
      const now = Date.now();
      // 找空闲轨道（按顺序优先，避免随机导致聚集）
      let bestLane = -1;
      let bestTime = Infinity;
      for (let i = 0; i < laneCount; i++) {
        if (lanes[i] <= now && lanes[i] < bestTime) {
          bestLane = i;
          bestTime = lanes[i];
        }
      }
      if (bestLane === -1) return; // 全满，跳过

      const lane = bestLane;
      const topPx = startPx + lane * LANE_HEIGHT;
      const item = items[idx % items.length];

      const el = document.createElement('span');
      el.className = `settle-danmaku ${item.type}`;
      el.innerHTML = `<span class="sd-user">${item.user}</span>${item.text}`;

      const goRight = Math.random() > 0.5;
      el.classList.add(goRight ? 'd-ltr' : 'd-rtl');
      el.style.top = topPx + 'px';
      if (goRight) { el.style.left = '-20px'; } else { el.style.right = '-20px'; }

      const duration = 12 + Math.random() * 6;
      el.style.animationDuration = duration + 's';
      // 轨道锁定 = 弹幕飘过大半屏幕后才释放（duration * 0.6 秒 → 毫秒）
      lanes[lane] = now + duration * 600;

      el.addEventListener('animationend', () => el.remove());
      layer.appendChild(el);
      idx++;
    };

    // 初始按序发射，每条间隔拉大
    for (let i = 0; i < Math.min(items.length, laneCount); i++) {
      setTimeout(() => spawn(), i * 800);
    }
    // 后续每 2.5s 尝试发射一条
    this._settleTimer = setInterval(spawn, 2500);
  },

  _stopSettleDanmaku() {
    if (this._settleTimer) {
      clearInterval(this._settleTimer);
      this._settleTimer = null;
    }
  },

  // ===== 重新开始游戏 =====
  restartGame(skipCommit) {
    // 停止所有定时器
    this.stopUserFluctuation();
    this._stopSettleDanmaku();
    if (this._danmakuTimer) { clearInterval(this._danmakuTimer); this._danmakuTimer = null; }

    // 写入跨周目存档（除非刚初始化/debug跳过时不commit）
    if (!skipCommit && this.state.round > 0) {
      MetaSave.commitRun(this.state, this._lastEndingTitle || '');
    }
    this._lastEndingTitle = '';

    // 加载跨周目数据
    const meta = MetaSave.load();
    this.meta = meta;

    // 重置游戏状态
    Object.assign(this.state, {
      playerName: '',
      prologueStep: 0,
      round: 0,
      stats: { users:0, reputation:0, creativity:45, resource:30 },
      statsHistory: [],
      initialStats: null,
      tags: { aggressiveGrowth:0, techDebt:0, teamNeglect:0, commercialFirst:0, longTermism:0, userFirst:0 },
      choices: [],
      delayedEffects: [],
      pendingStatChanges: {},
      achievements: [],
      currentFeedback: [],
      lastChoice: null,
      archivesViewed: [],
      branchTriggered: [],
      pendingBranch: null,
      inBranch: false,
      currentBranch: null,
      isTransitioning: false,
      statsIntroShown: false,
      prologueTyping: false,
      achSeenCount: 0,
      resourceRequests: 0,
      resourceCostMultiplier: 1,
      cleverBonus: false,
      phaseResourceRequested: {}
    });

    // 重置 UI 追踪状态
    this.shownWhatsNew = [];
    this.lastVer = null;

    // 清理 DOM
    document.getElementById('messageFlow').innerHTML = '';
    document.getElementById('gameChoices').innerHTML = '';
    const fab = document.getElementById('statsFab');
    if (fab) { fab.classList.remove('settle-hidden', 'visible'); }
    const panel = document.getElementById('statsPanelOverlay');
    if (panel) panel.classList.remove('show');

    // 恢复顶部导航栏（End Screen中会隐藏）
    document.querySelector('.game-header').style.display = '';
    // 退出结算页全屏模式，恢复手机壳
    document.body.classList.remove('end-screen-active');

    // 隐藏所有 overlay
    ['settleOverlay', 'whatsnewOverlay', 'roundTransition'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('show', 'fade-out');
    });

    // 重置时代主题
    const scene = document.getElementById('scene-game');
    if (scene) scene.removeAttribute('data-era');

    // 二周目起：可跳过序章
    if (meta.totalRuns > 0) {
      this._canSkipPrologue = true;
    } else {
      this._canSkipPrologue = false;
    }

    // 回到序章
    this.switchScene('scene-prologue');
    this.state.prologueStep = 0;
    this.renderPrologueScreen(0);
  },

  // 构建结算洞察文字（解释数值变化的原因）
  _buildSettleInsight(pending) {
    const labelMap = {users:'用户',reputation:'口碑',creativity:'创造力',resource:'资源'};
    const keys = Object.keys(pending).filter(k => pending[k] !== 0 && labelMap[k]);
    if (keys.length === 0) return '';
    const parts = [];
    // 按正负分组
    const ups = keys.filter(k => pending[k] > 0);
    const downs = keys.filter(k => pending[k] < 0);

    if (ups.length > 0) {
      parts.push('📈 ' + ups.map(k => labelMap[k]).join('、') + '上升');
    }
    if (downs.length > 0) {
      const rrPenalty = this.state._resourceRequestCreativityPenalty;
      if (rrPenalty && pending.creativity < 0) {
        const otherDowns = downs.filter(k => k !== 'creativity');
        if (otherDowns.length > 0) {
          parts.push('📉 ' + otherDowns.map(k => labelMap[k]).join('、') + '下降');
        }
        parts.push(`📉 创造力 -${rrPenalty}%（接受资源支援的代价 —— 充裕让人失去专注）`);
      } else {
        parts.push('📉 ' + downs.map(k => labelMap[k]).join('、') + '下降');
      }
    }

    // 清除资源申请标记
    delete this.state._resourceRequestCreativityPenalty;

    // 资源/团队低值警告
    const s = this.state.stats;
    let warn = '';
    if (s.resource <= 15) warn = '⚠️ 资源见底，下一步要谨慎';
    else if (s.creativity <= 15) warn = '⚠️ 创造力枯竭，需要突破';

    return `<div class="settle-insight">${parts.join(' · ')}${warn ? '<br>' + warn : ''}</div>`;
  },

  // ===== 资源归零续命判定 =====
  // 资源或创造力归零时，根据产品数据决定是否续命
  _shouldRescue() {
    const s = this.state.stats;
    if (s.resource > 0 && s.creativity > 0) return false; // 没归零，不需要
    // 产品数据好：用户量足够或口碑足够
    return s.users >= 5000000 || s.reputation >= 30;
  },

  _getRescueLevel() {
    const s = this.state.stats;
    // 高数据：用户 ≥ 10M 或 口碑 ≥ 50
    if (s.users >= 10000000 || s.reputation >= 50) return 'high';
    // 中数据：用户 ≥ 5M 或 口碑 ≥ 30
    return 'mid';
  },

  async showRescueEvent(callback) {
    const flow = document.getElementById('messageFlow');
    flow.innerHTML = '';

    const level = this._getRescueLevel();
    const isResourceZero = this.state.stats.resource <= 0;
    const isCreativityZero = this.state.stats.creativity <= 0;

    // 时间标签
    const timeDiv = document.createElement('div');
    timeDiv.className = 'msg-time';
    timeDiv.textContent = isResourceZero ? '—— 资源告急 ——' : '—— 团队疲惫 ——';
    flow.appendChild(timeDiv);
    await new Promise(r => requestAnimationFrame(() => { timeDiv.classList.add('visible'); r(); }));
    await this.msgSleep(400);

    if (level === 'high') {
      // 高数据：Pony 主动找你
      await this.showMessages([
        { type:'scene', text: isResourceZero
          ? '服务器快撑不住了。但用户数据摆在那里——增长曲线像一根竖起的直线。'
          : '团队已经连续加班三个月。有人开始怀疑方向。但用户的反馈信一封接一封。'
        },
        { name:'Pony', avatar:'P', avatarClass:'pony', text: isResourceZero
          ? '我看了你们的数据。服务器和人手的事，我来协调。'
          : '团队很累吧。我跟HR说了，给你们补几个人。好好调整一下。'
        },
      ]);

      // 自动续命
      if (isResourceZero) {
        this.applyStatsSilent({ resource: 10 });
        this.state.pendingStatChanges.resource = (this.state.pendingStatChanges.resource || 0) + 10;
      }
      if (isCreativityZero) {
        this.applyStatsSilent({ creativity: 8 });
        this.state.pendingStatChanges.creativity = (this.state.pendingStatChanges.creativity || 0) + 8;
      }

      await this.showMessages([
        { type:'scene', text:'资源到位了。不多，但够用。\n\nPony 没说什么条件。但你知道，这意味着更多的关注——和更高的期待。' }
      ]);

      // 代价：资源消耗膨胀
      this.state.resourceCostMultiplier *= 1.2;

      this.renderStatsPanel();
      await this.msgSleep(600);
      callback();

    } else {
      // 中数据：Martin 打电话，语气不好
      await this.showMessages([
        { type:'scene', text: isResourceZero
          ? '账上的预算已经见底。服务器都快维持不了了。'
          : '团队士气很低。连续几个月高强度，最早跟你的几个人都在问：还要这样多久。'
        },
        { name:'Martin', avatar:'M', avatarClass:'martin', text: isResourceZero
          ? '你的数据我看了。给你最后一笔预算。用好它。'
          : '我听说你团队状态不太好。我让HR给你补几个人，别把人都累走了。'
        },
      ]);

      // 续命但更少
      if (isResourceZero) {
        this.applyStatsSilent({ resource: 5 });
        this.state.pendingStatChanges.resource = (this.state.pendingStatChanges.resource || 0) + 5;
      }
      if (isCreativityZero) {
        this.applyStatsSilent({ creativity: 5 });
        this.state.pendingStatChanges.creativity = (this.state.pendingStatChanges.creativity || 0) + 5;
      }

      await this.showMessages([
        { type:'scene', text:'续命的资源到了。但所有人都知道，这是最后的机会。' }
      ]);

      // 更大的代价
      this.state.resourceCostMultiplier *= 1.5;

      this.renderStatsPanel();
      await this.msgSleep(600);
      callback();
    }
  },

  // ===== 轮次管理 =====
  nextRound() {
    document.getElementById('messageFlow').innerHTML = '';
    this.hideGameChoices();

    this.state.round++;
    if (ROUNDS_DATA[this.state.round]) {
      this.processDelayedEffects();
      const rd = ROUNDS_DATA[this.state.round];

      // 资源/创造力归零时，根据产品数据判断续命
      if (this._shouldRescue()) {
        this.showRescueEvent(() => {
          // 续命后，还可能再触发正常的资源申请
          if (this.shouldTriggerResourceRequest(rd)) {
            this.showResourceRequest(rd, () => {
              this.showRoundTransition(rd, () => {
                this.startGameRound(this.state.round);
              });
            });
          } else {
            this.showRoundTransition(rd, () => {
              this.startGameRound(this.state.round);
            });
          }
        });
      } else if (this.shouldTriggerResourceRequest(rd)) {
        // 检查是否触发资源申请
        this.showResourceRequest(rd, () => {
          this.showRoundTransition(rd, () => {
            this.startGameRound(this.state.round);
          });
        });
      } else {
        this.showRoundTransition(rd, () => {
          this.startGameRound(this.state.round);
        });
      }
    } else {
      this.showEndScreen();
    }
  },

  async startGameRound(round) {
    const rd = ROUNDS_DATA[round];
    if (!rd) return;

    // 版本号显示"已发布版本"：上一轮的ver，Round 1前还没发布则显示demo
    const prevRd = ROUNDS_DATA[round - 1];
    const displayVer = prevRd ? prevRd.ver : 'demo';
    this.setEra(rd.year, displayVer);

    document.getElementById('roundInfo').textContent = `第${round}轮 · ${rd.phase}`;
    document.getElementById('roundTitle').textContent = rd.title;
    document.getElementById('roundYear').textContent = rd.year;

    // 数值结算已在过场中完成，这里只刷新面板显示
    this.renderStatsPanel();

    document.getElementById('messageFlow').innerHTML = '';
    this.hideGameChoices();
    this.state.inBranch = false;

    // Round 3 前情提要：根据 R2 选择动态调整
    let msgs = rd.messages;
    if (round === 3) {
      const r2Choice = (this.state.choices.find(c => c.round === 2 && !c.branch) || {}).choice;
      msgs = msgs.map(m => {
        if (m.type === 'scene' && m.text && m.text.includes('语音对讲上线后')) {
          if (r2Choice === 'C') {
            return { ...m, text:'微信2.0上线后，日新增缓慢爬升到了1万。缺少差异化功能，增长乏力。' };
          } else if (r2Choice === 'A') {
            return { ...m, text:'「录完发送」版的语音上线后，日新增涨到了2万。但跟米聊比，没什么差异化。' };
          }
        }
        return m;
      });
    }
    await this.showMessages(msgs);
    this.showGameChoices(rd.options, rd);
  },

  handleChoice(idx) {
    const data = this.state.inBranch ? BRANCHES_DATA[this.state.currentBranch] : ROUNDS_DATA[this.state.round];
    if (!data) return;
    const opt = data.options[idx];
    this.state.choices.push({ round: this.state.round, branch: this.state.inBranch ? this.state.currentBranch : null, choice: opt.label });
    this.hideGameChoices();

    if (opt.immediateEffects) {
      const effects = { ...opt.immediateEffects };
      // 资源消耗膨胀（只影响消耗，不影响收益）
      if (effects.resource && effects.resource < 0) {
        effects.resource = Math.round(effects.resource * this.state.resourceCostMultiplier);
      }
      // 用户数加随机浮动（±20%），避免每次都是整数
      if (effects.users) {
        const base = effects.users;
        const jitter = Math.round(base * (0.8 + Math.random() * 0.4));
        effects.users = jitter;
      }
      this.applyStatsSilent(effects);
      for (const [k,v] of Object.entries(effects)) {
        this.state.pendingStatChanges[k] = (this.state.pendingStatChanges[k]||0) + v;
      }
    }

    if (opt.delayedEffects) {
      let delayedFx = { ...opt.delayedEffects };
      // 用户数加随机浮动（±20%）
      if (delayedFx.users) {
        delayedFx.users = Math.round(delayedFx.users * (0.8 + Math.random() * 0.4));
      }
      // 巧方案加成：cleverBonus 为 true 且选项带 longTermism 标签时，正面效果 ×1.2
      if (this.state.cleverBonus && opt.tags && opt.tags.longTermism) {
        for (const [k, v] of Object.entries(delayedFx)) {
          if (v > 0) delayedFx[k] = Math.round(v * 1.2);
        }
        this.state.cleverBonus = false;
      }
      this.state.delayedEffects.push({
        triggerRound: this.state.round + (opt.delayedRounds || 1),
        effects: delayedFx,
        description: opt.delayedDesc || '延迟效果'
      });
    }

    if (opt.tags) {
      for (const [t,v] of Object.entries(opt.tags)) this.state.tags[t] = (this.state.tags[t]||0)+v;
    }

    if (opt.achievement) this.showAchievement(opt.achievement.icon, opt.achievement.name, opt.achievement.desc);

    // 更新用户反馈
    this.updateFeedback(this.state.round, opt.label);
    this.state.lastChoice = opt.label;

    if (opt.triggerBranch && !this.state.inBranch) {
      this.state.pendingBranch = opt.triggerBranch;
      this.state.branchTriggered.push(opt.triggerBranch);
    }

    const result = data.results[opt.label];
    // 先展示主角说的一句话，再进入结果
    this.showPlayerLineThenResult(opt, result);
  },

  // ===== 多选题处理 =====
  handleMultiChoice(roundData) {
    const selectedLabels = Array.from(this._multiSelected).sort();
    const comboKey = selectedLabels.join('');
    const selectedOpts = roundData.options.filter(o => selectedLabels.includes(o.label));

    // 记录选择
    this.state.choices.push({ round: this.state.round, branch: null, choice: comboKey });
    this.hideGameChoices();

    // 累计所有选中选项的效果
    for (const opt of selectedOpts) {
      if (opt.immediateEffects) {
        const effects = { ...opt.immediateEffects };
        if (effects.resource && effects.resource < 0) {
          effects.resource = Math.round(effects.resource * this.state.resourceCostMultiplier);
        }
        // 用户数加随机浮动（±20%）
        if (effects.users) {
          effects.users = Math.round(effects.users * (0.8 + Math.random() * 0.4));
        }
        this.applyStatsSilent(effects);
        for (const [k,v] of Object.entries(effects)) {
          this.state.pendingStatChanges[k] = (this.state.pendingStatChanges[k]||0) + v;
        }
      }
      if (opt.delayedEffects) {
        let delayedFx = { ...opt.delayedEffects };
        // 用户数加随机浮动（±20%）
        if (delayedFx.users) {
          delayedFx.users = Math.round(delayedFx.users * (0.8 + Math.random() * 0.4));
        }
        if (this.state.cleverBonus && opt.tags && opt.tags.longTermism) {
          for (const [k, v] of Object.entries(delayedFx)) {
            if (v > 0) delayedFx[k] = Math.round(v * 1.2);
          }
          this.state.cleverBonus = false;
        }
        this.state.delayedEffects.push({
          triggerRound: this.state.round + (opt.delayedRounds || 1),
          effects: delayedFx,
          description: opt.delayedDesc || '延迟效果'
        });
      }
      if (opt.tags) {
        for (const [t,v] of Object.entries(opt.tags)) this.state.tags[t] = (this.state.tags[t]||0)+v;
      }
      if (opt.triggerBranch && !this.state.inBranch) {
        this.state.pendingBranch = opt.triggerBranch;
        this.state.branchTriggered.push(opt.triggerBranch);
      }
    }

    // 成就判定
    if (roundData.multiSelectAchievements) {
      const ach = roundData.multiSelectAchievements[comboKey];
      if (ach) this.showAchievement(ach.icon, ach.name, ach.desc);
    }

    // 更新用户反馈（多选题合并反馈）
    this.updateMultiFeedback(this.state.round, selectedLabels);
    this.state.lastChoice = comboKey;

    // 查找匹配的结果：精确匹配 → 兜底
    const result = roundData.results[comboKey] || roundData.results['_default'];

    // 查找匹配的玩家台词和小龙反馈
    const pLines = roundData.multiSelectPlayerLines || {};
    const xlFeedback = roundData.multiSelectXiaolongFeedback || {};
    const playerLine = pLines[comboKey] || pLines['_default'] || '';
    const xiaolongFb = xlFeedback[comboKey] || xlFeedback['_default'] || '';

    this.showPlayerLineThenResult({ playerLine, xiaolongFeedback: xiaolongFb }, result);
  },

  // 多选题的用户反馈合并
  updateMultiFeedback(round, labels) {
    const feedbackPool = USER_FEEDBACK[round];
    if (!feedbackPool) return;
    let combined = [];
    for (const label of labels) {
      if (feedbackPool[label]) combined = combined.concat(feedbackPool[label]);
    }
    // 随机打乱并截取
    combined.sort(() => Math.random() - 0.5);
    this.state.currentFeedback = combined.slice(0, 10);
  },

  async showPlayerLineThenResult(opt, result) {
    const flow = document.getElementById('messageFlow');
    if (opt.playerLine) {
      const playerDiv = document.createElement('div');
      playerDiv.className = 'msg-bubble msg-bubble-right';
      playerDiv.innerHTML = `<div class="msg-body msg-body-right"><div class="msg-text msg-text-player">${opt.playerLine}</div></div>`;
      flow.appendChild(playerDiv);
      await new Promise(r => requestAnimationFrame(() => {
        playerDiv.classList.add('visible');
        this.smoothScrollToBottom(flow);
        setTimeout(r, 200);
      }));
      await this.msgSleep(800);
    }
    // 小龙对选择的反馈
    if (opt.xiaolongFeedback) {
      const fbDiv = document.createElement('div');
      fbDiv.className = 'msg-bubble';
      fbDiv.innerHTML = `<div class="msg-avatar alan">龙</div><div class="msg-body"><div class="msg-name">小龙</div><div class="msg-text">${this.tpl(opt.xiaolongFeedback)}</div></div>`;
      flow.appendChild(fbDiv);
      await new Promise(r => requestAnimationFrame(() => {
        fbDiv.classList.add('visible');
        this.smoothScrollToBottom(flow);
        setTimeout(r, 200);
      }));
      await this.msgSleep(1000);
    }
    this.showResultAsChat(result);
  },

  async startBranch(branchId) {
    const bd = BRANCHES_DATA[branchId];
    if (!bd) { this.nextRound(); return; }

    // 立即清空旧内容，防止结算→过渡之间闪烁旧对话
    document.getElementById('messageFlow').innerHTML = '';
    this.hideGameChoices();

    this.showBranchTransition(bd, async () => {
      this.state.inBranch = true;
      this.state.currentBranch = branchId;

      this.renderStatsPanel();
      this.setEra(bd.year, bd.ver);

      document.getElementById('roundInfo').textContent = '分支事件';
      document.getElementById('roundTitle').textContent = bd.title;
      document.getElementById('roundYear').textContent = bd.year;
      document.getElementById('messageFlow').innerHTML = '';
      this.hideGameChoices();
      await this.showMessages(bd.messages);
      this.showGameChoices(bd.options);
    });
  },

  // ===== 跨轮组合成就检查 =====
  checkComboAchievements() {
    const choices = this.state.choices;
    const mainChoices = choices.filter(c => !c.branch).map(c => c.choice);

    // 🏃 日拱一卒 —— 复刻真实历史路线：R1=B(不标注已读), R2=B(按住说话), R3=AB(附近的人+摇一摇+漂流瓶)
    if (mainChoices.length >= 3 && mainChoices[0]==='B' && mainChoices[1]==='B' && mainChoices[2]==='AB') {
      this.showAchievement('🏃', '日拱一卒', '每一步都踩在了历史的脚印上。');
    }

    // 🧘 克制大师 —— 三轮主线都没有触发 aggressiveGrowth 标签（从不激进增长）
    if (mainChoices.length >= 3 && (!this.state.tags.aggressiveGrowth || this.state.tags.aggressiveGrowth === 0)) {
      this.showAchievement('🧘', '克制大师', '你从未选择最激进的那条路。');
    }
  },

  showEndScreen() {
    const flow = document.getElementById('messageFlow');
    flow.innerHTML = '';
    this.hideGameChoices();
    this.processDelayedEffects();

    // 先判断组合成就
    this.checkComboAchievements();

    // 结算页全屏模式：移除手机壳限制，让内容占满真实屏幕
    document.body.classList.add('end-screen-active');

    // 隐藏顶部导航栏，避免左上角"微信"标签被误认为可点击返回
    document.querySelector('.game-header').style.display = 'none';
    // 隐藏仪表盘浮窗，结算页自带数值信息，不重复展示
    const fab = document.getElementById('statsFab');
    if (fab) fab.style.display = 'none';
    this.renderStatsPanel();

    const s = this.state.stats;
    const init = this.state.initialStats || { users:0, reputation:0, creativity:45, resource:30 };
    const achCount = this.state.achievements.length;

    // === 先算称号（在续命之前，确保归零状态被正确判定）===
    const title = this._calcPhaseTitle(s, init);

    // 记录结局称号（供 commit 使用）
    this._lastEndingTitle = title.name;

    // === 续命后置：称号算完后再回补资源（用于下一阶段）===
    if (this._shouldRescue()) {
      const level = this._getRescueLevel();
      if (s.resource <= 0) {
        const bonus = level === 'high' ? 10 : 5;
        this.applyStatsSilent({ resource: bonus });
      }
      if (s.creativity <= 0) {
        const bonus = level === 'high' ? 8 : 5;
        this.applyStatsSilent({ creativity: bonus });
      }
    }

    // === 数值变化对比 ===
    const statCompare = this.STAT_META.map(m => {
      const before = init[m.key];
      const after = s[m.key];
      const delta = after - before;
      return { ...m, before, after, delta };
    });

    // === 辅助：格式化大数字（万/亿） ===
    const fmtBigNum = (n) => {
      if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
      if (n >= 10000) return (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
      return n.toLocaleString('en-US');
    };

    // 用户数据（单独大卡片）
    const userStat = statCompare.find(st => st.key === 'users');
    const otherStats = statCompare.filter(st => st.key !== 'users');

    const userDeltaSign = userStat.delta > 0 ? '+' : userStat.delta < 0 ? '−' : '';
    const userDeltaClass = userStat.delta > 0 ? 'positive' : userStat.delta < 0 ? 'negative' : '';

    // === 构建页面 ===
    const savedAvatar = localStorage.getItem('wechat-sim-avatar');
    const avatarSrc = savedAvatar || 'images/badge-avatar.png';
    const playerName = this.state.playerName || '我';

    const container = document.createElement('div');
    container.className = 'end-screen';
    container.innerHTML = `
      <div class="es-header">
        <div class="es-phase-tag">萌芽期完成</div>
        <div class="es-player-profile">
          <div class="es-player-avatar"><img src="${avatarSrc}" alt=""></div>
          <div class="es-player-name">${playerName}</div>
          <div class="es-player-dept">广研 · 微信项目组</div>
        </div>
        <div class="es-title-divider"></div>
        <div class="es-title-icon">${title.icon}</div>
        <div class="es-title-name">${title.name}</div>
        <div class="es-title-desc">${title.desc}</div>
      </div>
      <div class="es-body">
        <div class="es-section">
          <div class="es-section-label">数值变化</div>
          <div class="es-user-card">
            <div class="es-user-label">👥 用户总量</div>
            <div class="es-user-value">${fmtBigNum(userStat.after)}</div>
            <div class="es-user-delta ${userDeltaClass}">${userDeltaSign}${fmtBigNum(Math.abs(userStat.delta))}</div>
          </div>
          <div class="es-other-stats">
            ${otherStats.map(st => {
              const deltaSign = st.delta > 0 ? '+' : st.delta < 0 ? '−' : '';
              const deltaClass = st.delta > 0 ? 'positive' : st.delta < 0 ? 'negative' : '';
              return `<div class="es-mini-stat">
                <div class="es-mini-icon">${st.icon}</div>
                <div class="es-mini-label">${st.label}</div>
                <div class="es-mini-value">${st.after}%</div>
                <div class="es-mini-delta ${deltaClass}">${st.delta !== 0 ? deltaSign + Math.abs(st.delta) + '%' : '—'}</div>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="es-section">
          <div class="es-section-label">成就 <span class="es-ach-count">${achCount}/${this.ACH_REGISTRY.filter(a => a.round <= this._getMaxVisibleRound()).length}</span></div>
          <div class="es-ach-list">
            ${achCount > 0 ? this.state.achievements.map(name => {
              const info = this.findAchievementInfo(name);
              return `<div class="es-ach-item">
                <span class="es-ach-icon">${info.icon}</span>
                <div class="es-ach-info">
                  <div class="es-ach-name">${info.name}</div>
                  <div class="es-ach-desc">${info.desc}</div>
                  ${info.hint ? `<div class="es-ach-hint">${info.hint}</div>` : ''}
                </div>
              </div>`;
            }).join('') : '<div class="es-ach-empty">本阶段未解锁成就。换个选择试试？</div>'}
            ${this._buildHistoryAchievements()}
          </div>
          ${this._buildLockedAchHints()}
        </div>
        <div class="es-section">
          <div class="es-section-label">决策回顾</div>
          <div class="es-choices-list">
            ${this._buildChoicesReview()}
          </div>
        </div>
        <div class="es-footer">
          ${this._buildMetaProgress()}
          <div class="es-quote">"正确的东西做出来之后，一定会慢慢成长起来。"<br><span class="es-quote-author">—— 小龙</span></div>
          <div class="es-share-area">
            <button class="es-share-btn" id="esShareBtn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              分享成绩单
            </button>
          </div>
          <div class="es-next-hint">爆发期（第4-7轮）即将开放，敬请期待……</div>
          <div class="es-restart-area">
            <button class="es-restart-btn" id="esRestartBtn">重新开始</button>
          </div>
        </div>
      </div>
    `;
    flow.appendChild(container);
    requestAnimationFrame(() => flow.scrollTop = 0);

    // 逐步显示动画
    setTimeout(() => container.classList.add('visible'), 100);

    // commit 跨周目存档
    MetaSave.commitRun(this.state, title.name);

    // 重新开始按钮
    const restartBtn = document.getElementById('esRestartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.restartGame(true); // skipCommit=true，已经commit过了
      });
    }

    // 分享长图按钮 — Canvas 绘制专属分享卡片
    const shareBtn = document.getElementById('esShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        shareBtn.disabled = true;
        shareBtn.textContent = '生成中…';
        try {
          const imgData = await this._generateShareCard(title, s, init, playerName, avatarSrc, achCount);
          const preview = document.getElementById('screenshotPreview');
          const spImage = document.getElementById('spImage');
          const spCaption = document.getElementById('spCaption');
          spImage.src = imgData;
          spCaption.textContent = '长按保存图片分享';
          preview.classList.add('show');
          const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
          if (!isMobile) {
            const a = document.createElement('a');
            a.href = imgData;
            a.download = `微信创业模拟器_${playerName}_萌芽期结算.png`;
            a.click();
          }
        } catch (err) {
          console.error('生成分享图失败:', err);
        }
        shareBtn.disabled = false;
        shareBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> 分享成绩单`;
      });
    }
  },

  // ===== 生成个性化短评 — 评价玩家的决策风格 =====
  _generateShareComment(choices, title, stats, playerName) {
    const choiceMap = {};
    choices.filter(c => !c.branch).forEach(c => { choiceMap[c.round] = c.choice; });

    // 各轮决策的玩家风格评述
    const r1Frags = {
      A: '选了标注已读，说明这位产品经理更看重信息透明——哪怕用户会有"已读不回"的焦虑。',
      B: '第一步就选择不标注已读，在社交压力和信息透明之间，ta选择了用户的舒适感。',
      C: '选了折中方案"已送达"，是个谨慎的开局，不过也可能错过了做出鲜明态度的机会。',
    };
    const r2Frags = {
      A: '语音选了录完再发，追求完美主义，但牺牲了即时通讯最核心的"即时"。',
      B: '按住说话——把交互门槛降到最低，这一步展现了不错的产品直觉。',
      C: '放弃语音功能，勇气可嘉。纯文字路线意味着要在效率上做到极致才行。',
    };
    const r3Frags = {
      A: '"附近的人"加"摇一摇"，大胆切入陌生人社交，用最简单的交互撬动增长。',
      B: '把宝全押在漂流瓶上——浪漫主义路线，有情怀，但也冒险。',
      C: '选了QQ邮箱导流，务实稳健，不过少了一点破局的锐气。',
      AB: '同时押注"摇一摇"和漂流瓶，陌生人社交双管齐下——胃口不小。',
      ABC: '三个全选，野心和魄力都有，就看资源撑不撑得住。',
      AC: '"附近的人"加邮箱导流，一手创新一手存量，实用主义路线。',
      BC: '漂流瓶加邮箱推广，稳中求变。',
    };

    // 总评片段（评价玩家风格）
    const summaryFrags = {
      '历史的回响': '三轮下来几乎复刻了真实历史——这位产品经理有罕见的直觉：克制、简单、出其不意。',
      '增长新星': '增长数据很漂亮，说明这位产品经理嗅觉灵敏，抓住了关键的增长杠杆。',
      '探索达人': '成就刷了不少，看得出是个爱探索的产品经理，不走寻常路。',
      '争议人物': '争议不小——这位产品经理的某些决策挺大胆，但用户买不买账是另一回事。',
      '悬崖边的舞者': '资源快见底了还没倒，说明这位产品经理扛压能力强，但下一步得更谨慎。',
      '弹尽粮绝': '资源耗尽，项目危险了。不过每个产品经理都值得再来一次的机会。',
      '逆境求生': '在困境中还能站住脚，韧性十足。但后面的路不会更容易。',
      '萌芽期毕业生': '中规中矩地通过了萌芽期，没犯大错也没出奇招。稳，但后面才是真正的考验。',
    };

    const frag1 = r1Frags[choiceMap[1]] || '';
    const frag2 = r2Frags[choiceMap[2]] || '';
    const frag3 = r3Frags[choiceMap[3]] || '';
    const summary = summaryFrags[title.name] || '萌芽期结束了，故事才刚开始。';

    return frag1 + frag2 + frag3 + summary;
  },

  // ===== Canvas 绘制分享卡片 — 暗色极客风·手机优化版（750px宽） =====
  async _generateShareCard(title, stats, init, playerName, avatarSrc, achCount) {
    const W = 750;
    const MAX_H = 2800;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = MAX_H;
    const ctx = canvas.getContext('2d');
    const PAD = 56;
    const CW = W - PAD * 2;

    const achList = this.state.achievements.map(name => this.findAchievementInfo(name));
    const choices = this.state.choices.filter(c => !c.branch);
    const realChoices = { 1:'B', 2:'B', 3:'AB' };
    const matchCount = choices.filter(c => realChoices[c.round] === c.choice).length;

    const fmtBigNum = (n) => {
      if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
      if (n >= 10000) return (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
      return n.toLocaleString('en-US');
    };
    const rr = (x, y, w, h, r) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
      ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
      ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
      ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
      ctx.closePath();
    };
    const drawDivider = (y) => {
      ctx.strokeStyle = GREEN + '0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
    };

    // 自动换行工具
    const wrapText = (text, x, y, maxW, lineH, font, color, maxLines) => {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      let lines = [];
      let line = '';
      for (let i = 0; i < text.length; i++) {
        const test = line + text[i];
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line);
          line = text[i];
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      if (maxLines && lines.length > maxLines) {
        lines = lines.slice(0, maxLines);
        lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
      }
      lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
      ctx.restore();
      return lines.length * lineH;
    };

    // 颜色与字体常量
    const GREEN = 'rgba(0,255,65,';
    const MONO = "'SF Mono','Menlo','Consolas','Courier New',monospace";
    const SANS = "-apple-system,BlinkMacSystemFont,'PingFang SC','Segoe UI',sans-serif";

    // ==============================
    // 1. 背景
    // ==============================
    ctx.fillStyle = '#0a0e14';
    ctx.fillRect(0, 0, W, MAX_H);

    // 扫描线纹理
    ctx.globalAlpha = 0.015;
    for (let sy = 0; sy < MAX_H; sy += 4) { ctx.fillStyle = '#fff'; ctx.fillRect(0, sy, W, 1); }
    ctx.globalAlpha = 1;

    // 顶部光晕
    const grad = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, 500);
    grad.addColorStop(0, 'rgba(0,255,65,0.08)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, 500);

    // ==============================
    // 2. 顶部标题栏（中文）
    // ==============================
    let cy = 56;
    const logoS = 40;
    try {
      const logoImg = await this._loadImage('images/icon-wechat-early.jpg');
      ctx.save();
      rr(PAD, cy, logoS, logoS, 8);
      ctx.clip();
      ctx.drawImage(logoImg, PAD, cy, logoS, logoS);
      ctx.restore();
      rr(PAD, cy, logoS, logoS, 8);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } catch(e) {}

    ctx.textAlign = 'left';
    ctx.font = `700 26px ${SANS}`;
    ctx.fillStyle = GREEN + '0.7)';
    ctx.fillText('微信创业模拟器', PAD + logoS + 16, cy + 18);
    ctx.font = `400 18px ${SANS}`;
    ctx.fillStyle = GREEN + '0.3)';
    ctx.fillText('萌芽期结算 · 2011 — 2012', PAD + logoS + 16, cy + 42);

    cy += 72;
    drawDivider(cy);
    cy += 36;

    // ==============================
    // 3. 玩家信息（一行：头像+名字+部门）
    // ==============================
    const avS = 56;
    const avX = PAD;
    const avY = cy;
    try {
      const avatarImg = await this._loadImage(avatarSrc);
      ctx.save();
      ctx.beginPath(); ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(avatarImg, avX, avY, avS, avS);
      ctx.restore();
    } catch(e) {
      ctx.beginPath(); ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2, 0, Math.PI * 2);
      ctx.fillStyle = GREEN + '0.08)'; ctx.fill();
    }
    ctx.beginPath(); ctx.arc(avX + avS / 2, avY + avS / 2, avS / 2 + 1.5, 0, Math.PI * 2);
    ctx.strokeStyle = GREEN + '0.2)'; ctx.lineWidth = 1.5; ctx.stroke();

    const nameX = avX + avS + 18;
    ctx.font = `600 28px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.textAlign = 'left';
    ctx.fillText(playerName, nameX, avY + 24);
    ctx.font = `400 18px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('广研 · 微信项目组', nameX, avY + 50);

    cy = avY + avS + 32;

    // ==============================
    // 4. 称号区域（视觉核心·居中大字）
    // ==============================
    // 称号背景卡片
    rr(PAD, cy, CW, 180, 16);
    ctx.fillStyle = 'rgba(0,255,65,0.025)';
    ctx.fill();
    rr(PAD, cy, CW, 180, 16);
    ctx.strokeStyle = GREEN + '0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const titleCenterX = W / 2;
    const titleCY = cy + 40;

    // 大 emoji
    ctx.textAlign = 'center';
    ctx.font = `72px sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(title.icon, titleCenterX, titleCY + 48);

    // 称号名（大字）
    ctx.font = `800 42px ${SANS}`;
    ctx.fillStyle = GREEN + '0.9)';
    ctx.fillText(title.name, titleCenterX, titleCY + 100);

    // 称号描述
    ctx.font = `400 22px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    let descText = title.desc;
    const maxDescW = CW - 48;
    if (ctx.measureText(descText).width > maxDescW) {
      while (ctx.measureText(descText + '…').width > maxDescW && descText.length > 0) descText = descText.slice(0, -1);
      ctx.fillText(descText + '…', titleCenterX, titleCY + 136);
    } else {
      ctx.fillText(descText, titleCenterX, titleCY + 136);
    }

    cy += 180 + 32;

    // ==============================
    // 5. 数据面板（2×2 中文标签·大字号）
    // ==============================
    const colW = Math.floor(CW / 2);
    const metrics = [
      { label: '用户', val: fmtBigNum(stats.users), delta: stats.users - (init.users || 0), isBig: true },
      { label: '口碑', val: stats.reputation + '%', delta: stats.reputation - (init.reputation || 0) },
      { label: '创新', val: stats.creativity + '%', delta: stats.creativity - (init.creativity || 45) },
      { label: '资源', val: stats.resource + '%', delta: stats.resource - (init.resource || 30) },
    ];

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const m = metrics[row * 2 + col];
        const mx = PAD + col * colW;
        const centerX = mx + colW / 2;
        const baseY = cy + row * 110;

        ctx.textAlign = 'center';

        // 中文标签
        ctx.font = `600 20px ${SANS}`;
        ctx.fillStyle = GREEN + '0.35)';
        ctx.fillText(m.label, centerX, baseY);

        // 数值（大字）
        ctx.font = m.isBig ? `800 48px ${SANS}` : `700 44px ${MONO}`;
        ctx.fillStyle = GREEN + '0.9)';
        ctx.fillText(m.val, centerX, baseY + 52);

        // 变化量
        const d = m.delta;
        const dStr = m.isBig
          ? (d > 0 ? '+' + fmtBigNum(d) : d < 0 ? '−' + fmtBigNum(Math.abs(d)) : '—')
          : (d > 0 ? '+' + d + '%' : d < 0 ? '−' + Math.abs(d) + '%' : '—');
        ctx.font = `600 20px ${MONO}`;
        ctx.fillStyle = d > 0 ? GREEN + '0.5)' : d < 0 ? 'rgba(255,80,80,0.6)' : 'rgba(255,255,255,0.15)';
        ctx.fillText(dStr, centerX, baseY + 82);
      }
    }
    ctx.textAlign = 'left';
    cy += 220 + 12;

    // 历史契合度
    ctx.font = `500 18px ${SANS}`;
    ctx.fillStyle = GREEN + '0.3)';
    ctx.textAlign = 'right';
    ctx.fillText('历史契合 ' + matchCount + '/' + choices.length, W - PAD, cy);
    ctx.textAlign = 'left';
    cy += 20;

    drawDivider(cy);
    cy += 36;

    // ==============================
    // 6. 成就区
    // ==============================
    const maxVisibleAch = this.ACH_REGISTRY.filter(a => a.round <= this._getMaxVisibleRound()).length;

    ctx.font = `600 22px ${SANS}`;
    ctx.fillStyle = GREEN + '0.4)';
    ctx.fillText('成就', PAD, cy);
    ctx.textAlign = 'right';
    ctx.font = `500 20px ${SANS}`;
    ctx.fillStyle = GREEN + '0.25)';
    ctx.fillText(achCount + ' / ' + maxVisibleAch, W - PAD, cy);
    ctx.textAlign = 'left';
    cy += 14;

    // 进度条
    rr(PAD, cy, CW, 6, 3);
    ctx.fillStyle = GREEN + '0.06)';
    ctx.fill();
    const achRatio = Math.min(achCount / Math.max(maxVisibleAch, 1), 1);
    if (achRatio > 0) {
      rr(PAD, cy, CW * achRatio, 6, 3);
      ctx.fillStyle = GREEN + '0.45)';
      ctx.fill();
    }
    cy += 28;

    if (achList.length > 0) {
      const rowH = 64;
      achList.slice(0, 6).forEach((a, i) => {
        const ry = cy + i * rowH;
        if (i % 2 === 0) {
          rr(PAD, ry, CW, rowH, 6);
          ctx.fillStyle = 'rgba(0,255,65,0.015)';
          ctx.fill();
        }
        ctx.textAlign = 'left';
        ctx.font = `32px sans-serif`;
        ctx.fillText(a.icon, PAD + 16, ry + 42);
        ctx.font = `600 24px ${SANS}`;
        ctx.fillStyle = GREEN + '0.85)';
        ctx.fillText(a.name, PAD + 64, ry + 28);
        ctx.font = `400 18px ${SANS}`;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        let achDesc = a.desc;
        const achDescMax = CW - 96;
        if (ctx.measureText(achDesc).width > achDescMax) {
          while (ctx.measureText(achDesc + '…').width > achDescMax && achDesc.length > 0) achDesc = achDesc.slice(0, -1);
          achDesc += '…';
        }
        ctx.fillText(achDesc, PAD + 64, ry + 54);
      });
      cy += Math.min(achList.length, 6) * rowH + 12;
    } else {
      rr(PAD, cy, CW, 56, 8);
      ctx.fillStyle = GREEN + '0.03)';
      ctx.fill();
      ctx.font = `400 20px ${SANS}`;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'center';
      ctx.fillText('本阶段未解锁成就', W / 2, cy + 36);
      ctx.textAlign = 'left';
      cy += 68;
    }

    drawDivider(cy);
    cy += 32;

    // ==============================
    // 7. 短评区（评价玩家决策风格）
    // ==============================
    ctx.textAlign = 'left';
    ctx.font = `600 20px ${SANS}`;
    ctx.fillStyle = GREEN + '0.5)';
    ctx.fillText('决策点评', PAD, cy);

    const stars = matchCount >= 3 ? '★★★★★' : matchCount >= 2 ? '★★★★☆' : stats.reputation >= 50 ? '★★★☆☆' : '★★☆☆☆';
    ctx.font = `400 20px ${SANS}`;
    ctx.fillStyle = GREEN + '0.35)';
    ctx.textAlign = 'right';
    ctx.fillText(stars, W - PAD, cy);
    cy += 32;

    // 引号装饰
    ctx.textAlign = 'left';
    ctx.font = `700 44px "Georgia","Times New Roman",serif`;
    ctx.fillStyle = GREEN + '0.12)';
    ctx.fillText('"', PAD, cy + 6);

    // 短评正文
    const comment = this._generateShareComment(this.state.choices, title, stats, playerName);
    const commentH = wrapText(
      comment,
      PAD + 12, cy,
      CW - 24, 36,
      `400 22px ${SANS}`,
      'rgba(255,255,255,0.55)',
      5
    );
    cy += commentH + 24;

    drawDivider(cy);
    cy += 36;

    // ==============================
    // 8. 底部：二维码 + 引流文案
    // ==============================
    // 生成二维码
    let qrImgData = null;
    try {
      if (typeof qrcode !== 'undefined') {
        const gameUrl = window.location.href.split('?')[0];
        const qr = qrcode(0, 'M');
        qr.addData(gameUrl);
        qr.make();
        // 将 QR 码绘制到临时 Canvas
        const modules = qr.getModuleCount();
        const qrSize = 160;
        const cellSize = qrSize / modules;
        const qrCanvas = document.createElement('canvas');
        qrCanvas.width = qrSize; qrCanvas.height = qrSize;
        const qrCtx = qrCanvas.getContext('2d');
        qrCtx.fillStyle = '#0a0e14';
        qrCtx.fillRect(0, 0, qrSize, qrSize);
        for (let r = 0; r < modules; r++) {
          for (let c = 0; c < modules; c++) {
            if (qr.isDark(r, c)) {
              qrCtx.fillStyle = 'rgba(0,255,65,0.85)';
              qrCtx.fillRect(c * cellSize, r * cellSize, cellSize + 0.5, cellSize + 0.5);
            }
          }
        }
        qrImgData = qrCanvas;
      }
    } catch(e) { console.warn('QR 生成失败:', e); }

    if (qrImgData) {
      const qrDrawSize = 140;
      const qrX = W / 2 - qrDrawSize / 2;
      // 二维码外框
      rr(qrX - 12, cy - 8, qrDrawSize + 24, qrDrawSize + 24, 12);
      ctx.fillStyle = 'rgba(0,255,65,0.03)';
      ctx.fill();
      rr(qrX - 12, cy - 8, qrDrawSize + 24, qrDrawSize + 24, 12);
      ctx.strokeStyle = GREEN + '0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.drawImage(qrImgData, qrX, cy, qrDrawSize, qrDrawSize);
      cy += qrDrawSize + 24;
    }

    ctx.textAlign = 'center';
    ctx.font = `400 18px ${SANS}`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('扫码来玩', W / 2, cy);
    cy += 40;

    // === 裁剪 Canvas 到实际内容高度 ===
    const finalH = cy;
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = W;
    finalCanvas.height = finalH;
    const fCtx = finalCanvas.getContext('2d');
    fCtx.fillStyle = '#0a0e14';
    fCtx.fillRect(0, 0, W, finalH);
    fCtx.drawImage(canvas, 0, 0, W, finalH, 0, 0, W, finalH);

    return finalCanvas.toDataURL('image/png');
  },

  // 图片加载辅助
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },

  // 根据数值计算阶段称号
  _calcPhaseTitle(stats, init) {
    const userGrowth = stats.users / Math.max(init.users, 1);
    const choices = this.state.choices.filter(c => !c.branch).map(c => c.choice);
    const achCount = this.state.achievements.length;

    const isHistorical = choices[0] === 'B' && choices[1] === 'B' &&
      (choices[2] === 'AB' || choices[2] === 'A' || choices[2] === 'B');

    // ① 历史回响（最高优先级）
    if (isHistorical && stats.users >= 30000000) {
      return { icon:'🌟', name:'历史的回响', desc:'你的每一步都踩在了小龙的脚印上。这就是微信走过的路。' };
    }
    // ② 资源/创造力归零 → 分层判定
    if (stats.resource <= 0 || stats.creativity <= 0) {
      // 场景A：产品数据好（用户多或口碑好），不应终止
      if (stats.users >= 10000000 || stats.reputation >= 50) {
        return { icon:'🪂', name:'悬崖边的舞者', desc:'弹药打光了，但产品立住了。上面不会让你关门的。' };
      }
      // 场景B：中间状态
      if (stats.users >= 5000000 || stats.reputation >= 30) {
        return { icon:'⚡', name:'逆境求生', desc:'资源耗尽，但还有一线希望。Martin打来了电话。' };
      }
      // 场景C：真正的弹尽粮绝
      return { icon:'💀', name:'弹尽粮绝', desc:'项目终止了。但至少你试过了。' };
    }
    // ③ 增长新星（合并原破局者）
    if (stats.users >= 20000000) {
      return { icon:'📈', name:'增长新星', desc:'用户增长超预期。下一阶段，挑战会更大。' };
    }
    // ④ 探索达人（门槛从5降至3）
    if (achCount >= 3) {
      return { icon:'🎯', name:'探索达人', desc:'你解锁了大量成就。好奇心是最好的老师。' };
    }
    if (stats.reputation < 30) {
      return { icon:'😅', name:'争议人物', desc:'口碑堪忧。用户会用脚投票。' };
    }
    if (stats.resource <= 15) {
      return { icon:'⚡', name:'悬崖边的舞者', desc:'资源快耗尽了，但还没倒。能走多远？' };
    }
    return { icon:'🌱', name:'萌芽期毕业生', desc:'活下来了。这就是最好的开始。' };
  },

  // 构建决策回顾
  _buildChoicesReview() {
    const roundNames = { 1:'已读标注', 2:'语音之争', 3:'找朋友' };
    const choiceLabels = {
      1: { A:'标注已读', B:'不标注已读', C:'已送达' },
      2: { A:'录完发送', B:'按住说话', C:'不做语音' },
      3: { A:'附近的人+摇一摇', B:'漂流瓶', C:'QQ邮箱推广', AB:'附近的人+摇一摇+漂流瓶', ABC:'全部功能', AC:'附近的人+摇一摇+邮箱推广', BC:'漂流瓶+邮箱推广' }
    };
    const realChoices = { 1:'B', 2:'B', 3:'AB' };

    // 获取上一周目的选择（用于对比）
    const prevRun = MetaSave.getPrevRunChoices();
    const prevChoiceMap = {};
    if (prevRun && prevRun.choices) {
      for (const c of prevRun.choices) {
        if (!c.branch) prevChoiceMap[c.round] = c.choice;
      }
    }

    return this.state.choices.filter(c => !c.branch).map(c => {
      const rn = roundNames[c.round] || `Round ${c.round}`;
      const cl = (choiceLabels[c.round] && choiceLabels[c.round][c.choice]) || c.choice;
      const isReal = realChoices[c.round] === c.choice;
      // 上一周目对比
      const prevChoice = prevChoiceMap[c.round];
      let prevHtml = '';
      if (prevChoice && prevChoice !== c.choice) {
        const prevLabel = (choiceLabels[c.round] && choiceLabels[c.round][prevChoice]) || prevChoice;
        prevHtml = `<div class="es-choice-prev">上次：${prevLabel}</div>`;
      }
      return `<div class="es-choice-row">
        <span class="es-choice-round">${rn}</span>
        <span class="es-choice-label">${cl}${prevHtml}</span>
        ${isReal ? '<span class="es-choice-real">✓ 真实历史</span>' : ''}
      </div>`;
    }).join('');
  },

  // 构建历史周目已解锁但本周目未解锁的成就（灰色展示）
  _buildHistoryAchievements() {
    const meta = MetaSave.load();
    const historyOnly = meta.achievements.filter(a => !this.state.achievements.includes(a));
    if (historyOnly.length === 0) return '';
    return `<div class="es-ach-history-divider">历史周目解锁</div>` +
      historyOnly.map(name => {
        const info = this.findAchievementInfo(name);
        return `<div class="es-ach-item es-ach-history">
          <span class="es-ach-icon">${info.icon}</span>
          <div class="es-ach-info">
            <div class="es-ach-name">${info.name}</div>
            <div class="es-ach-desc">${info.desc}</div>
          </div>
        </div>`;
      }).join('');
  },

  // 构建未解锁成就提示
  _buildLockedAchHints() {
    const maxRound = this._getMaxVisibleRound();
    const chapterAchs = this.ACH_REGISTRY.filter(a => a.round <= maxRound);
    const locked = chapterAchs.filter(a => !this.state.achievements.includes(a.name));
    if (locked.length === 0) return '';

    const shown = locked.slice(0, 2);
    return `<div class="es-locked-hints">
      ${shown.map(a => `<div class="es-locked-item">
        <span class="es-locked-icon">🔒</span>
        <span class="es-locked-hint">${a.hint}</span>
      </div>`).join('')}
      ${locked.length > 2 ? `<div class="es-locked-more">还有 ${locked.length - 2} 个成就等你发现</div>` : ''}
    </div>`;
  },

  // 构建跨周目进度展示
  _buildMetaProgress() {
    const meta = MetaSave.load();
    // 当前这局也算上（因为刚commit过了）
    const totalRuns = meta.totalRuns;
    if (totalRuns <= 1) return ''; // 第一次玩不显示

    const endingCount = meta.endings.length;
    const totalAch = meta.achievements.length;
    const totalRegistry = this.ACH_REGISTRY.length;
    const totalArchives = meta.archivesViewed.length;

    let html = '<div class="es-meta-progress">';
    html += '<div class="es-meta-title">> 累计探索进度</div>';
    html += '<div class="es-meta-grid">';
    html += `<div class="es-meta-item"><div class="es-meta-val">${totalRuns}</div><div class="es-meta-label">周目</div></div>`;
    html += `<div class="es-meta-item"><div class="es-meta-val">${endingCount}</div><div class="es-meta-label">结局</div></div>`;
    html += `<div class="es-meta-item"><div class="es-meta-val">${totalAch}/${totalRegistry}</div><div class="es-meta-label">成就</div></div>`;
    html += `<div class="es-meta-item"><div class="es-meta-val">${totalArchives}</div><div class="es-meta-label">档案</div></div>`;
    html += '</div>';

    // 最佳记录对比
    if (meta.bestStats.maxUsers > 0) {
      const fmtBig = (n) => {
        if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
        if (n >= 10000) return (n / 10000).toFixed(n >= 1000000 ? 0 : 1).replace(/\.0$/, '') + '万';
        return n.toLocaleString('en-US');
      };
      html += `<div class="es-meta-best">历史最佳：${fmtBig(meta.bestStats.maxUsers)} 用户 · ${meta.bestStats.maxReputation}% 口碑</div>`;
    }

    html += '</div>';
    return html;
  },

  // 根据成就名查找图标和描述
  findAchievementInfo(name) {
    const found = this.ACH_REGISTRY.find(a => a.name === name);
    return found || {icon:'🏆',name:name,desc:''};
  }
};

// ===== Debug 快速跳转 =====
// 用法: ?skip=intro  跳到第一天开场
//       ?skip=round1  跳到第1轮
//       ?skip=round2  跳到第2轮
//       ?skip=round3  跳到第3轮
//       ?skip=round4  跳到第4轮
//       ?skip=B1      跳到分支B1
//       ?skip=settle1 跳到第1轮结算页
Game.debugSkipTo = function(target) {
  this.state.playerName = '我';
  this.state.statsIntroShown = true;
  this.switchScene('scene-game');
  this.setEra('2011', 'v1.0');
  this.renderStatsPanel();
  this.initStatsFab(true);

  // 结算页快捷跳转
  const settleMatch = target.match(/^settle(\d+)$/);
  if (settleMatch) {
    const r = parseInt(settleMatch[1]);
    this.state.round = r;
    const rd = ROUNDS_DATA[r];
    if (rd) {
      this.setEra(rd.year, rd.ver);
      document.getElementById('roundInfo').textContent = rd.phase;
      document.getElementById('roundTitle').textContent = rd.title;
      document.getElementById('roundYear').textContent = rd.year;
    }
    // 模拟选择B的效果
    const opt = rd && rd.options ? rd.options.find(o => o.label === 'B') || rd.options[0] : null;
    if (opt && opt.immediateEffects) {
      Object.entries(opt.immediateEffects).forEach(([k, v]) => {
        this.state.stats[k] = (this.state.stats[k] || 0) + v;
        this.state.pendingStatChanges[k] = (this.state.pendingStatChanges[k] || 0) + v;
      });
    }
    // 模拟用户反馈
    const fb = USER_FEEDBACK[r];
    this.state.currentFeedback = fb ? (fb['B'] || fb['A'] || Object.values(fb)[0] || []) : [];
    this.showSettlement(() => {});
    return;
  }

  if (target === 'intro') {
    this.showChatIntro();
    return;
  }

  // 阶段结算页快捷跳转: ?skip=end 或 ?skip=end-high/end-dead 等
  const endMatch = target.match(/^end(?:-(.+))?$/);
  if (endMatch) {
    const scenario = endMatch[1] || 'normal';
    const scenarios = {
      high:   { users:25000000, reputation:65, creativity:10, resource:0 },
      mid:    { users:7000000,  reputation:35, creativity:5,  resource:0 },
      dead:   { users:2000000,  reputation:15, creativity:0,  resource:0 },
      normal: { users:32000000, reputation:68, creativity:52, resource:12 },
      star:   { users:45000000, reputation:60, creativity:30, resource:20 },
      hist:   { users:35000000, reputation:62, creativity:28, resource:15 }
    };
    const stats = scenarios[scenario] || scenarios.normal;
    this.state.stats = { ...stats };
    this.state.initialStats = { users:0, reputation:0, creativity:45, resource:30 };
    this.state.round = 3;
    this.state.choices = scenario === 'hist'
      ? [{ round:1, branch:null, choice:'B' },{ round:2, branch:null, choice:'B' },{ round:3, branch:null, choice:'AB' }]
      : [{ round:1, branch:null, choice:'B' },{ round:2, branch:null, choice:'A' },{ round:3, branch:null, choice:'AB' }];
    this.state.achievements = scenario === 'dead' ? [] : [];
    this.state.tags = scenario === 'hist'
      ? { longTermism:2, userFirst:1 }
      : { aggressiveGrowth:1, longTermism:1, userFirst:1 };
    this.showEndScreen();
    return;
  }

  const branchMatch = target.match(/^B(\d+)$/);
  if (branchMatch) {
    this.state.round = 3; // 分支B1在第3轮（附近的人）后触发
    this.startBranch(target);
    return;
  }

  const roundMatch = target.match(/^round(\d+)$/);
  if (roundMatch) {
    const r = parseInt(roundMatch[1]);
    this.state.round = r;
    const rd = ROUNDS_DATA[r];
    if (rd) {
      this.setEra(rd.year, rd.ver);
      this.showRoundTransition(rd, () => this.startGameRound(r));
    }
    return;
  }
};

// 启动（支持 ?skip= 或 #skip= 快速跳转）
(function() {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace('#',''));
  const skip = params.get('skip') || hashParams.get('skip');
  if (skip) {
    Game.debugSkipTo(skip);
  } else {
    Game.init();
  }
})();
