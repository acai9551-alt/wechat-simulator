// ==================== 游戏数据 ====================
// 人物规则：高级管理人员用原名（小龙/Pony/Martin/Tony），其他角色用「XX同学」（如客户端同学、产品同学）

// ===== 用户反馈池（真真假假混合） =====
const USER_FEEDBACK = {
  // 每轮结束后根据选择显示的用户反馈
  1: {
    A: [
      { user:'@早期用户小明', text:'已读两个字看着好有压力，消息回不回都不对', type:'negative' },
      { user:'@大学生小张', text:'女朋友看到已读不回直接跟我吵架了', type:'negative' },
      { user:'@职场打工人', text:'给老板发消息，已读不回比不读还难受', type:'negative' },
      { user:'@产品体验师', text:'已读标注让聊天变得紧张了', type:'negative' },
      { user:'@社恐患者', text:'本来可以假装没看到，现在不行了', type:'negative' },
      { user:'@科技评论人', text:'微信上线了！但这个已读功能有点讨厌', type:'neutral' },
    ],
    B: [
      { user:'@早期内测用户', text:'微信上线了！发短信居然不要钱', type:'positive' },
      { user:'@数码博主', text:'微信没有已读标注，发消息没压力，舒服', type:'positive' },
      { user:'@社恐患者', text:'不显示已读太好了，不回消息也不尴尬', type:'positive' },
      { user:'@产品观察', text:'WhatsApp有已读，微信没有。一个让人焦虑，一个让人放松', type:'positive' },
      { user:'@iPhone用户', text:'就一个发消息功能？这也太简单了吧', type:'negative' },
      { user:'@塞班用户', text:'什么时候支持诺基亚啊', type:'negative' },
      { user:'@飞信铁粉', text:'飞信不香吗，免费发短信到手机', type:'neutral' },
    ],
    C: [
      { user:'@手机用户阿杰', text:'微信上线了！消息送达之后有个小提示，挺贴心', type:'positive' },
      { user:'@产品体验师', text:'已送达是个不错的折中，至少知道消息到了', type:'neutral' },
      { user:'@大学生小刘', text:'已送达但没回，我还是会想他是不是不想理我', type:'negative' },
      { user:'@iPhone用户', text:'功能太少了，就能发文字和图片', type:'negative' },
      { user:'@飞信用户', text:'飞信不香吗', type:'neutral' },
    ]
  },
  2: {
    A: [
      { user:'@数码小白', text:'微信可以发语音了？试了下，和米聊差不多', type:'neutral' },
      { user:'@通讯达人', text:'语音消息要等下载，有点慢', type:'negative' },
      { user:'@上班族小李', text:'打字太累了，有语音方便多了', type:'positive' },
      { user:'@诺基亚死忠粉', text:'我N73能用不？不能用的软件都是垃圾', type:'negative' },
      { user:'@飞信用户', text:'飞信不香吗？发短信还免费呢', type:'neutral' },
      { user:'@大学生小赵', text:'下了微信，流量费3块钱没了，肉疼', type:'negative' },
      { user:'@火星网友', text:'这玩意和飞信有啥区别啊求科普', type:'neutral' },
      { user:'@36氪编辑', text:'米聊日活突破百万！雷军称这是移动互联网最大机会', type:'neutral' },
      { user:'@创业圈观察', text:'移动IM赛道：米聊领跑，微信？微信是什么？', type:'negative' },
      { user:'@腾讯内部员工', text:'听说微信团队才十几个人，每天新增几千……这项目能活过年底吗', type:'negative' },
    ],
    B: [
      { user:'@手机玩家007', text:'微信这个按住说话太爽了，按住就能讲', type:'positive' },
      { user:'@产品观察员', text:'和TalkBox比，微信的语音发出去秒到，体验好很多', type:'positive' },
      { user:'@大学生小王', text:'给室友发语音，她说还没按播放就听到了', type:'positive' },
      { user:'@米聊用户', text:'……微信的语音怎么比我们还好用', type:'neutral' },
      { user:'@宿舍老六', text:'室友对着手机自言自语我以为他疯了，原来在发微信', type:'positive' },
      { user:'@省话费联盟', text:'以前一个月话费80，现在30块都用不完', type:'positive' },
      { user:'@搞笑达人', text:'给老板发了条60秒语音，他回了个"。"', type:'neutral' },
      { user:'@深圳出租车司机', text:'拉客的时候乘客都在对着手机说话，还以为是神经病', type:'positive' },
      { user:'@QQ空间站长', text:'完了，以后没人用QQ了吧', type:'neutral' },
      { user:'@科技媒体实习生', text:'主编说不用写微信了，没人看。把米聊那篇再推一次', type:'neutral' },
      { user:'@广州日报记者', text:'采访了雷军，他说米聊要做中国的WhatsApp。微信？没听说过', type:'neutral' },
      { user:'@隔壁项目组', text:'微信那帮人天天加班到凌晨，图什么呢……手机QQ不是挺好的吗', type:'negative' },
    ],
    C: [
      { user:'@微信用户001', text:'微信啥时候能发语音啊，米聊都有了', type:'negative' },
      { user:'@数码博主', text:'微信的文字体验确实干净，但功能太少了', type:'neutral' },
      { user:'@老妈', text:'儿子，你那个软件怎么不能说话', type:'negative' },
      { user:'@百度贴吧网友', text:'这软件就一个聊天功能？我手机自带短信不行吗', type:'negative' },
      { user:'@移动用户', text:'还是飞信好用，至少能发短信到手机', type:'negative' },
      { user:'@Nokia吧吧主', text:'不支持塞班差评，什么垃圾软件', type:'negative' },
      { user:'@36氪', text:'2011上半年移动IM盘点：米聊一骑绝尘，微信尚在追赶', type:'negative' },
      { user:'@投资人老李', text:'雷军这次押注米聊是对的。腾讯反应太慢了', type:'negative' },
      { user:'@南方通讯大厦保洁阿姨', text:'六楼那帮人又通宵了，垃圾桶全是泡面桶', type:'neutral' },
    ]
  },
  3: {
    A: [
      { user:'@深圳白领', text:'附近的人好好玩！发现楼下奶茶店老板也在用微信', type:'positive' },
      { user:'@女生小美', text:'附近的人里好多奇怪的人加我……', type:'negative' },
      { user:'@科技博主', text:'微信「附近的人」日安装量破百万，社交黑马', type:'positive' },
      { user:'@单身狗', text:'附近的人太强了，发现我暗恋的女生就在隔壁栋', type:'positive' },
      { user:'@好奇用户', text:'摇到了一个同城的人，好神奇哈哈', type:'positive' },
      { user:'@产品经理', text:'摇一摇这个设计太极简了，整个界面就一个动作', type:'positive' },
      { user:'@路人甲', text:'坐地铁的时候摇一摇，摇到旁边那个人了', type:'positive' },
      { user:'@手机维修师傅', text:'最近返修率上升，都是摇手机摇太狠给摔了', type:'negative' },
      { user:'@公交车乘客', text:'整车人都在摇手机，我以为发地震了', type:'positive' },
      { user:'@数码发烧友', text:'咔咔咔咔咔！这个音效太上瘾了！一天摇了200多次', type:'positive' },
      { user:'@36氪', text:'摇一摇上线首日：千万级新注册，两亿次摇动。微信起飞了', type:'positive' },
      { user:'@anxious_mom', text:'我女儿天天看手机上附近有什么人，这软件安全吗？？', type:'negative' },
      { user:'@互联网观察', text:'微信日新增用户从5万飙到20万，三个月用户量破千万', type:'positive' },
    ],
    B: [
      { user:'@文艺青年', text:'漂流瓶太浪漫了！扔出去一个心情，真的有人回', type:'positive' },
      { user:'@失恋少女', text:'往漂流瓶里写了一段话，一个陌生人回了一句"加油"，哭了', type:'positive' },
      { user:'@无聊上班族', text:'上班摸鱼捡漂流瓶，比刷微博有意思', type:'positive' },
      { user:'@吐槽帝', text:'捡了十个瓶子，八个在求加微信号，剩下两个是广告', type:'negative' },
      { user:'@海边少年', text:'把秘密扔进大海，有人接住了。这个功能很治愈', type:'positive' },
      { user:'@产品分析师', text:'漂流瓶有趣但不高频，留存数据一般', type:'neutral' },
    ],
    C: [
      { user:'@QQ邮箱用户', text:'邮箱里突然收到微信推广，还以为是垃圾邮件', type:'negative' },
      { user:'@科技评论', text:'微信靠QQ邮箱群发拉新，吃相不太好看', type:'negative' },
      { user:'@同事老张', text:'邮件里说微信能免费发消息？下了一个试试', type:'neutral' },
      { user:'@大学生小刘', text:'收到推广邮件下了微信，打开看了一眼，不知道干嘛的', type:'negative' },
      { user:'@产品观察', text:'腾讯开始给微信导流了，QQ邮箱的流量确实大', type:'neutral' },
      { user:'@互联网观察', text:'靠推广来的用户，和靠产品吸引来的用户，是两种人', type:'negative' },
    ]
  }
};

// 序章4屏
const PROLOGUE_SCREENS = [
  {
    // 第1屏：两封邮件
    blocks: [
      { type:'email-header', text:'发件人: "allen" <allenzhang@qq.com>\n发送时间: 2010年11月18日\n晚上07:38' },
      { type:'email-body', text:'广研内部讨论了一下，\n感觉可以由广研来投入人手\n做一个探索性产品。\n预期2个月内可对外正式发布。' },
      { type:'email-header', text:'发件人: "ponyma" <ponyma@tencent.com>\n发送时间: 同日 晚上9:17' },
      { type:'email-body', text:'我建议广研先主导这次的预研工作，\n暂定为微信项目。' }
    ]
  },
  {
    // 第2屏：第一行代码
    blocks: [
      { type:'yaogaole', text:'要搞了。' },
      { type:'code', text:'' },
      { type:'code-caption', text:'2010年11月23日 凌晨 · 微信的第一行代码' }
    ]
  },
  {
    // 第3屏：时代背景
    blocks: [
      { type:'era-danmaku', items:[
        'Nokia N73', '短信 ¥0.1/条', 'QQ同时在线1.2亿',
        'iPhone 4 刚发布', 'Kik · 15天100万用户',
        '3G网络', '飞信', 'Symbian', '塞班S60',
        '诺基亚', 'BlackBerry', 'App Store'
      ]},
      { type:'narration-center', text:'2010年。\n智能手机刚刚开始普及。\n人们还没有意识到，\n手机会取代一切。' },
      { type:'divider' },
      { type:'narration-center', text:'一个划时代的机会，\n被来自腾讯广州研发团队的\n小龙捕捉到。\n他给pony发了一封邮件，\n拉起一只小队。' },
      { type:'divider' },
      { type:'narration-center', text:'你是一名应届毕业生，\n校招加入腾讯广研。\n被分到一个刚成立的项目组——\n代号<em>微信</em>。' }
    ]
  }
];

// 主线轮次（压缩为4轮 + 1个分支）
const ROUNDS_DATA = {
  1: {
    phase:'萌芽期', title:'第一次发射', year:'2011', ver:'v1.0', continueText:'发布',
    messages: [
      { type:'time', text:'2011年1月 · 南方通讯大厦六楼' },
      { type:'scene', text:'两个月了。微信1.0即将提交审核。\n\n十几个人挤在小黑屋里做最后的检查。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'功能基本齐了。免费发文字、发图片。就这些。' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'有个细节要定一下。消息发出去之后，要不要显示「已读」？' },
      { type:'scene', text:'屋里安静了几秒。这个问题看起来很小，但每个人心里都有不同的答案。' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'QQ有「对方正在输入中」。短信没有任何状态。我们怎么选？' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'{player_call}你想象一下。你发了一条消息，对方看了但没回。你知道他「已读」了——你会怎么想？' },
      { type:'scene', text:'{player}想了想。确实——\n\n「已读」不是一个功能问题，是一个人性问题。\n\n它把「不回复」从一个模糊的状态，变成了一个明确的拒绝。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'发消息的人会焦虑，收消息的人会有压力。两边都不舒服。我们要想清楚这件事。' }
    ],

    options: [
      { label:'A', text:'标注「已读」，让沟通更高效透明',
        cost:'⚡ 开发成本极低 · 但可能引发社交焦虑',
        playerLine:'标注已读能提高沟通效率。用户会习惯的。',
        xiaolongFeedback:'效率不等于体验。你再想想。',
        immediateEffects:{reputation:-5,users:5000}, delayedEffects:{reputation:-10,users:50000}, delayedRounds:1, delayedDesc:'已读标注上线反馈', tags:{aggressiveGrowth:1} },
      { label:'B', text:'不标注「已读」，保护双方的社交空间',
        cost:'⏳ 无额外开发成本 · 但放弃了一个「行业标配」功能',
        playerLine:'不标注。给对方留一个「可以不回复」的空间。',
        xiaolongFeedback:'嗯，理解得不错。',
        immediateEffects:{reputation:10,creativity:3,users:5000}, delayedEffects:{reputation:10,users:80000}, delayedRounds:1, delayedDesc:'用户口碑积累', tags:{longTermism:1,userFirst:1} },
      { label:'C', text:'做「已送达」——只显示送到，不显示是否看了',
        cost:'⚡ 轻度开发 · 折中方案',
        playerLine:'送达和已读是两回事。我们只告诉他消息到了。',
        xiaolongFeedback:'折中往往意味着两边都没做好。',
        immediateEffects:{resource:-5,users:5000}, delayedEffects:{reputation:5,users:60000}, delayedRounds:1, delayedDesc:'已送达功能反馈' }
    ],
    archive:{ realChoice:'不标注已读', sections:[
      { text:'微信从1.0开始就选择不标注「已读」。这个决定延续至今。同期的WhatsApp、LINE后来都加了已读功能，也都引发了「已读不回」的社交焦虑。微信是少数坚持不做的。' },
      { text:'微信1.0于2011年1月21日上线。第一版只有免费发文字和图片两个功能。核心定位四个字：免费短信。' },
      { img:'images/blackroom-team.jpg', caption:'2011 微信小黑屋合影' },
      { img:'images/blackroom-night.png', caption:'南方通信大厦六楼，灯火通明' }
    ], quote:'我们用「你」而不是「您」来称呼用户。一旦对用户过于尊敬，那说明我们可能怀有目的。—— 小龙' },
    results: {
      A: {
        title:'「已读焦虑」',
        messages: [
          { type:'scene', text:'定了。加上「已读」。继续干。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'已读状态的逻辑不复杂，加个标记位就行。今晚能搞定。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'最近大家讨论的成果。' },
          { type:'image', src:'images/early-discussion.jpg', caption:'早期产品讨论', name:'产品同学', avatar:'W', avatarClass:'wawa' },
          { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'消息收发链路压测过了，峰值没问题。' },
          { type:'scene', text:'接下来的日子，小黑屋的灯就没怎么灭过。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'我自己用了两天，总觉得哪里不对。给同事发消息，对方已读不回，心里莫名有点堵。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'别想那么多，先上线再说。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'走，带你们去吃楼下的桂林米粉。' },
          { type:'image', src:'images/team-guilin-noodle.jpg', caption:'楼下桂林米粉，小黑屋的食堂', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'提交审核了吗？' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'提了。等着吧。' },
          { type:'publish-break' },
          { type:'scene', text:'2011年1月21日。审核通过。微信1.0，正式上线。' },
          { type:'image', src:'images/wx1.0-launch.jpg', caption:'微信1.0发布', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { type:'scene', text:'所有人围在一起盯着后台。第一个用户注册了。第二个。第三个……\n\n但没人庆祝。那个关于「已读」的疑虑还悬在空气里，没人说出口。' }
        ],
        screenshots: [
          { src:'images/wx1.0-ui.jpg', caption:'微信 1.0 界面' }
        ],
        reflection:'「已读」看似高效，实则把沟通变成了一种监控。「用户是人，每个人都应该有不回复的自由。」——好的通讯工具减轻人的压力，而不是增加压力。'
      },
      B: {
        title:'「第一次发射」',
        messages: [
          { type:'scene', text:'定了。不做已读。继续干。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'最近大家讨论的成果。' },
          { type:'image', src:'images/early-discussion.jpg', caption:'早期产品讨论', name:'产品同学', avatar:'W', avatarClass:'wawa' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'iOS那边还有几个crash要修。今晚通宵。' },
          { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'消息收发链路压测过了，峰值没问题。' },
          { type:'scene', text:'不用做已读标记，少了一个纠结点。团队的注意力全在核心功能上——消息收发的稳定性和速度。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'走，带你们去吃楼下的桂林米粉。' },
          { type:'image', src:'images/team-guilin-noodle.jpg', caption:'楼下桂林米粉，小黑屋的食堂', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'提交审核了吗？' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'提了。等着吧。' },
          { type:'publish-break' },
          { type:'scene', text:'2011年1月21日。审核通过。微信1.0，正式上线。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'发布时刻，我给大家拍张照吧。' },
          { type:'image', src:'images/wx1.0-launch.jpg', caption:'微信1.0发布', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { type:'scene', text:'所有人围在一起盯着后台。数字在跳。不算太快，但每一个都是真实的人。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'上线了。剩下的，交给用户。' }
        ],
        screenshots: [],
        reflection:'好的产品不是功能越多越好，而是懂得克制。不做什么，有时候比做什么更难。'
      },
      C: {
        title:'「折中的智慧」',
        messages: [
          { type:'scene', text:'定了。做「已送达」。继续干。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'最近大家讨论的成果。' },
          { type:'image', src:'images/early-discussion.jpg', caption:'早期产品讨论', name:'产品同学', avatar:'W', avatarClass:'wawa' },
          { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'已送达要多走一条回执链路。不难，但得测仔细——送达状态丢了比没有还糟。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'iOS那边还有几个crash要修。今晚通宵。' },
          { type:'scene', text:'接下来的日子，小黑屋的灯就没怎么灭过。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'走，带你们去吃楼下的桂林米粉。' },
          { type:'image', src:'images/team-guilin-noodle.jpg', caption:'楼下桂林米粉，小黑屋的食堂', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'提交审核了吗？' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'提了。等着吧。' },
          { type:'publish-break' },
          { type:'scene', text:'2011年1月21日。审核通过。微信1.0，正式上线。' },
          { type:'image', src:'images/wx1.0-launch.jpg', caption:'微信1.0发布', name:'客户端同学', avatar:'J', avatarClass:'justin' },
          { type:'scene', text:'所有人围在一起盯着后台。第一个用户注册了。第二个。第三个……' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'我每次看到「已送达」三个字，都想追问他到底看没看。' },
          { type:'scene', text:'团队自己用着也觉得有些别扭。不上不下的状态，比没有还让人纠结。' }
        ],
        screenshots: [
          { src:'images/wx1.0-ui.jpg', caption:'微信 1.0 界面' }
        ],
        reflection:'折中方案往往两头不讨好。「已送达」没有解决根本问题——它还是在暗示「我知道你收到了」。如果解决方案非常复杂，一定是问题问错了。'
      }
    }
  },
  2: {
    phase:'萌芽期', title:'语音之争', year:'2011', ver:'v2.0', continueText:'上线',
    messages: [
      { type:'time', text:'2011年春 · 南方通讯大厦六楼' },
      { type:'scene', text:'凌晨两点。屏幕上是微信后台实时数据——日新增5000人。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'{player_call}你看一下TalkBox。' },
      { type:'scene', text:'{player}打开App Store——一个来自香港的语音应用，3天100万下载。用户把录的语音转发到微博，像发明了新玩具。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'米聊下个版本要上语音对讲了。他们动作很快。我们跟不跟？' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'我的意见是马上跟。做一个「录完发送」的语音消息，一周能上线。再不动手，米聊就把我们甩开了。' },
      { type:'scene', text:'第二天中午，大家挤进小龙的办公室。他在白板上画了一张图——TalkBox、米聊、微信，三个箭头都指向「语音」。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'做语音这件事本身不难。难的是，我们到底要做一个跟TalkBox一样的东西，还是做一个不一样的东西。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'但时间不等人。先上了再说，体验可以迭代。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'如果某些东西没做对，那种逆转是一定不会自然发生的。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'我们现在要找的不是最快的方案，是那件「对的事情」。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'{player_call}你觉得呢？' }
    ],

    options: [
      { label:'A', text:'做「录完发送」语音消息，一周上线',
        cost:'⚡ 资源消耗少 · 一周可上线',
        playerLine:'龙哥，我觉得先上语音吧，米聊跑太远就追不上了。',
        xiaolongFeedback:'快不是目的。',
        immediateEffects:{resource:-10,creativity:-5}, delayedEffects:{users:1500000,reputation:-5}, delayedRounds:1, delayedDesc:'语音消息上线', tags:{aggressiveGrowth:1} },
      { label:'B', text:'做「按住说话」实时对讲，重新设计交互',
        cost:'🔋 资源大量消耗 · 需要重新设计交互 · 工期翻倍',
        playerLine:'我觉得我们应该换个思路，不是录完再发，而是按住就能说。',
        xiaolongFeedback:'嗯。方向想清楚了再动手。',
        immediateEffects:{resource:-20,creativity:5}, delayedEffects:{users:2500000,reputation:15}, delayedRounds:2, delayedDesc:'「按住说话」后来居上', tags:{longTermism:1} },
      { label:'C', text:'不做语音，继续打磨文字和图片',
        cost:'⏳ 消耗少，但竞品不会等你',
        playerLine:'语音这事我觉得不急。把文字体验打磨到极致，也是一条路。',
        xiaolongFeedback:'窗口不会一直开着。',
        immediateEffects:{resource:-5}, delayedEffects:{users:800000,reputation:-5,resource:-10}, delayedRounds:1, delayedDesc:'未做语音的后果',
        achievement:{icon:'🛋️',name:'南通6楼的幽灵',desc:'你可能发明了另一个邮箱。'} }
    ],
    archive:{ realChoice:'按住说话', sections:[
      { text:'2011年5月10日，微信2.0上线。核心功能：「按住说话」——摁住、说话、松开、送达。' },
      { text:'核心技术是「边录边传」：普通语音要录完→上传→下载→播放四步，微信的方案边录边送达，语音气泡「秒发」。' },
      { text:'语音按钮做成磨损金属质感，按下去有来福枪上膛的「咔嚓」声。每条语音的气泡宽度跟时长成正比，让人一眼就能看出这条消息有多长。这些细节没人提需求，团队自己磨出来的。' },
      { img:'images/wx2.0-voice2.png', caption:'微信 2.0 · 语音对讲界面' },
      { text:'5月1日米聊抢先上线语音对讲，微信一度被反超，但凭借更极致的体验迅速翻盘。日新增数倍增长。' }
    ], quote:'辛苦了很久，微信的同学们今晚享受到用户暴涨的喜悦了。Mark一下。—— 小龙' },
    results: {
      A: {
        title:'「快，但不够爽」',
        messages: [
          { type:'scene', text:'团队一周赶出了「录完发送」版本。\n\n点「录制」→ 说话 → 点「发送」→ 对方下载 → 播放。\n五步。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'省了两周时间，但丢掉了差异化。' }
        ],
        screenshots: [
          { src:'images/wx2.0-voice-ui.png', caption:'微信 2.0 语音对讲' }
        ],
        reflection:'快不是目的。跟着竞品走，做出来的永远是别人的东西。需求只来自你对用户的了解，不来自竞争对手。'
      },
      B: {
        title:'「杀米会」',
        messages: [
          { name:'技术同学', avatar:'H', avatarClass:'harry', text:'我同意。摁住按钮发语音，这种交互在电脑上不存在，但在手机上非常自然。关键不在于提升通讯效率——在于它足够独特、好玩。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'用户打开就能听。不要让他等下载。点一下就播。' },
          { type:'scene', text:'方向定了。团队全力扑上去。' },
          { name:'设计同学', avatar:'K', avatarClass:'kink', text:'交互出来了，你们看一下。' },
          { type:'image', src:'images/wx2.0-voice-ui.png', caption:'微信2.0 按住说话 设计稿', name:'设计同学', avatar:'K', avatarClass:'kink' },
          { type:'image', src:'images/test-phones-early.jpg', caption:'早期微信测试机' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'测试机自己挑一台。每个机子都跑一遍，确保所有手机上交互都顺畅。' },
          { type:'scene', text:'5月1日，米聊抢先上线语音对讲。一周内下载量翻了两倍。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'杀米会。不放假了。' },
          { type:'scene', text:'没有人慌。所有人都知道，方向已经想清楚了。剩下的，就是执行。' }
        ],
        screenshots: [],
        reflection:'微信没有「抄作业」，而是回到一个问题：用户用起来爽不爽？'
      },
      C: {
        title:'「南通6楼的幽灵」',
        messages: [
          { type:'scene', text:'你决定不做语音。\n\n三个月过去。米聊上了语音对讲，用户翻了三倍。微信的日新增还在5000。' },
          { name:'Pony', avatar:'P', avatarClass:'pony', text:'语音是趋势。你们怎么看？' }
        ],
        screenshots: [
          { src:'images/wx2.0-voice-ui.png', caption:'微信 2.0 — 你错过的功能' }
        ],
        reflection:'不做语音不是错误——但在2011年，语音对讲是移动IM的结构性变化。错过结构性窗口，后面再追就难了。'
      }
    }
  },
  3: {
    phase:'萌芽期', title:'找朋友', year:'2011', ver:'v3.0', continueText:'发布',
    multiSelect: true,  // 多选题标记
    multiSelectHint: '可多选，但每个功能都要消耗资源',
    multiSelectConfirmText: '就这些，开干',
    multiSelectMin: 1,  // 至少选一个
    messages: [
      { type:'time', text:'2011年夏 · 南方通讯大厦六楼' },
      { type:'scene', text:'语音对讲上线后，日新增从5000涨到了5万。但还不够。' },
      { type:'scene', text:'南方通讯大厦楼层很矮，不超过三米。晚上，十来个人挤在小龙的办公室里，窗外的中山大道已经安静下来。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'通讯软件第一重要的需求是什么？找到人。\n谁最先迈过用户密度这个坎，谁就赢了。' },
      { type:'scene', text:'有人随口说了一句——' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'楼上说不定就有个美女在用微信。但我们不知道她在哪儿。' },
      { name:'技术同学', avatar:'H', avatarClass:'harry', text:'智能手机有GPS。用网格划分，一个格子一个格子查。两三天能做出来。' },
      { type:'scene', text:'又有人提起一件事——' },
      { name:'技术同学', avatar:'H', avatarClass:'harry', text:'前两天吃饭的时候我在玩Bump，摇了一下手机，竟然摇出一个女生。发了条消息，她秒回了——一个真人。把我吓坏了。一旦开始摇了，你就忍不住不停地摇。' },
      { type:'scene', text:'角落里有人接了一句——' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'还有QQ邮箱的漂流瓶。上千万人在用，搬到手机上不难。' },
      { type:'scene', text:'方案越聊越多。每个人都在往白板上写。资源有限，团队只有十几个人——但谁也不想错过窗口期。' },
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'都是给用户一个安装微信的理由。资源有限。{player_call}你觉得我们该做哪些？' }
    ],

    options: [
      { label:'A', text:'「附近的人 + 摇一摇」—— 用位置和体感，发现身边的微信用户',
        cost:'🔋 资源 -20 · 附近的人可能引来灰产 · 摇一摇的交互需反复打磨',
        immediateEffects:{resource:-20,reputation:10,creativity:3}, delayedEffects:{users:35000000,reputation:10}, delayedRounds:1, delayedDesc:'附近的人+摇一摇引爆增长', tags:{longTermism:1,userFirst:1} },
      { label:'B', text:'「漂流瓶」—— 把心事扔进大海，等一个陌生人捡起',
        cost:'🔋 资源 -8 · 从QQ邮箱移植，开发快 · 留存存疑',
        immediateEffects:{resource:-8}, delayedEffects:{users:8000000,reputation:5}, delayedRounds:1, delayedDesc:'漂流瓶带来尝鲜用户' },
      { label:'C', text:'「QQ邮箱推广」—— 给每个QQ邮箱用户发微信推广消息',
        cost:'🔋 资源 -5 · 用户数短期飙升 · 但增长依赖腾讯内部渠道',
        immediateEffects:{resource:-5,users:10000000,creativity:-5}, delayedEffects:{reputation:-15}, delayedRounds:1, delayedDesc:'推广带来的用户留存差', tags:{aggressiveGrowth:1} }
    ],

    // 多选题：玩家发言 & 小龙反馈，基于选择组合
    multiSelectPlayerLines: {
      'A':     '附近的人加摇一摇。一个看，一个摇，让用户发现身边有人在用微信。',
      'B':     '漂流瓶，QQ邮箱验证过的玩法，移到手机上试试。',
      'C':     '用QQ邮箱给所有用户发推广消息。腾讯几亿邮箱用户，总有人会来试。',
      'AB':    '附近的人、摇一摇、漂流瓶——给用户三个理由来找微信。',
      'ABC':   '全上。社交功能加邮箱推广，所有通道打开。',
      'AC':    '附近的人、摇一摇，再用QQ邮箱推一波。多管齐下。',
      'BC':    '漂流瓶加邮箱推广。稳妥路线。',
      '_default': '这些功能，我们来做。'
    },
    multiSelectXiaolongFeedback: {
      'AB':    '嗯。给用户足够多的理由来，让他们自己选择留下。',
      'ABC':   '都做？资源扛得住就行。不过靠邮箱推广拉来的用户……如果没有自然增长，就不必推广。',
      'A':     '不错。不过你可能还漏了一个——漂流瓶。',
      'B':     '有趣。但光靠漂流瓶够吗？',
      'C':     '如果没有自然增长，就不必推广。推广来的用户，不是被产品吸引来的。',
      'AC':    '邮箱推广是捷径。如果产品本身不够好，推来多少人都留不住。',
      'BC':    '不做附近的人和摇一摇？那可能是最快见效的。',
      '_default': '好。我们试试看。'
    },

    archive:{ realChoice:'附近的人 + 摇一摇 + 漂流瓶', sections:[
      { text:'2011年下半年，微信密集上线三个「找人」功能：「附近的人」（8月3日）→「漂流瓶」（9月）→「摇一摇」（10月）。' },
      { text:'「附近的人」给微信带来的最大价值——给了用户一个安装微信的理由。上线后日安装量达百万级。' },
      { img:'images/wx3.0-main.jpg', caption:'微信 3.0 · 找朋友界面' },
      { text:'「漂流瓶」从QQ邮箱移植而来。QQ邮箱版漂流瓶上线半年用户破千万，是验证过的玩法。搬到手机上成本低、见效快。' },
      { img:'images/wx3.0-bottle.jpg', caption:'漂流瓶 · 远方来信' },
      { text:'「摇一摇」内部代号「撸一撸」，声音是来福枪上膛声——因为刺激。小龙定的标准：四步——摇、咔嚓、开门、出人。一步都不能多。日启动过亿次。' },
      { img:'images/wx3.0-shake.jpg', caption:'摇一摇 · 极简界面' },
      { text:'小龙回复Pony邮件（原文）：「这个功能别人没法超越。一方面我们已经最简化，摇一摇只有一个动作，不可能比它更简单，所以别人没法超越它，只能模仿它；另一方面，整个体验过程是在人类的性驱动力下完成的。功能很简单，又能让你很爽，因而无法被超越。」' },
      { text:'微信也通过QQ邮箱发过推广消息，但小龙从来不把这当作核心增长手段。他坚持微信要有独立人格——增长必须靠用户觉得「爽」，而不是靠内部渠道灌流量。「如果没有自然增长，就不必推广。」' },
      { text:'三管齐下的结果：到2011年底，微信注册用户突破5000万，活跃用户超2000万，正式跨过了用户密度的临界点。' }
    ], quote:'什么是产品体验？一个字，爽。两个字，好玩。—— 小龙' },

    // 结果基于组合动态生成，以下为关键组合的叙事
    results: {
      // 真实历史：AB（附近的人+摇一摇+漂流瓶）
      'AB': {
        title:'「三驾马车」',
        messages: [
          { type:'scene', text:'2011年8月3日，「附近的人」率先上线。办公室里测试的时候——' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'里面有个美女！快加快加！' },
          { name:'产品同学', avatar:'晴', avatarClass:'ts', text:'……那是我老婆。' },
          { type:'scene', text:'哄堂大笑。' },
          { type:'scene', text:'9月，「漂流瓶」上线。从QQ邮箱移植而来——在邮箱里已有上千万用户，搬到手机上是顺理成章的事。' },
          { type:'image', src:'images/wx3.0-bottle.jpg', caption:'漂流瓶 · 扔一个瓶子到大海里' },
          { type:'scene', text:'把心事写进瓶子扔到大海里，等一个素不相识的人捡起——不是"附近"，不是"此刻"，是"远方"。' },
          { type:'scene', text:'10月，「摇一摇」上线。团队一个星期就做完了。内部代号「撸一撸」，声音是来福枪上膛声——因为刺激。' },
          { type:'scene', text:'界面没有任何按钮——只有一张图。' },
          { name:'设计同学', avatar:'K', avatarClass:'kink', text:'最终稿。整个界面就这一个动作。' },
          { type:'image', src:'images/wx3.0-shake-new.jpg', caption:'没有按钮，没有菜单，只有一个动作', name:'设计同学', avatar:'K', avatarClass:'kink' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'四步。摇、咔嚓、开门、出人。一步都不能多。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'这个功能别人没法超越。我们已经最简化，摇一摇只有一个动作。而且整个体验是在人的原始驱动力下完成的。功能很简单，又能让你很爽——因而无法被超越。' },
          { type:'scene', text:'三个功能，三种找人的方式。「附近的人」找身边的人，「摇一摇」找此刻的人，「漂流瓶」找远方的人。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？功能介绍？' },
          { type:'scene', text:'小龙看着后台数据，沉默了几秒。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'用迈克尔·杰克逊。' },
          { type:'image', src:'images/whatsnew-3.0.png', caption:'微信 3.0 开机页面' },
          { type:'scene', text:'You said that I\'m wrong. Then you\'d better prove you\'re right.' }
        ],
        reflection:'功能做到最简单，最符合人的原始体感——就无法被超越。不是选最好的那一个功能，而是让每个人都能找到属于自己的那一个。'
      },
      // 只选A（附近的人+摇一摇）
      'A': {
        title:'「近与远」',
        messages: [
          { type:'scene', text:'2011年8月3日，「附近的人」率先上线。办公室里测试的时候——' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'里面有个美女！快加快加！' },
          { name:'产品同学', avatar:'晴', avatarClass:'ts', text:'……那是我老婆。' },
          { type:'scene', text:'哄堂大笑。' },
          { type:'scene', text:'两个月后，「摇一摇」上线。团队一个星期就做完了。内部代号「撸一撸」，声音是来福枪上膛声——因为刺激。界面没有任何按钮——只有一张图。' },
          { name:'设计同学', avatar:'K', avatarClass:'kink', text:'最终稿。整个界面就这一个动作。' },
          { type:'image', src:'images/wx3.0-shake-new.jpg', caption:'没有按钮，没有菜单，只有一个动作', name:'设计同学', avatar:'K', avatarClass:'kink' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'四步。摇、咔嚓、开门、出人。一步都不能多。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'这个功能别人没法超越。我们已经最简化，摇一摇只有一个动作。而且整个体验是在人的原始驱动力下完成的。功能很简单，又能让你很爽——因而无法被超越。' },
          { type:'scene', text:'「附近的人」找身边的人，「摇一摇」找此刻的人。两条路同时走。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'还不够。我们还少一条路——远方的人。等凑齐了再说。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'「附近的人」解决密度问题，「摇一摇」解决体验问题。互补而非互斥。但还少了一条路——漂流瓶。'
      },
      // 只选B（漂流瓶）
      'B': {
        title:'「远方来信」',
        messages: [
          { type:'scene', text:'漂流瓶从QQ邮箱移植到了手机上。在邮箱里这个功能已有上千万用户——搬到手机端，成本低、见效快。' },
          { type:'image', src:'images/wx3.0-bottle.jpg', caption:'漂流瓶 · 扔一个瓶子到大海里' },
          { type:'scene', text:'把心事写进瓶子扔到大海里，等一个素不相识的人捡起。浪漫，但增长没有预期那么快。' },
          { type:'scene', text:'用户觉得有趣，但不够高频。这是一个"想起来才用"的功能。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'有趣但不够。我们还需要一个让人天天想打开的理由。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不急。等我们做出让自己骄傲的东西再说。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'有趣不等于高频。漂流瓶是个好功能，但不能独自撑起增长。心理满足的驱动力远胜工具甚至省钱——但要找到那个让人「爽」的点。'
      },
      // 只选C（QQ邮箱推广）
      'C': {
        title:'「推广的幻觉」',
        messages: [
          { type:'scene', text:'一封推广邮件发到了每一个QQ邮箱用户的收件箱里。数据确实涨了——大量新用户涌入。' },
          { type:'scene', text:'但用户群里开始出现一种声音。' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'用户反馈不太好。好多人说是被邮件骚扰来的，打开看了一眼就走了。' },
          { type:'scene', text:'后台数据很残酷——推广拉来的用户，次日留存不到10%。他们不是因为「爽」来的，是因为好奇点了一下。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'如果没有自然增长，就不必推广。推来的用户不是被产品吸引的，留不住。' },
          { type:'scene', text:'数字涨了，但产品本身没有变得更好。团队的精力花在了运营推广上，而不是打磨产品上。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不用。这次没什么值得炫耀的。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'如果没有自然增长，就不必推广。用户是被产品本身吸引来的，还是被推广消息骚扰来的？前者留下，后者离开。'
      },
      // ABC 全选
      'ABC': {
        title:'「全面开花」',
        messages: [
          { type:'scene', text:'所有功能全部排上日程。团队十几个人全速运转——资源被摊得很薄。' },
          { type:'scene', text:'「附近的人」8月上线，QQ邮箱推广同步发出，漂流瓶从QQ邮箱移植过来，摇一摇紧随其后。' },
          { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'连着加了两周班。B叔的电脑蓝屏了三次。' },
          { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'服务器扛不住了，我再加两台。' },
          { type:'scene', text:'摇一摇的界面只有一张图，没有按钮。四步——摇、咔嚓、开门、出人。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'功能很简单，又能让你很爽——因而无法被超越。整个体验是在人的原始驱动力下完成的。' },
          { type:'scene', text:'增长确实来了——但邮箱推广拉来的用户，很多根本没有留下。他们好奇来看一眼，然后就走了。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'数字是涨了。但有些涨法不健康。如果没有自然增长，就不必推广。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不用。这次的打法不够纯粹。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。\n\n摇一摇和附近的人是对的——但群发邮件不是。' }
        ],
        reflection:'全都做不等于做对了。邮箱推广拉来的用户不是被产品吸引的——如果没有自然增长，就不必推广。'
      },
      // AC（附近的人+摇一摇+QQ邮箱推广）
      'AC': {
        title:'「快与慢」',
        messages: [
          { type:'scene', text:'「附近的人」8月上线，摇一摇紧随其后。同时QQ邮箱推广消息群发了出去。' },
          { type:'scene', text:'摇一摇的界面只有一张图，没有按钮。四步——摇、咔嚓、开门、出人。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'功能很简单，又能让你很爽——因而无法被超越。整个体验是在人的原始驱动力下完成的。' },
          { type:'scene', text:'但两种增长混在一起，很难分清哪些是被产品吸引的用户，哪些只是被邮件推过来看一眼的。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'附近的人和摇一摇带来的用户，是被产品本身吸引的。但推广拉来的那批……他们不是因为「爽」而来的。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不用。这次的打法不够纯粹，不值得。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'附近的人和摇一摇是对的——但邮箱推广是捷径。好的增长和坏的增长混在一起，会让你分不清产品真正的生命力在哪里。'
      },
      // BC（漂流瓶+QQ邮箱推广）
      'BC': {
        title:'「稳妥路线」',
        messages: [
          { type:'scene', text:'漂流瓶从QQ邮箱移植过来，同时QQ邮箱推广消息群发了出去。' },
          { type:'image', src:'images/wx3.0-bottle.jpg', caption:'漂流瓶 · 扔一个瓶子到大海里' },
          { type:'scene', text:'数据涨了，但不够爆。漂流瓶有趣不高频，推广拉来的用户留存差——两个都不是核心引擎。' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'我们缺一个让人天天想打开的理由。附近的人、摇一摇——那才是真正的引擎。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不急。等我们做出让自己骄傲的东西再说。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'稳妥不等于正确。没有核心引擎，增长就没有爆发力。'
      },
      // 兜底：其他组合
      '_default': {
        title:'「寻找增长」',
        messages: [
          { type:'scene', text:'功能陆续上线。有些见效快，有些需要时间。' },
          { type:'publish-break' },
          { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'3.0的开机画面用什么？做个功能介绍？' },
          { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不急。等我们做出让自己骄傲的东西再说。' },
          { type:'scene', text:'没有特别的开机页面。只是一次安静的版本更新。' }
        ],
        reflection:'每一个功能都是一个假设。多试几个，才能找到那个对的。'
      }
    },
    // 多选成就判定
    multiSelectAchievements: {
      'A':  {icon:'✨',name:'极简主义者',desc:'一个看，一个摇——发现身边的人。'},
      'ABC':{icon:'💪',name:'全都要',desc:'资源撑得住吗？'}
    }
  }
};

// ===== 资源申请场景数据 =====
const RESOURCE_REQUEST_DATA = {
  '萌芽期': {
    amount: 15,
    messages: [
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'现在就十几个人。Android 的 Bug 堆成山，我一个人修不过来。' },
      { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'服务器也快撑不住了。再来一波用户就得宕机。' },
    ],
    xiaolongAsk: '我一直觉得，人少才能做好东西。但现在这个状况......{player_call}你觉得，我们撑得住吗？',
    acceptLine: '服务器撑不住了，先跟公司要点支持吧。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'加人解决不了方向问题。不过基础设施确实是硬伤。' },
      { type:'scene', text:'资源批下来了。服务器扩容了，测试机也到位了。\n\n但奇怪的是，手头宽裕之后，什么都想试，反而不知道该先做哪个了。' }
    ],
    refuseLine: '不用。我们自己想办法。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'人少有人少的好处。每个人都知道自己该做什么。' },
      { type:'scene', text:'没有援军。但反而没有人抱怨了。\n\n每个人都在想，怎么用最少的资源，把事情做到最好。' }
    ]
  },
  '爆发期': {
    amount: 25,
    messages: [
      { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'用户量翻了好几倍，服务器天天报警。' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'需求排不过来。我们几个人根本做不完。' },
    ],
    xiaolongAsk: '做不完不一定要加人。也可以砍需求。但服务器这个事......{player_call}你说呢？',
    acceptLine: '服务器倒了什么都没了。先保住基本面吧。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'人一多，沟通成本是指数级的。只加基础设施的人，产品团队不动。' },
      { type:'scene', text:'资源到位了。团队扩了一圈。\n\n但新来的人需要人带，老人被拉去开会、对齐、写文档。写代码的时间反而更少了。' }
    ],
    refuseLine: '不加。做不完就砍，只留最重要的。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'不是先解决资源问题，是先想清楚什么最重要。' },
      { type:'scene', text:'没有新人，没有新预算。\n\n但每个人都被逼到了极限——然后发现，极限比自己想的远得多。' }
    ]
  },
  '平台期': {
    amount: 35,
    messages: [
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'开放平台上线后，第三方开发者的问题像雪片一样飞来。' },
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'人手完全不够。隔壁部门一个项目就有200人。' },
    ],
    xiaolongAsk: '隔壁200人。大团队有大团队的流程，有固有的评审，有固有的程序。从起点开始就没有优势。{player_call}你觉得我们要变成那样吗？',
    acceptLine: '不用200人，但基础的事确实需要人。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'只要别变成按部就班的团队就行。加人可以，流程不能加。' },
      { type:'scene', text:'资源批下来了。人多了，流程也多了。\n\n以前一句话能定的事，现在要拉三个会。' }
    ],
    refuseLine: '不用。200人做的事，我们想办法用20人做。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'三个臭皮匠是比不过诸葛亮的。我们要找对的人，不是找更多的人。' },
      { type:'scene', text:'6个人做了之前几十人做的事。\n\n不是因为他们更拼，是因为他们想到了更巧的办法。' }
    ]
  },
  '视频期': {
    amount: 40,
    messages: [
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'竞品砸了十个团队在做短视频。我们就这么几个人。' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'不加人的话，视频号的迭代速度跟不上。' },
    ],
    xiaolongAsk: '之前有人跟我说，你们技术太弱了，要不要找几个业界大牛？要不要搞个算法中台？先把人招齐了再说？我没听。{player_call}但这次你怎么看？',
    acceptLine: '这次规模不一样。申请一些吧。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'可以。但不是先解决资源问题再做事。是一边做一边看需要什么。' },
      { type:'scene', text:'资源到位了。但「巧战」的习惯在慢慢消退。\n\n以前一个人能想出来的方案，现在要一个小组讨论三天。' }
    ],
    refuseLine: '不用。十几个人对一千个人，精英巧战。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'堆人堆资源是最容易想到的办法，但不是最好的办法。' },
      { type:'scene', text:'没有援军。但团队找到了更聪明的做法。\n\n用最少的人，做最锋利的产品。' }
    ]
  },
  '成熟期': {
    amount: 45,
    messages: [
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'这么大的业务体量，维护成本越来越高了。' },
      { name:'后台同学', avatar:'B', avatarClass:'bshu', text:'不扩容真的顶不住。每次大促都在赌命。' },
    ],
    xiaolongAsk: '加人是最简单的方案，但也是最危险的。人一多，想法就没了，只剩执行。{player_call}你说呢？',
    acceptLine: '体量到这个程度，基础设施得跟上。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'加人可以，但工作方式不能变。还是敏捷团队的方式。不能变成流程驱动。' },
      { type:'scene', text:'资源给得很充裕。\n\n但团队已经习惯了「有问题就加人」的思路。那种「想尽一切办法巧妙解决」的劲头，越来越少了。' }
    ],
    refuseLine: '不用。保持小团队，保持敏捷。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'小团队是一个价值观问题。它是骨子里的东西。' },
      { type:'scene', text:'一个15人团队管了200多人的事情。\n\n不是苦撑，是真正想明白了——人少，做事才讲究。' }
    ]
  },
  '变革期': {
    amount: 50,
    messages: [
      { name:'客户端同学', avatar:'J', avatarClass:'justin', text:'AI 要算力、要数据标注、要模型训练。这些都是钱。' },
      { name:'产品同学', avatar:'W', avatarClass:'wawa', text:'不投入的话，我们会被甩在后面。' },
    ],
    xiaolongAsk: '我们后台当年也很弱，算法也没积累，但都是自己长出来的，最后都成了业界最好的。AI 这个事......{player_call}你觉得也能这样吗？',
    acceptLine: 'AI 的基础投入确实绕不开。先申请。',
    acceptResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'可以投入，但不是大力出奇迹的路子。还是要想清楚用在哪。' },
      { type:'scene', text:'算力和人手都到位了。\n\n但团队开始追求「大力出奇迹」，而不是「巧劲」了。' }
    ],
    refuseLine: '不急。先想清楚问题是什么。',
    refuseResponse: [
      { name:'小龙', avatar:'龙', avatarClass:'alan', text:'对。不是先要解决资源问题。是先想清楚要解决什么问题。' },
      { type:'scene', text:'没有盲目投入。团队用有限的资源，找到了最聪明的切入点。\n\n有时候，限制本身就是创造力的来源。' }
    ]
  }
};

const BRANCHES_DATA = {
};
