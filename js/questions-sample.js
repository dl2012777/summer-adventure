// ============================================================
//  Questions Sample — 测试用题库 Day 1 英语
//  沪教版 5B M1U1 What a mess!（物主代词）
// ============================================================
var QUESTIONS = {
  'en-day1': [
    // === 词汇闯关（17题，题库备26题）===
    // -- Easy: en2cn --
    { id:'v1', type:'vocabulary', difficulty:'easy', pointValue:100,
      question:'"mine" 的中文是？', options:['我的','你的','他的','她的'], answer:0,
      explanation:'mine = 我的，名词性物主代词。' },
    { id:'v2', type:'vocabulary', difficulty:'easy', pointValue:100,
      question:'"yours" 的中文是？', options:['你的','我的','他的','她的'], answer:0,
      explanation:'yours = 你的/你们的。' },
    { id:'v3', type:'vocabulary', difficulty:'easy', pointValue:100,
      question:'"tidy" 的中文是？', options:['整洁的','凌乱的','安静的','大声的'], answer:0,
      explanation:'tidy = 整洁的，收拾整齐。' },
    { id:'v4', type:'vocabulary', difficulty:'easy', pointValue:100,
      question:'"messy" 的中文是？', options:['凌乱的','整洁的','干净的','明亮的'], answer:0,
      explanation:'messy = 凌乱的，不整洁。' },
    // -- Medium: cn2en --
    { id:'v5', type:'vocabulary', difficulty:'medium', pointValue:100,
      question:'"他的" 用英语怎么说（名词性）？', options:['his','him','he','her'], answer:0,
      explanation:'his = 他的（名词性物主代词，his既是形容词性也是名词性）。' },
    { id:'v6', type:'vocabulary', difficulty:'medium', pointValue:100,
      question:'"她的" 用英语怎么说（名词性）？', options:['hers','her','she','herself'], answer:0,
      explanation:'hers = 她的，如 This book is hers.' },
    { id:'v7', type:'vocabulary', difficulty:'medium', pointValue:100,
      question:'"收拾好" 用英语怎么说？', options:['put away','take away','throw away','run away'], answer:0,
      explanation:'put away = 收拾好，放回原处。' },
    { id:'v8', type:'vocabulary', difficulty:'medium', pointValue:100,
      question:'"谁的" 用英语怎么说？', options:['whose','who','whom','who\'s'], answer:0,
      explanation:'whose = 谁的，用于提问物品归属。' },
    // -- Hard: spelling --
    { id:'v9', type:'vocabulary', difficulty:'hard', pointValue:100,
      question:'补全单词: "我们的" 名词性 = o _ _ s', options:['ours','our','ourselves','ourself'], answer:0,
      explanation:'ours = 我们的，如 This classroom is ours.' },
    { id:'v10', type:'vocabulary', difficulty:'hard', pointValue:100,
      question:'"他们的" 名词性物主代词是？', options:['theirs','their','them','themselves'], answer:0,
      explanation:'theirs = 他们的/她们的/它们的。' },

    // === 语法迷宫（13题，题库备20题）===
    // -- Easy: fill_blank --
    { id:'g1', type:'grammar', difficulty:'easy', pointValue:100,
      question:'This book is _____. (它是我的)', options:['mine','my','me','I'], answer:0,
      explanation:'后面没有名词，用名词性物主代词 mine。' },
    { id:'g2', type:'grammar', difficulty:'easy', pointValue:100,
      question:'Is this _____ pen? (你的)', options:['your','yours','you','yourselves'], answer:0,
      explanation:'后面有名词 pen，用形容词性物主代词 your。' },
    { id:'g3', type:'grammar', difficulty:'easy', pointValue:100,
      question:'These are _____ shoes. (她的)', options:['her','hers','she','herself'], answer:0,
      explanation:'后面有名词 shoes，用形容词性物主代词 her。' },
    // -- Medium: fill_blank --
    { id:'g4', type:'grammar', difficulty:'medium', pointValue:100,
      question:'— Whose bag is this? — It\'s _____. (我的)', options:['mine','my','me','myself'], answer:0,
      explanation:'回答"这是谁的包"时，用名词性物主代词 mine，等于 my bag。' },
    { id:'g5', type:'grammar', difficulty:'medium', pointValue:100,
      question:'— Is this _____ bike? — No, it\'s _____. (你的)(他的)',
      options:['your, his','yours, his','your, him','yours, him'], answer:0,
      explanation:'第一个空后有bike填your，第二个空后无名词填his。' },
    { id:'g6', type:'grammar', difficulty:'medium', pointValue:100,
      question:'Put _____ your toys, please.', options:['away','on','off','up'], answer:0,
      explanation:'put away = 收拾好。' },
    // -- Hard: error_fix --
    { id:'g7', type:'grammar', difficulty:'hard', pointValue:100,
      question:'哪一处有错误？"This is mine book. That is yours."',
      options:['This','mine','That','yours'], answer:1,
      explanation:'mine 是名词性，不能修饰名词。应改为 my。' },
    { id:'g8', type:'grammar', difficulty:'hard', pointValue:100,
      question:'哪一处有错误？"The cat is her. The dog is mine."',
      options:['The cat','her','The dog','mine'], answer:1,
      explanation:'her 是形容词性，不能单独使用。应改为 hers。' },

    // === 听说挑战（6题，题库备9句）===
    { id:'s1', type:'speaking', difficulty:'easy', pointValue:100,
      question:'请跟读：This is my book.', textToSpeak:'This is my book.',
      explanation:'注意 this 的 /ð/ 和 book 的 /ʊ/。' },
    { id:'s2', type:'speaking', difficulty:'easy', pointValue:100,
      question:'请跟读：Is this your pen?', textToSpeak:'Is this your pen?',
      explanation:'注意一般疑问句的升调。' },
    { id:'s3', type:'speaking', difficulty:'medium', pointValue:100,
      question:'请跟读：Whose bag is this?', textToSpeak:'Whose bag is this?',
      explanation:'注意 whose 的 /huːz/ 发音。' },
    { id:'s4', type:'speaking', difficulty:'medium', pointValue:100,
      question:'请跟读：It\'s mine. Put it away.', textToSpeak:'It\'s mine. Put it away.',
      explanation:'注意连读 "put it"。' },
    { id:'s5', type:'speaking', difficulty:'hard', pointValue:100,
      question:'请跟读：This is ours, not theirs.', textToSpeak:'This is ours, not theirs.',
      explanation:'注意 ours 和 theirs 的 /z/ 结尾。' },
    { id:'s6', type:'speaking', difficulty:'hard', pointValue:100,
      question:'请跟读：Please tidy up your room!', textToSpeak:'Please tidy up your room!',
      explanation:'祈使句的语调要肯定有力。' },

    // === Boss 关（4题，题库备6题）===
    { id:'b1', type:'boss', difficulty:'hard', pointValue:100,
      question:'选择正确的句子：', options:[
        'This is my pen. That is yours.',
        'This is mine pen. That is your.',
        'This is my. That is your.',
        'This is mine. That is your.'
      ], answer:0,
      explanation:'第一空后有名词pen用my，第二空后无名词用yours。' },
    { id:'b2', type:'boss', difficulty:'hard', pointValue:100,
      question:'— _____ book is this? — It\'s _____ .', options:[
        'Whose, hers', 'Who, her', 'Whose, her', 'Who, hers'
      ], answer:0,
      explanation:'提问归属用 Whose，回答用名词性物主代词 hers。' },
    { id:'b3', type:'boss', difficulty:'hard', pointValue:100,
      question:'选出与 "They are our books." 意思相同的句子：',
      options:[
        'These books are ours.',
        'These books are our.',
        'These are we books.',
        'These books are them.'
      ], answer:0,
      explanation:'our books = ours，物主代词转换。' },
    { id:'b4', type:'boss', difficulty:'hard', pointValue:100,
      question:'请选出错误的一项并改正："Her room is tidy, but mine room is messy."',
      options:['Her → She','mine → my','tidy → tidily','messy → mess'], answer:1,
      explanation:'mine 后面不能跟名词 room，应改为 my room。' },
  ]
};
window.QUESTIONS = QUESTIONS;
window.QUESTIONS = QUESTIONS;
