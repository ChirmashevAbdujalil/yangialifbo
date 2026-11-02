/*
 * Mashqlar uchun so'zlar va gaplar (joriy lotin yozuvida).
 * ' belgisi avtomatik ravishda ʻ yoki ʼ ga aylantiriladi.
 */
(function (global) {
  'use strict';
  var N = global.UzConvert.normalizeApostrophes;

  var WORDS = (
    'olma anor bola kitob maktab daftar qalam ruchka uy eshik deraza stol stul non suv choy sut ' +
    "go'sht osh palov somsa lag'mon tog' daryo dengiz ko'l bog' gul lola daraxt barg meva sabzavot " +
    "sabzi piyoz kartoshka pomidor bodring qovun tarvuz uzum o'rik shaftoli gilos olcha yong'oq bodom " +
    "quyosh oy yulduz osmon bulut yomg'ir qor shamol bahor yoz kuz qish kun tun tong kecha bugun " +
    "ertaga hafta yil vaqt soat daqiqa ona ota aka uka opa singil buvi bobo oila do'st o'rtoq " +
    "qo'shni mehmon o'qituvchi o'quvchi talaba shifokor dehqon ishchi haydovchi oshpaz quruvchi " +
    "muhandis dasturchi vatan xalq yurt shahar qishloq ko'cha mahalla bozor do'kon kutubxona " +
    "bekat poyezd avtobus mashina velosiped samolyot kema yo'l ko'prik bino xona oshxona hovli ish " +
    "o'qish yozish o'yin qo'shiq raqs kino teatr muzey sport futbol kurash shaxmat kompyuter " +
    "telefon internet dastur klaviatura sichqoncha ekran harf so'z gap matn til alifbo bilim ilm " +
    "fan tarix adabiyot matematika fizika kimyo biologiya sinf dars imtihon baho savol javob masala " +
    "misol yangi eski katta kichik uzun qisqa baland past tez sekin yaxshi yomon chiroyli oq qora " +
    "qizil sariq yashil ko'k moviy issiq sovuq shirin achchiq nordon toza kuchli zo'r aqlli " +
    "mehribon quvnoq xursand g'amgin tinch bor yo'q keldi ketdi yozdi o'qidi ko'rdi eshitdi " +
    "gapirdi kuldi yugurdi yurdi o'tirdi turdi yedi ichdi uxladi ishladi o'ynadi bilaman sevaman " +
    "qilamiz boramiz kelamiz salom rahmat marhamat kechirasiz xayr ha albatta balki hamma har biz " +
    "siz ular men sen bu shu o'sha nima kim qayer qachon nega qanday qancha bir ikki uch to'rt besh " +
    "olti yetti sakkiz to'qqiz o'n yuz ming ma'no ta'lim ba'zi mas'uliyat jur'at she'r g'alaba " +
    "g'isht g'oz g'oya tog'a o'g'il qo'g'irchoq chumchuq choynak chiroq shudring shirinlik chaqmoq " +
    "chang keng rang dala shakl sahifa jadval hikoya ertak qahramon sayohat orzu umid baxt " +
    "sog'liq salomatlik tabiat hayvon qush baliq ot it mushuk sigir qo'y echki tuya bulbul " +
    "lochin burgut kapalak asalari chumoli ilon toshbaqa"
  ).split(/\s+/).map(N);

  var SENTENCES = [
    "O'qigan o'zar, o'qimagan to'zar.",
    "Til - dil kaliti.",
    "Yaxshi so'z - jon ozig'i, yomon so'z - bosh qozig'i.",
    "Birlashgan o'zar, birlashmagan to'zar.",
    "Ona yurting - oltin beshiging.",
    "Sabr tagi - sariq oltin.",
    "Har kim ekkanini o'radi.",
    "Ko'p o'qigan ko'p biladi.",
    "Ilmsiz bir yashar, ilmli ming yashar.",
    "Yetti o'lchab, bir kes.",
    "Oz-oz o'rganib dono bo'lur, qatra-qatra yig'ilib daryo bo'lur.",
    "Aql yoshda emas, boshda.",
    "Bugungi ishni ertaga qoldirma.",
    "Tilga e'tibor - elga e'tibor.",
    "Qush uyasida ko'rganini qiladi.",
    "Yaxshidan bog' qoladi, yomondan dog' qoladi.",
    "Mehnat qilsang, rohat ko'rasan.",
    "Bir yigitga yetmish hunar oz.",
    "Do'st boshga boqar, dushman oyoqqa.",
    "Daraxt bir joyda ko'karadi.",
    "Kitob - bilim manbai.",
    "Ilm olish - igna bilan quduq qazish.",
    "Hunarli kishi och qolmas.",
    "Vaqt - oltindan qimmat.",
    "Tez yozishni o'rganish uchun har kuni mashq qilish kerak.",
    "Bahorda bog'larda gullar ochiladi, qushlar shirin sayraydi.",
    "Toshkent - O'zbekistonning poytaxti va eng katta shahri.",
    "Samarqand, Buxoro va Xiva qadimiy shaharlardir.",
    "Choyxonada mehmonlar palov va issiq non bilan siylandi.",
    "Kompyuterda o'zbek tilida to'g'ri va chiroyli yozing."
  ].map(N);

  global.UzData = { WORDS: WORDS, SENTENCES: SENTENCES };
})(window);
