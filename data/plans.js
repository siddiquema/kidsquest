// KidQuest — starting Skills plans and weekly topics
// Plain script: shares globals with the other files; load order is set in index.html.

const act = (id,emoji,title,minutes,instructions,mode='') => ({ id, emoji, title, minutes, mode, instructions });

// Starting plans from the two handover briefs. Parents pick one per kid, then edit freely.
const PLAN_TEMPLATES = {
  grade3: {
    label: 'Age 8 · Hindi, Telugu & handwriting (timed)',
    days: {
      mon: [ act('hw-journal','✍️','Space Journal',7,'Copy one planet fact neatly in your 4-line notebook.'),
             act('hi-read','📗','Hindi reading',13,'Read in short bursts. Point with your finger, then tell what happened after each paragraph.') ],
      tue: [ act('hw-letters','✍️','Letters of the week',7,'Practise this week’s letters: {letterGroup}. Slow and neat.'),
             act('te-practice','📙','Telugu',13,'Tutor session, or Google Read Along in Telugu.') ],
      wed: [ act('hw-journal','✍️','Space Journal',7,'Copy one planet fact neatly in your 4-line notebook.'),
             act('hi-grammar','🎲','Hindi grammar game',13,'Play a game with this week’s topic: {hindiGrammar}.') ],
      thu: [ act('hw-letters','✍️','Letters of the week',7,'Practise this week’s letters: {letterGroup}. Slow and neat.'),
             act('te-practice','📙','Telugu',13,'Tutor session, or Google Read Along in Telugu.') ],
      fri: [ act('hw-fact','🌟','Fact of the week',7,'Write your own “Fact of the week” in your best handwriting.'),
             act('teach-back','🧑‍🏫','Teach-back',13,'Quiz Mum or Dad on Hindi grammar, then teach them 3 Telugu words.') ],
      sat: [ act('game-inventor','🎮','Game Inventor',60,'Invent a game from any objects. It must use Hindi or Telugu words (or {hindiGrammar}). Write the rules in your best handwriting, then teach it to the twins.') ],
      sun: [ act('storybook','📚','Hindi or Telugu storybook',20,'Read a StoryWeaver book (Level 1+) in Hindi or Telugu.'),
             act('space-project','🪐','Space project',20,'Work on your space project. Label things in English, Hindi and Telugu.'),
             act('typing','⌨️','TypingClub',15,'Do your next Home Row lesson on TypingClub.'),
             act('hw-benchmark','📸','Handwriting check',5,'Write “{benchmarkSentence}” in your best handwriting. Ask Mum or Dad to take a photo.') ],
    },
    daily: [],
    topics: { letterGroup:'a c d g o q', hindiGrammar:'ling (gender): ladka khelta hai / ladki khelti hai', benchmarkSentence:'The planets go around the Sun.' },
  },
  reader: {
    label: 'Age 5–6 · confident reader',
    days: twinDays(act('reading','📖','Reading',null,'Read a short book aloud, then tell the story back.','separate')),
    daily: [ act('boost','🌙','Reading boost',null,'Read one page at bedtime.','separate'), ownJob() ],
    topics: {},
  },
  early: {
    label: 'Age 5–6 · early reader',
    days: twinDays(act('reading','🔤','Reading',null,'Do the current reading-path step. Then tell a plan or story — Mum or Dad writes it, and you read it back.','separate')),
    daily: [ act('boost','🤖','Reading boost',null,'Robot-talk game with 5 words, plus the current reading step.','separate'), ownJob() ],
    topics: {},
  },
  empty: { label: 'Empty plan', days:{}, daily:[], topics:{} },
};
function ownJob(){ return act('own-job','👟','Own job',null,'Shoes to the rack, plate to the sink, tidy up your toys.'); }
// The twins share every day except Monday's reading, which differs per child
function twinDays(mondayReading){
  const T='together';
  return {
    mon: [ mondayReading ],
    tue: [ act('numbers','🔢','Numbers',null,'Chess-piece maths, a dice race, or the shop game with coins.',T) ],
    wed: [ act('chess','♟️','Thinking & chess',null,'One checkmate-in-1 puzzle, then the “what moved?” memory game.',T) ],
    thu: [ act('life','🎒','Life & social',null,'Pack your own bag, set the table, a feelings talk, and a handshake after games.',T) ],
    fri: [ act('art','🎨','Body & creativity',null,'Art club (this week’s step), then 5 minutes of dance or hopscotch.',T) ],
    sat: [ act('family-chess','♟️','Family chess',20,'Play chess together as a family.',T),
           act('outdoor','🌳','Outdoor play',30,'Run, climb, ride or play ball outside.',T),
           act('make','🛠️','Make something',30,'Build or make something together.',T) ],
    sun: [ act('story-time','📚','Story time',20,'Read stories together.',T),
           act('real-maths','🛒','Real-world maths',20,'Count, weigh or pay for things at home or at the shop.',T),
           act('buddy','🤝','Buddy session',20,'Play or read with your big brother.',T) ],
  };
}

const TOPIC_FIELDS = [
  ['letterGroup','Letters of the week','e.g. a c d g o q'],
  ['hindiGrammar','Hindi grammar topic','e.g. vachan (singular/plural)'],
  ['benchmarkSentence','Handwriting check sentence','Same sentence every Sunday'],
];
