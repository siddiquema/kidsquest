// KidQuest — quiz question banks
// Plain script: shares globals with the other files; load order is set in index.html.

const SPACE_BANK = [
  ['Which planet is closest to the Sun?','Mercury',['Venus','Mars','Earth']],
  ['Which planet is famous for its big, bright rings?','Saturn',['Mars','Mercury','Venus']],
  ['Which is the biggest planet?','Jupiter',['Saturn','Earth','Neptune']],
  ['Which planet is called the Red Planet?','Mars',['Venus','Jupiter','Mercury']],
  ['What is the Sun?','A star',['A planet','A moon','A comet']],
  ['How many planets are in our solar system?','8',['7','9','10']],
  ['Which is the hottest planet?','Venus',['Mercury','Mars','Jupiter']],
  ['What does the Moon go around?','Earth',['The Sun','Mars','Jupiter']],
  ['Which planet is farthest from the Sun?','Neptune',['Uranus','Saturn','Jupiter']],
  ['What is Jupiter’s Great Red Spot?','A giant storm',['A volcano','A lake','A mountain']],
  ['Which planet spins on its side?','Uranus',['Neptune','Saturn','Mars']],
  ['What do we call a space rock that lands on Earth?','A meteorite',['A comet','A planet','A star']],
  ['Which galaxy do we live in?','The Milky Way',['Andromeda','The Big Dipper','Orion']],
  ['Who was the first person to walk on the Moon?','Neil Armstrong',['Yuri Gagarin','Rakesh Sharma','Kalpana Chawla']],
  ['Which Indian mission landed near the Moon’s south pole in 2023?','Chandrayaan-3',['Mangalyaan','Aditya-L1','Gaganyaan']],
  ['How long does Earth take to go around the Sun?','About 365 days',['About 30 days','About 7 days','About 24 hours']],
  ['How long does Earth take to spin around once?','About 24 hours',['About 365 days','About 1 hour','About 30 days']],
  ['What is a group of stars that makes a picture in the sky?','A constellation',['A galaxy','A comet','An orbit']],
  ['Why does the Moon shine?','Sunlight bounces off it',['It has its own fire','It is a star','Lightning']],
  ['What is the path of a planet around the Sun called?','An orbit',['A ring','A tail','A crater']],
  ['Which planet do we live on?','Earth',['Mars','Venus','Saturn']],
  ['What is the hole made when a rock hits the Moon called?','A crater',['A canyon','A cave','An orbit']],
];
const HI_SUBJECTS = [ ['लड़का','ladka','boy','m'], ['लड़की','ladki','girl','f'], ['राम','Ram','Ram','m'], ['सीता','Sita','Sita','f'],
  ['भाई','bhai','brother','m'], ['बहन','behen','sister','f'], ['दादा','dada','grandfather','m'], ['दादी','dadi','grandmother','f'],
  ['कुत्ता','kutta','dog','m'], ['बिल्ली','billi','cat','f'] ];
const HI_VERBS = [ ['खेलता','खेलती','khelta','khelti','plays'], ['पढ़ता','पढ़ती','padhta','padhti','reads'], ['गाता','गाती','gaata','gaati','sings'],
  ['खाता','खाती','khaata','khaati','eats'], ['सोता','सोती','sota','soti','sleeps'], ['लिखता','लिखती','likhta','likhti','writes'], ['दौड़ता','दौड़ती','daudta','daudti','runs'] ];
const HI_FEM = [ ['लड़का','लड़की'], ['बेटा','बेटी'], ['राजा','रानी'], ['घोड़ा','घोड़ी'], ['दादा','दादी'], ['नाना','नानी'], ['शेर','शेरनी'], ['मोर','मोरनी'], ['बकरा','बकरी'], ['मामा','मामी'] ];
const HI_PLURAL = [ ['किताब','किताबें','book'], ['लड़का','लड़के','boy'], ['कमरा','कमरे','room'], ['बच्चा','बच्चे','child'], ['कुर्सी','कुर्सियाँ','chair'],
  ['लड़की','लड़कियाँ','girl'], ['मेज़','मेज़ें','table'], ['चिड़िया','चिड़ियाँ','bird'], ['केला','केले','banana'], ['गाड़ी','गाड़ियाँ','car'],
  ['बात','बातें','talk'], ['कपड़ा','कपड़े','cloth'] ];
const SPELL_BANK = [ ['because',['becuase','becaus']], ['friend',['freind','frend']], ['beautiful',['beutiful','beautifull']],
  ['Wednesday',['Wensday','Wednsday']], ['believe',['beleive','beleve']], ['people',['peple','poeple']], ['said',['sed','siad']],
  ['which',['wich','whitch']], ['again',['agian','agen']], ['different',['diffrent','differant']], ['February',['Febuary','Februry']],
  ['school',['skool','shcool']], ['animal',['animel','anamal']], ['favourite',['favrite','favourate']], ['planet',['plannet','planit']],
  ['answer',['anser','answar']], ['would',['wud','whould']], ['through',['threw','thruogh']] ];
const OPP_BANK = [ ['hot','cold'], ['big','small'], ['fast','slow'], ['happy','sad'], ['up','down'], ['light','dark'], ['open','closed'],
  ['full','empty'], ['early','late'], ['strong','weak'], ['tall','short'], ['loud','quiet'], ['wet','dry'], ['first','last'] ];
const RHYME_BANK = [ ['cat',['hat','bat'],['dog','cup']], ['star',['car','jar'],['sun','moon']], ['bee',['tree','sea'],['bug','fly']],
  ['cake',['lake','snake'],['bread','pie']], ['moon',['spoon','soon'],['sky','night']], ['king',['ring','sing'],['queen','crown']],
  ['light',['night','kite'],['lamp','day']], ['book',['cook','look'],['page','read']] ];
