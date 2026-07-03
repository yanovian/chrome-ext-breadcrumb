#!/usr/bin/env node
/**
 * Generate _locales/<code>/messages.json for the manifest-facing strings
 * (extension description + toolbar tooltip). The extension NAME "Breadcrumb" is
 * a brand, so it is not translated.
 *
 * These files are the source of truth for translators and are committed to the
 * repo. Regenerate / add a language with `pnpm locales`.
 *
 * Only Chrome-supported locale codes are used, one main variant per language
 * (see https://developer.chrome.com/docs/extensions/reference/api/i18n#locales).
 * Chinese and Portuguese require a region, so we use the most-spoken variant.
 *
 * Keep every description under Chrome's 132-character manifest limit.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', '_locales');

// [description, toolbar tooltip] per locale. "Breadcrumb" stays untranslated.
//
// Tooltips use a positive "path / journey" metaphor for "learning trail". Many
// languages render "trail / trace / track" with negative or forensic overtones
// (e.g. Farsi رد = reject, Vietnamese "dấu vết" = forensic trace, Serbian/Croatian
// "trag" = clue), so those are deliberately avoided in favour of marketing-safe
// wording. Formality (informal vs formal "you") is kept consistent within a
// language between the description and the tooltip.
const MESSAGES = {
  en: [
    'Save highlights from any web page and search everything you learn — with private, on-device AI.',
    'Breadcrumb — your learning trail',
  ],
  es: [
    'Guarda fragmentos de cualquier página web y busca todo lo que aprendes con IA privada en tu dispositivo.',
    'Breadcrumb — tu camino de aprendizaje',
  ],
  fr: [
    "Enregistrez des extraits de n'importe quelle page web et retrouvez tout ce que vous apprenez grâce à une IA locale et privée.",
    "Breadcrumb — votre parcours d'apprentissage",
  ],
  de: [
    'Speichere Markierungen von jeder Webseite und durchsuche alles, was du lernst – mit privater KI direkt auf dem Gerät.',
    'Breadcrumb – dein Lernpfad',
  ],
  it: [
    "Salva le evidenziazioni da qualsiasi pagina web e cerca tutto ciò che impari con un'IA privata sul dispositivo.",
    'Breadcrumb — il tuo percorso di apprendimento',
  ],
  pt_BR: [
    'Salve trechos de qualquer página da web e pesquise tudo o que você aprende com IA privada no seu dispositivo.',
    'Breadcrumb — sua jornada de aprendizado',
  ],
  nl: [
    'Bewaar markeringen van elke webpagina en doorzoek alles wat je leert met privé-AI op je apparaat.',
    'Breadcrumb — jouw leerpad',
  ],
  pl: [
    'Zapisuj zaznaczenia z dowolnej strony i przeszukuj wszystko, czego się uczysz, dzięki prywatnej AI na urządzeniu.',
    'Breadcrumb — Twoja ścieżka nauki',
  ],
  ru: [
    'Сохраняйте выделенный текст с любой страницы и ищите всё, что вы узнали, с приватным ИИ прямо на устройстве.',
    'Breadcrumb — ваш путь обучения',
  ],
  uk: [
    'Зберігайте виділений текст із будь-якої сторінки та шукайте все, що ви вивчили, завдяки приватному ШІ на пристрої.',
    'Breadcrumb — ваш шлях навчання',
  ],
  tr: [
    'Herhangi bir web sayfasındaki alıntıları kaydet ve öğrendiğin her şeyi cihazındaki özel yapay zekâ ile ara.',
    'Breadcrumb — öğrenme yolculuğun',
  ],
  ar: [
    'احفظ المقتطفات من أي صفحة ويب وابحث في كل ما تتعلمه بذكاء اصطناعي خاص يعمل على جهازك.',
    'Breadcrumb — مسار تعلّمك',
  ],
  fa: [
    'متن‌های مهم هر صفحه‌ی وب را ذخیره کنید و همه‌ی آموخته‌هایتان را با هوش مصنوعی خصوصی روی دستگاه جست‌وجو کنید.',
    'Breadcrumb — مسیر یادگیری شما',
  ],
  he: [
    'שמרו קטעים מכל דף אינטרנט וחפשו כל מה שאתם לומדים עם בינה מלאכותית פרטית ישירות במכשיר.',
    'Breadcrumb — מסלול הלמידה שלך',
  ],
  hi: [
    'किसी भी वेब पेज से हाइलाइट सहेजें और अपनी सीखी हर बात को डिवाइस पर निजी AI से खोजें।',
    'Breadcrumb — आपकी सीखने की राह',
  ],
  bn: [
    'যেকোনো ওয়েব পেজ থেকে হাইলাইট সংরক্ষণ করুন এবং ডিভাইসে ব্যক্তিগত AI দিয়ে আপনার শেখা সবকিছু খুঁজুন।',
    'Breadcrumb — আপনার শেখার পথ',
  ],
  ta: [
    'எந்த வலைப்பக்கத்திலிருந்தும் சிறப்பம்சங்களைச் சேமித்து, நீங்கள் கற்ற அனைத்தையும் சாதனத்தில் தனிப்பட்ட AI மூலம் தேடுங்கள்.',
    'Breadcrumb — உங்கள் கற்றல் பயணம்',
  ],
  ja: [
    'どんなウェブページからでもハイライトを保存し、学んだことすべてを端末内のプライベートAIで検索できます。',
    'Breadcrumb — あなたの学びの軌跡',
  ],
  ko: [
    '어떤 웹페이지에서든 하이라이트를 저장하고, 배운 모든 것을 기기 내 개인 AI로 검색하세요.',
    'Breadcrumb — 나의 학습 여정',
  ],
  zh_CN: [
    '保存任意网页的高亮内容，并用设备端的私密 AI 搜索你学到的一切。',
    'Breadcrumb — 你的学习之旅',
  ],
  vi: [
    'Lưu đoạn văn bản đánh dấu từ mọi trang web và tìm lại mọi thứ bạn học bằng AI riêng tư ngay trên thiết bị.',
    'Breadcrumb — hành trình học tập của bạn',
  ],
  th: [
    'บันทึกข้อความไฮไลต์จากหน้าเว็บใดก็ได้ และค้นหาทุกสิ่งที่คุณเรียนรู้ด้วย AI ส่วนตัวบนอุปกรณ์',
    'Breadcrumb — เส้นทางการเรียนรู้ของคุณ',
  ],
  id: [
    'Simpan sorotan dari halaman web mana pun dan cari semua yang kamu pelajari dengan AI privat di perangkat.',
    'Breadcrumb — perjalanan belajarmu',
  ],
  ms: [
    'Simpan serlahan daripada mana-mana halaman web dan cari semua yang anda pelajari dengan AI peribadi pada peranti.',
    'Breadcrumb — perjalanan pembelajaran anda',
  ],
  fil: [
    'I-save ang mga highlight mula sa anumang web page at hanapin ang lahat ng natututunan mo gamit ang pribadong AI sa device.',
    'Breadcrumb — ang iyong landas sa pagkatuto',
  ],
  sw: [
    'Hifadhi manukuu kutoka ukurasa wowote wa wavuti na utafute kila unachojifunza kwa AI ya faragha kwenye kifaa chako.',
    'Breadcrumb — njia yako ya kujifunza',
  ],
  sv: [
    'Spara markeringar från vilken webbsida som helst och sök i allt du lär dig med privat AI direkt på enheten.',
    'Breadcrumb — din inlärningsresa',
  ],
  da: [
    'Gem fremhævninger fra enhver webside, og søg i alt, hvad du lærer, med privat AI direkte på enheden.',
    'Breadcrumb — din læringsrejse',
  ],
  no: [
    'Lagre uthevinger fra en hvilken som helst nettside, og søk i alt du lærer med privat AI rett på enheten.',
    'Breadcrumb — din læringsreise',
  ],
  fi: [
    'Tallenna korostukset miltä tahansa verkkosivulta ja hae kaikkea oppimaasi yksityisellä tekoälyllä laitteellasi.',
    'Breadcrumb — oppimispolkusi',
  ],
  cs: [
    'Ukládej zvýrazněný text z jakékoli webové stránky a prohledávej vše, co ses naučil, díky soukromé AI v zařízení.',
    'Breadcrumb — tvoje cesta učení',
  ],
  sk: [
    'Ukladaj zvýraznený text z ľubovoľnej webovej stránky a prehľadávaj všetko, čo sa naučíš, so súkromnou AI v zariadení.',
    'Breadcrumb — tvoja cesta učenia',
  ],
  hu: [
    'Ments ki kiemeléseket bármely weboldalról, és keress mindenben, amit tanulsz, az eszközön futó privát MI-vel.',
    'Breadcrumb — a tanulási utad',
  ],
  ro: [
    'Salvează fragmente din orice pagină web și caută tot ce înveți cu o inteligență artificială privată, pe dispozitiv.',
    'Breadcrumb — traseul tău de învățare',
  ],
  bg: [
    'Запазвайте маркиран текст от всяка уеб страница и търсете всичко, което научавате, с личен AI на устройството.',
    'Breadcrumb — вашият път на учене',
  ],
  el: [
    'Αποθήκευσε επισημάνσεις από οποιαδήποτε ιστοσελίδα και αναζήτησε ό,τι μαθαίνεις με ιδιωτική AI στη συσκευή σου.',
    'Breadcrumb — το μονοπάτι μάθησής σου',
  ],
  hr: [
    'Spremi istaknuti tekst s bilo koje web-stranice i pretražuj sve što naučiš uz privatni AI na uređaju.',
    'Breadcrumb — tvoj put učenja',
  ],
  sr: [
    'Сачувајте истакнути текст са било које веб странице и претражујте све што научите уз приватни AI на уређају.',
    'Breadcrumb — ваш пут учења',
  ],
  ca: [
    "Desa fragments de qualsevol pàgina web i cerca tot el que aprens amb una IA privada al teu dispositiu.",
    "Breadcrumb — el teu camí d'aprenentatge",
  ],
};

let count = 0;
let longest = 0;
for (const [locale, [description, actionTitle]] of Object.entries(MESSAGES)) {
  if (description.length > longest) {
    longest = description.length;
  }
  if (description.length > 132) {
    throw new Error(
      `[generate-locales] ${locale} description is ${description.length} chars (>132).`,
    );
  }

  const dir = join(OUT, locale);
  mkdirSync(dir, { recursive: true });
  const body = {
    extDescription: {
      message: description,
      description:
        'Extension description shown in the Chrome Web Store and chrome://extensions.',
    },
    actionTitle: {
      message: actionTitle,
      description: 'Tooltip shown when hovering the toolbar icon.',
    },
  };
  writeFileSync(join(dir, 'messages.json'), `${JSON.stringify(body, null, 2)}\n`);
  count += 1;
}

console.log(
  `[generate-locales] wrote ${count} locales (longest description: ${longest} chars)`,
);
