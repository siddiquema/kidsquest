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

// ═══════════════════════════════════════
//  HELP  (shown when a kid taps an activity: short steps, examples, a tip for the grown-up)
// ═══════════════════════════════════════
// Looked up as `${template}:${id}` first (the twins' plans share ids but differ), then by id.
// {letterGroup}, {hindiGrammar} and {benchmarkSentence} are filled in from the plan's weekly topics.
const SKILL_HELP = {
  'hw-journal': { steps:['Open your 4-line notebook and write today’s date.','Pick one planet fact you like.','Copy it slowly. Sit straight and hold your pencil gently.','Check: do all the letters sit on the line?'],
                  examples:['Saturn has bright rings.','Mars is called the Red Planet.','Jupiter is the biggest planet.'] },
  'hi-read':    { steps:['Sit somewhere quiet with your Hindi book.','Read one short paragraph. Point at each word with your finger.','Stop and tell Mum or Dad what happened, in your own words.','Read the next paragraph the same way.'],
                  tip:'Short bursts are fine — a paragraph, then a chat. Praise the retelling, not just the reading.' },
  'hw-letters': { steps:['This week’s letters are: {letterGroup}.','Write each letter 5 times, slowly.','Circle your best one of each.','Write one short word that uses them.'] },
  'te-practice':{ steps:['If it’s a tutor day: go to your Telugu tutor session.','If not: open Google Read Along and choose a Telugu story.','Read out loud. The app listens and helps.','Tell Mum or Dad one new Telugu word you learnt.'] },
  'hi-grammar': { steps:['This week’s topic is: {hindiGrammar}.','Play with Mum or Dad: one says a word or sentence, the other changes it using the topic.','Take turns. Each right answer is a point!','Try the Hindi grammar quiz in the 🎮 Play tab too.'],
                  examples:['ladka khelta hai → ladki khelti hai','kitab → kitaben','kamra → kamre'] },
  'hw-fact':    { steps:['Think of the most interesting thing you learnt this week.','Write it as one sentence in your best handwriting.','Draw a small picture next to it.'] },
  'teach-back': { steps:['You are the teacher today!','Ask Mum or Dad 3 questions about this week’s Hindi grammar.','Then teach them 3 Telugu words and what they mean.','Give them a star if they get it right!'] },
  'game-inventor':{ steps:['Find some things at home: cups, blocks, cards, a ball.','Make up a game with them. Decide how you win.','Your game must use Hindi or Telugu words (or {hindiGrammar}).','Write the rules on paper in your best handwriting.','Teach the game to the twins and play it together!'] },
  'storybook':  { steps:['Open StoryWeaver and choose a Level 1 story in Hindi or Telugu.','Read it out loud, one page at a time.','Tell someone what the story was about.'] },
  'space-project':{ steps:['Take out your space project.','Add something new: a planet, a label or a drawing.','Write the labels in English, Hindi and Telugu.'] },
  'typing':     { steps:['Open TypingClub and log in.','Do your next Home Row lesson.','Keep your fingers on the home keys: a s d f and j k l ;','Look at the screen, not your fingers!'] },
  'hw-benchmark':{ steps:['Write this sentence in your best handwriting:','“{benchmarkSentence}”','Ask Mum or Dad to take a photo of it.','You write the same sentence every Sunday, so you can see yourself getting better!'] },

  'reader:reading': { steps:['Pick a short book you like.','Read it out loud to Mum or Dad.','Close the book and tell the story back: beginning, middle and end.'],
                      tip:'Ask “what happened next?” rather than correcting every word.' },
  'early:reading':  { steps:['Do today’s reading step with Mum or Dad.','Then tell them a story, or your plan for the day.','They write it down for you.','Now read your own words back!'],
                      tip:'Use the current reading-path step: letter sounds, robot talk, sound buttons, tiny sentences, or reading their own words.' },
  'reader:boost':   { steps:['At bedtime, pick your book.','Read one page out loud.','Say one thing you liked about it.'] },
  'early:boost':    { steps:['Play robot talk! Mum or Dad talks like a robot, saying each sound: c… a… t','You squash the sounds together and shout the word: “cat!”','Do 5 words.','Then do today’s reading step.'],
                      examples:['c-a-t → cat','d-o-g → dog','s-u-n → sun','p-i-g → pig','h-a-t → hat','m-a-p → map'],
                      tip:'Say the sounds (“mmm”, “aaa”, “p”), not the letter names (“em”, “ay”, “pee”).' },
  'numbers':     { steps:['Pick a game with Mum or Dad.','Chess-piece maths: count the pawns, then add the knights and bishops.','Dice race: roll, count the dots, move that many steps.','Shop game: buy toys with coins and count the change.'] },
  'chess':       { steps:['Set up the chess puzzle with Mum or Dad.','Find the move that wins straight away: checkmate!','Then play “what moved?”: look at the board, close your eyes, someone moves one piece, and you find it!','You can play What moved? in the 🎮 Play tab too.'] },
  'life':        { steps:['Pack your own school bag.','Help set the table for dinner.','Feelings talk: say how you felt today and why.','After a game, shake hands and say “good game!”'] },
  'art':         { steps:['Do this week’s art club step: draw, paint, cut or stick.','Tidy up your art things.','Then 5 minutes of dancing or hopscotch!'] },
  'family-chess':{ steps:['Set up the chess board together.','Play a game with Mum, Dad or your brother.','Shake hands at the end: “good game!”'] },
  'outdoor':     { steps:['Go outside with a grown-up.','Run, climb, ride your bike or play ball.','Drink some water when you come back in.'] },
  'make':        { steps:['Choose what to make: a tower, a car, a card or a drawing.','Collect what you need: blocks, paper, glue, boxes.','Build it together, then show everyone!'] },
  'story-time':  { steps:['Pick a story book together.','A grown-up reads a page, and you say what you see in the pictures.','Talk about your favourite part.'] },
  'real-maths':  { steps:['Help with real counting today.','Count the plates and spoons for dinner.','At the shop, find the price and count the coins.','Weigh two fruits and say which is heavier.'] },
  'buddy':       { steps:['Ask your big brother to play or read with you.','He can teach you a game he made up!','Say thank you when you finish.'] },
  'own-job':     { steps:['Put your shoes on the shoe rack.','Take your plate to the sink after eating.','Tidy your toys back into their box.'] },
};
function helpFor(plan,a){
  if(a.steps?.length) return { steps:a.steps };   // a parent's own steps (from the plan editor) win
  return SKILL_HELP[`${plan?.template}:${a.id}`] || SKILL_HELP[a.id] || null;
}
