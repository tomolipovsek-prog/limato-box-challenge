import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const $ = id => document.getElementById(id);
const cfg = window.LBC_SUPABASE || {};
const configured = /^https:\/\//.test(cfg.url || "") && (cfg.key || "").length > 20;
const sb = configured ? createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

const EXTRA = {
  sl:{mode:"Način igre",solo:"Samostojno",online:"🌍 Online soba",onlineHint:"Vsak igralec igra svoj Box hkrati. Najnižji skupni rezultat zmaga.",create:"USTVARI SOBO",join:"VSTOPI",code:"Koda sobe",copy:"KOPIRAJ LINK",leave:"ZAPUSTI SOBO",room:"Soba",waiting:"Čakanje na igralce…",leader:"Online lestvica",playing:"igra",finished:"končal",copied:"Link je kopiran.",missing:"Online igra in skupna statistika potrebujeta enkratno nastavitev Supabase.",notFound:"Sobe s to kodo ni.",joined:"Povezan si v sobo",consent:"Dovoli anonimno statistiko, da lahko izboljšujemo igro: obisk, začetek igre in povratek. Imen, e-pošte in telefonskih številk ne zbiramo.",allow:"DOVOLI",decline:"SAMO IGRA",rate:"Kako ti je všeč LiMATO Box Challenge?",later:"KASNEJE",thanks:"Hvala za oceno!"},
  en:{mode:"Game mode",solo:"Solo",online:"🌍 Online room",onlineHint:"Everyone plays their own Box at the same time. Lowest total score wins.",create:"CREATE ROOM",join:"JOIN",code:"Room code",copy:"COPY LINK",leave:"LEAVE ROOM",room:"Room",waiting:"Waiting for players…",leader:"Online leaderboard",playing:"playing",finished:"finished",copied:"Invite link copied.",missing:"Online play and shared statistics need a one-time Supabase setup.",notFound:"Room not found.",joined:"You joined room",consent:"Allow anonymous statistics to improve the game: visit, match start and return visit. We do not collect names, email addresses or phone numbers.",allow:"ALLOW",decline:"PLAY ONLY",rate:"How do you like LiMATO Box Challenge?",later:"LATER",thanks:"Thanks for rating!"},
  de:{mode:"Spielmodus",solo:"Solo",online:"🌍 Online-Raum",onlineHint:"Alle spielen gleichzeitig ihren eigenen Box. Die niedrigste Gesamtpunktzahl gewinnt.",create:"RAUM ERSTELLEN",join:"BEITRETEN",code:"Raumcode",copy:"LINK KOPIEREN",leave:"RAUM VERLASSEN",room:"Raum",waiting:"Warte auf Spieler…",leader:"Online-Rangliste",playing:"spielt",finished:"fertig",copied:"Einladungslink kopiert.",missing:"Online-Spiel und gemeinsame Statistik benötigen einmalig Supabase.",notFound:"Raum nicht gefunden.",joined:"Du bist im Raum",consent:"Erlaube anonyme Statistik zur Verbesserung des Spiels: Besuch, Spielstart und Rückkehr. Namen, E-Mail oder Telefonnummern werden nicht erfasst.",allow:"ERLAUBEN",decline:"NUR SPIELEN",rate:"Wie gefällt dir LiMATO Box Challenge?",later:"SPÄTER",thanks:"Danke für deine Bewertung!"},
  fr:{mode:"Mode de jeu",solo:"Solo",online:"🌍 Salon en ligne",onlineHint:"Chacun joue son propre Box en même temps. Le score total le plus bas gagne.",create:"CRÉER UN SALON",join:"REJOINDRE",code:"Code du salon",copy:"COPIER LE LIEN",leave:"QUITTER",room:"Salon",waiting:"En attente de joueurs…",leader:"Classement en ligne",playing:"joue",finished:"terminé",copied:"Lien d’invitation copié.",missing:"Le jeu en ligne et les statistiques partagées nécessitent une configuration Supabase unique.",notFound:"Salon introuvable.",joined:"Vous avez rejoint le salon",consent:"Autorisez des statistiques anonymes pour améliorer le jeu : visite, début de partie et retour. Aucun nom, e-mail ou téléphone n’est collecté.",allow:"AUTORISER",decline:"JOUER SEULEMENT",rate:"Que pensez-vous de LiMATO Box Challenge ?",later:"PLUS TARD",thanks:"Merci pour votre note !"},
  it:{mode:"Modalità di gioco",solo:"Solo",online:"🌍 Stanza online",onlineHint:"Tutti giocano il proprio Box contemporaneamente. Vince il punteggio totale più basso.",create:"CREA STANZA",join:"ENTRA",code:"Codice stanza",copy:"COPIA LINK",leave:"ESCI",room:"Stanza",waiting:"In attesa di giocatori…",leader:"Classifica online",playing:"sta giocando",finished:"finito",copied:"Link d’invito copiato.",missing:"Gioco online e statistiche condivise richiedono una configurazione Supabase una tantum.",notFound:"Stanza non trovata.",joined:"Sei entrato nella stanza",consent:"Consenti statistiche anonime per migliorare il gioco: visita, inizio partita e ritorno. Non raccogliamo nomi, e-mail o numeri di telefono.",allow:"CONSENTI",decline:"SOLO GIOCO",rate:"Quanto ti piace LiMATO Box Challenge?",later:"PIÙ TARD",thanks:"Grazie per la valutazione!"},
  es:{mode:"Modo de juego",solo:"Solo",online:"🌍 Sala online",onlineHint:"Cada jugador juega su propio Box al mismo tiempo. Gana la puntuación total más baja.",create:"CREAR SALA",join:"ENTRAR",code:"Código de sala",copy:"COPIAR ENLACE",leave:"SALIR",room:"Sala",waiting:"Esperando jugadores…",leader:"Clasificación online",playing:"jugando",finished:"terminó",copied:"Enlace copiado.",missing:"El juego online y las estadísticas compartidas necesitan una configuración única de Supabase.",notFound:"Sala no encontrada.",joined:"Has entrado en la sala",consent:"Permite estadísticas anónimas para mejorar el juego: visita, inicio de partida y regreso. No recogemos nombres, correos ni teléfonos.",allow:"PERMITIR",decline:"SOLO JUGAR",rate:"¿Qué te parece LiMATO Box Challenge?",later:"MÁS TARDE",thanks:"¡Gracias por tu valoración!"},
  pt:{mode:"Modo de jogo",solo:"Solo",online:"🌍 Sala online",onlineHint:"Cada jogador joga o seu Box ao mesmo tempo. A menor pontuação total vence.",create:"CRIAR SALA",join:"ENTRAR",code:"Código da sala",copy:"COPIAR LINK",leave:"SAIR",room:"Sala",waiting:"À espera de jogadores…",leader:"Classificação online",playing:"a jogar",finished:"terminou",copied:"Link copiado.",missing:"O jogo online e as estatísticas partilhadas precisam de uma configuração única do Supabase.",notFound:"Sala não encontrada.",joined:"Entrou na sala",consent:"Permita estatísticas anónimas para melhorar o jogo: visita, início da partida e regresso. Não recolhemos nomes, e-mails ou telefones.",allow:"PERMITIR",decline:"SÓ JOGAR",rate:"O que acha do LiMATO Box Challenge?",later:"MAIS TARDE",thanks:"Obrigado pela avaliação!"},
  zh:{mode:"游戏模式",solo:"单人",online:"🌍 在线房间",onlineHint:"所有玩家同时玩自己的 Box，总分最低者获胜。",create:"创建房间",join:"加入",code:"房间代码",copy:"复制链接",leave:"离开房间",room:"房间",waiting:"等待玩家…",leader:"在线排行榜",playing:"游戏中",finished:"已完成",copied:"邀请链接已复制。",missing:"在线游戏和共享统计需要一次 Supabase 设置。",notFound:"未找到房间。",joined:"已加入房间",consent:"允许匿名统计以改进游戏：访问、开始比赛和再次访问。我们不收集姓名、邮箱或电话号码。",allow:"允许",decline:"仅游戏",rate:"你喜欢 LiMATO Box Challenge 吗？",later:"稍后",thanks:"感谢评分！"},
  hi:{mode:"खेल मोड",solo:"एकल",online:"🌍 ऑनलाइन कमरा",onlineHint:"हर खिलाड़ी अपना Box एक साथ खेलता है। सबसे कम कुल स्कोर जीतता है।",create:"कमरा बनाएँ",join:"शामिल हों",code:"कमरे का कोड",copy:"लिंक कॉपी करें",leave:"कमरा छोड़ें",room:"कमरा",waiting:"खिलाड़ियों की प्रतीक्षा…",leader:"ऑनलाइन तालिका",playing:"खेल रहा है",finished:"समाप्त",copied:"आमंत्रण लिंक कॉपी हुआ।",missing:"ऑनलाइन खेल और साझा आँकड़ों के लिए एक बार Supabase सेटअप चाहिए।",notFound:"कमरा नहीं मिला।",joined:"आप कमरे में शामिल हुए",consent:"खेल सुधारने के लिए गुमनाम आँकड़ों की अनुमति दें: विज़िट, मैच शुरू और वापसी। हम नाम, ईमेल या फोन नहीं लेते।",allow:"अनुमति दें",decline:"सिर्फ खेलें",rate:"LiMATO Box Challenge कैसा लगा?",later:"बाद में",thanks:"रेटिंग के लिए धन्यवाद!"},
  ja:{mode:"ゲームモード",solo:"ソロ",online:"🌍 オンラインルーム",onlineHint:"全員が同時に自分のBoxをプレイ。合計スコアが最も低い人が勝ち。",create:"ルーム作成",join:"参加",code:"ルームコード",copy:"リンクをコピー",leave:"退出",room:"ルーム",waiting:"プレイヤー待機中…",leader:"オンライン順位",playing:"プレイ中",finished:"終了",copied:"招待リンクをコピーしました。",missing:"オンライン対戦と共有統計にはSupabaseの初回設定が必要です。",notFound:"ルームが見つかりません。",joined:"ルームに参加しました",consent:"ゲーム改善のため匿名統計を許可：訪問、試合開始、再訪。氏名・メール・電話番号は収集しません。",allow:"許可",decline:"ゲームのみ",rate:"LiMATO Box Challengeはいかがですか？",later:"後で",thanks:"評価ありがとうございます！"},
  ru:{mode:"Режим игры",solo:"Один",online:"🌍 Онлайн-комната",onlineHint:"Все одновременно играют свой Box. Побеждает самый низкий общий счёт.",create:"СОЗДАТЬ КОМНАТУ",join:"ВОЙТИ",code:"Код комнаты",copy:"КОПИРОВАТЬ ССЫЛКУ",leave:"ВЫЙТИ",room:"Комната",waiting:"Ожидание игроков…",leader:"Онлайн-рейтинг",playing:"играет",finished:"закончил",copied:"Ссылка скопирована.",missing:"Для онлайн-игры и общей статистики нужна однократная настройка Supabase.",notFound:"Комната не найдена.",joined:"Вы вошли в комнату",consent:"Разрешить анонимную статистику для улучшения игры: посещение, старт матча и возврат. Имена, e-mail и телефоны не собираются.",allow:"РАЗРЕШИТЬ",decline:"ТОЛЬКО ИГРА",rate:"Как вам LiMATO Box Challenge?",later:"ПОЗЖЕ",thanks:"Спасибо за оценку!"},
  hr:{mode:"Način igre",solo:"Samostalno",online:"🌍 Online soba",onlineHint:"Svaki igrač igra svoj Box istovremeno. Najniži ukupni rezultat pobjeđuje.",create:"KREIRAJ SOBU",join:"PRIDRUŽI SE",code:"Kod sobe",copy:"KOPIRAJ LINK",leave:"NAPUSTI SOBU",room:"Soba",waiting:"Čekanje igrača…",leader:"Online ljestvica",playing:"igra",finished:"završio",copied:"Pozivni link je kopiran.",missing:"Online igra i zajednička statistika zahtijevaju jednokratno Supabase podešavanje.",notFound:"Soba nije pronađena.",joined:"Pridružio si se sobi",consent:"Dopusti anonimnu statistiku za poboljšanje igre: posjet, početak meča i povratak. Ne prikupljamo imena, e-poštu ni telefone.",allow:"DOPUSTI",decline:"SAMO IGRA",rate:"Kako ti se sviđa LiMATO Box Challenge?",later:"KASNIJE",thanks:"Hvala na ocjeni!"},
  sr:{mode:"Način igre",solo:"Samostalno",online:"🌍 Online soba",onlineHint:"Svaki igrač igra svoj Box istovremeno. Najniži ukupan rezultat pobeđuje.",create:"NAPRAVI SOBU",join:"PRIDRUŽI SE",code:"Kod sobe",copy:"KOPIRAJ LINK",leave:"NAPUSTI SOBU",room:"Soba",waiting:"Čekanje igrača…",leader:"Online tabela",playing:"igra",finished:"završio",copied:"Pozivni link je kopiran.",missing:"Online igra i zajednička statistika zahtevaju jednokratno Supabase podešavanje.",notFound:"Soba nije pronađena.",joined:"Pridružio si se sobi",consent:"Dozvoli anonimnu statistiku za poboljšanje igre: poseta, početak meča i povratak. Ne prikupljamo imena, e-poštu ni telefone.",allow:"DOZVOLI",decline:"SAMO IGRA",rate:"Kako ti se sviđa LiMATO Box Challenge?",later:"KASNIJE",thanks:"Hvala na oceni!"},
  sq:{mode:"Mënyra e lojës",solo:"Vetëm",online:"🌍 Dhomë online",onlineHint:"Secili luan Box-in e vet njëkohësisht. Fiton rezultati total më i ulët.",create:"KRIJO DHOMË",join:"HYR",code:"Kodi i dhomës",copy:"KOPJO LINKUN",leave:"DIL",room:"Dhoma",waiting:"Duke pritur lojtarët…",leader:"Renditja online",playing:"duke luajtur",finished:"përfundoi",copied:"Linku u kopjua.",missing:"Loja online dhe statistikat kërkojnë një konfigurim të vetëm Supabase.",notFound:"Dhoma nuk u gjet.",joined:"U bashkove në dhomë",consent:"Lejo statistika anonime për të përmirësuar lojën: vizita, nisja e ndeshjes dhe rikthimi. Nuk mbledhim emra, email ose telefona.",allow:"LEJO",decline:"VETËM LOJË",rate:"Si të duket LiMATO Box Challenge?",later:"MË VONË",thanks:"Faleminderit për vlerësimin!"},
  el:{mode:"Τρόπος παιχνιδιού",solo:"Μόνος",online:"🌍 Online δωμάτιο",onlineHint:"Όλοι παίζουν το δικό τους Box ταυτόχρονα. Κερδίζει το χαμηλότερο συνολικό σκορ.",create:"ΔΗΜΙΟΥΡΓΙΑ",join:"ΕΙΣΟΔΟΣ",code:"Κωδικός δωματίου",copy:"ΑΝΤΙΓΡΑΦΗ LINK",leave:"ΕΞΟΔΟΣ",room:"Δωμάτιο",waiting:"Αναμονή παικτών…",leader:"Online κατάταξη",playing:"παίζει",finished:"τελείωσε",copied:"Το link αντιγράφηκε.",missing:"Το online παιχνίδι και τα κοινά στατιστικά χρειάζονται μία αρχική ρύθμιση Supabase.",notFound:"Το δωμάτιο δεν βρέθηκε.",joined:"Μπήκες στο δωμάτιο",consent:"Επίτρεψε ανώνυμα στατιστικά για βελτίωση του παιχνιδιού: επίσκεψη, έναρξη αγώνα και επιστροφή. Δεν συλλέγουμε ονόματα, email ή τηλέφωνα.",allow:"ΕΠΙΤΡΕΠΩ",decline:"ΜΟΝΟ ΠΑΙΧΝΙΔΙ",rate:"Πώς σου φαίνεται το LiMATO Box Challenge;",later:"ΑΡΓΟΤΕΡΑ",thanks:"Ευχαριστούμε για τη βαθμολογία!"},
  he:{mode:"מצב משחק",solo:"יחיד",online:"🌍 חדר אונליין",onlineHint:"כולם משחקים את ה-Box שלהם בו-זמנית. התוצאה הכוללת הנמוכה מנצחת.",create:"צור חדר",join:"הצטרף",code:"קוד חדר",copy:"העתק קישור",leave:"עזוב חדר",room:"חדר",waiting:"ממתינים לשחקנים…",leader:"טבלת אונליין",playing:"משחק",finished:"סיים",copied:"קישור ההזמנה הועתק.",missing:"משחק אונליין וסטטיסטיקה משותפת דורשים הגדרת Supabase חד-פעמית.",notFound:"החדר לא נמצא.",joined:"הצטרפת לחדר",consent:"אפשר סטטיסטיקה אנונימית לשיפור המשחק: ביקור, התחלת משחק וחזרה. איננו אוספים שמות, אימייל או טלפון.",allow:"אישור",decline:"רק משחק",rate:"איך LiMATO Box Challenge בעיניך?",later:"אחר כך",thanks:"תודה על הדירוג!"},
  ar:{mode:"وضع اللعب",solo:"فردي",online:"🌍 غرفة أونلاين",onlineHint:"كل لاعب يلعب Box الخاص به في الوقت نفسه. أقل مجموع يفوز.",create:"إنشاء غرفة",join:"انضمام",code:"رمز الغرفة",copy:"نسخ الرابط",leave:"مغادرة",room:"الغرفة",waiting:"بانتظار اللاعبين…",leader:"الترتيب أونلاين",playing:"يلعب",finished:"أنهى",copied:"تم نسخ رابط الدعوة.",missing:"اللعب أونلاين والإحصاءات المشتركة يحتاجان إعداد Supabase مرة واحدة.",notFound:"الغرفة غير موجودة.",joined:"انضممت إلى الغرفة",consent:"اسمح بإحصاءات مجهولة لتحسين اللعبة: الزيارة وبدء المباراة والعودة. لا نجمع الأسماء أو البريد أو أرقام الهاتف.",allow:"سماح",decline:"اللعب فقط",rate:"ما رأيك في LiMATO Box Challenge؟",later:"لاحقاً",thanks:"شكراً على التقييم!"},
  sw:{mode:"Hali ya mchezo",solo:"Peke yako",online:"🌍 Chumba mtandaoni",onlineHint:"Kila mchezaji hucheza Box yake kwa wakati mmoja. Alama ya chini zaidi hushinda.",create:"UNDA CHUMBA",join:"JIUNGE",code:"Msimbo wa chumba",copy:"NAKILI KIUNGO",leave:"ONDOKA",room:"Chumba",waiting:"Inasubiri wachezaji…",leader:"Jedwali la mtandaoni",playing:"anacheza",finished:"amemaliza",copied:"Kiungo kimenakiliwa.",missing:"Mchezo wa mtandaoni na takwimu zinahitaji usanidi wa Supabase mara moja.",notFound:"Chumba hakikupatikana.",joined:"Umejiunga na chumba",consent:"Ruhusu takwimu zisizo na utambulisho kuboresha mchezo: ziara, kuanza mechi na kurudi. Hatukusanyi majina, barua pepe au simu.",allow:"RUHUSU",decline:"CHEZA TU",rate:"Unaionaje LiMATO Box Challenge?",later:"BAADAYE",thanks:"Asante kwa tathmini!"},
  ko:{mode:"게임 모드",solo:"혼자",online:"🌍 온라인 방",onlineHint:"모두가 동시에 자신의 Box를 플레이합니다. 총점이 가장 낮은 사람이 승리합니다.",create:"방 만들기",join:"입장",code:"방 코드",copy:"링크 복사",leave:"나가기",room:"방",waiting:"플레이어 대기 중…",leader:"온라인 순위",playing:"플레이 중",finished:"완료",copied:"초대 링크를 복사했습니다.",missing:"온라인 게임과 공동 통계는 Supabase 1회 설정이 필요합니다.",notFound:"방을 찾을 수 없습니다.",joined:"방에 입장했습니다",consent:"게임 개선을 위한 익명 통계를 허용합니다: 방문, 경기 시작, 재방문. 이름, 이메일, 전화번호는 수집하지 않습니다.",allow:"허용",decline:"게임만",rate:"LiMATO Box Challenge가 어떠신가요?",later:"나중에",thanks:"평가해 주셔서 감사합니다!"},
  tr:{mode:"Oyun modu",solo:"Tek oyuncu",online:"🌍 Online oda",onlineHint:"Herkes aynı anda kendi Box'ını oynar. En düşük toplam skor kazanır.",create:"ODA OLUŞTUR",join:"KATIL",code:"Oda kodu",copy:"LİNKİ KOPYALA",leave:"ODADAN ÇIK",room:"Oda",waiting:"Oyuncular bekleniyor…",leader:"Online sıralama",playing:"oynuyor",finished:"bitirdi",copied:"Davet linki kopyalandı.",missing:"Online oyun ve ortak istatistik için bir kez Supabase kurulumu gerekir.",notFound:"Oda bulunamadı.",joined:"Odaya katıldın",consent:"Oyunu geliştirmek için anonim istatistiklere izin ver: ziyaret, maç başlangıcı ve geri dönüş. İsim, e-posta veya telefon toplamıyoruz.",allow:"İZİN VER",decline:"SADECE OYNA",rate:"LiMATO Box Challenge'ı nasıl buldun?",later:"SONRA",thanks:"Puanın için teşekkürler!"},
  id:{mode:"Mode permainan",solo:"Solo",online:"🌍 Ruang online",onlineHint:"Semua pemain memainkan Box masing-masing bersamaan. Skor total terendah menang.",create:"BUAT RUANG",join:"GABUNG",code:"Kode ruang",copy:"SALIN TAUTAN",leave:"KELUAR",room:"Ruang",waiting:"Menunggu pemain…",leader:"Peringkat online",playing:"bermain",finished:"selesai",copied:"Tautan undangan disalin.",missing:"Game online dan statistik bersama memerlukan satu kali pengaturan Supabase.",notFound:"Ruang tidak ditemukan.",joined:"Kamu bergabung ke ruang",consent:"Izinkan statistik anonim untuk meningkatkan game: kunjungan, mulai pertandingan, dan kembali. Kami tidak mengumpulkan nama, email, atau nomor telepon.",allow:"IZINKAN",decline:"MAIN SAJA",rate:"Bagaimana LiMATO Box Challenge menurutmu?",later:"NANTI",thanks:"Terima kasih atas penilaiannya!"},
  th:{mode:"โหมดเกม",solo:"เล่นคนเดียว",online:"🌍 ห้องออนไลน์",onlineHint:"ทุกคนเล่น Box ของตนพร้อมกัน คะแนนรวมต่ำสุดชนะ",create:"สร้างห้อง",join:"เข้าร่วม",code:"รหัสห้อง",copy:"คัดลอกลิงก์",leave:"ออกจากห้อง",room:"ห้อง",waiting:"กำลังรอผู้เล่น…",leader:"อันดับออนไลน์",playing:"กำลังเล่น",finished:"จบแล้ว",copied:"คัดลอกลิงก์เชิญแล้ว",missing:"เกมออนไลน์และสถิติรวมต้องตั้งค่า Supabase หนึ่งครั้ง",notFound:"ไม่พบห้อง",joined:"เข้าร่วมห้องแล้ว",consent:"อนุญาตสถิติแบบไม่ระบุตัวตนเพื่อพัฒนาเกม: การเข้าเล่น เริ่มแมตช์ และกลับมาเล่น เราไม่เก็บชื่อ อีเมล หรือโทรศัพท์",allow:"อนุญาต",decline:"เล่นอย่างเดียว",rate:"คุณชอบ LiMATO Box Challenge แค่ไหน?",later:"ไว้ทีหลัง",thanks:"ขอบคุณสำหรับคะแนน!"},
  vi:{mode:"Chế độ chơi",solo:"Một mình",online:"🌍 Phòng online",onlineHint:"Mỗi người chơi Box của mình cùng lúc. Tổng điểm thấp nhất thắng.",create:"TẠO PHÒNG",join:"THAM GIA",code:"Mã phòng",copy:"SAO CHÉP LINK",leave:"RỜI PHÒNG",room:"Phòng",waiting:"Đang chờ người chơi…",leader:"Bảng xếp hạng online",playing:"đang chơi",finished:"đã xong",copied:"Đã sao chép link mời.",missing:"Chơi online và thống kê chung cần thiết lập Supabase một lần.",notFound:"Không tìm thấy phòng.",joined:"Bạn đã vào phòng",consent:"Cho phép thống kê ẩn danh để cải thiện trò chơi: lượt truy cập, bắt đầu trận và quay lại. Chúng tôi không thu thập tên, email hay số điện thoại.",allow:"CHO PHÉP",decline:"CHỈ CHƠI",rate:"Bạn thấy LiMATO Box Challenge thế nào?",later:"ĐỂ SAU",thanks:"Cảm ơn bạn đã đánh giá!"},
  pl:{mode:"Tryb gry",solo:"Solo",online:"🌍 Pokój online",onlineHint:"Każdy gra swój Box jednocześnie. Wygrywa najniższy wynik łączny.",create:"UTWÓRZ POKÓJ",join:"DOŁĄCZ",code:"Kod pokoju",copy:"KOPIUJ LINK",leave:"OPUŚĆ POKÓJ",room:"Pokój",waiting:"Oczekiwanie na graczy…",leader:"Ranking online",playing:"gra",finished:"ukończył",copied:"Link zaproszenia skopiowany.",missing:"Gra online i wspólne statystyki wymagają jednorazowej konfiguracji Supabase.",notFound:"Nie znaleziono pokoju.",joined:"Dołączyłeś do pokoju",consent:"Zezwól na anonimowe statystyki, aby ulepszać grę: wizyta, start meczu i powrót. Nie zbieramy nazwisk, e-maili ani telefonów.",allow:"ZEZWÓL",decline:"TYLKO GRA",rate:"Jak podoba Ci się LiMATO Box Challenge?",later:"PÓŹNIEJ",thanks:"Dziękujemy za ocenę!"}
};
const tx = k => (EXTRA[$("lang")?.value] || EXTRA.en)[k] || EXTRA.en[k] || k;

let room = { code:null, userId:null, channel:null };
let source = (() => {
  const u = new URL(location.href);
  const utm = u.searchParams.get("utm_source");
  if (utm) return utm.slice(0,40);
  try { return document.referrer ? new URL(document.referrer).hostname.slice(0,40) : "direct"; } catch { return "direct"; }
})();

async function ensureAuth(){
  if(!sb) throw new Error("backend_not_configured");
  const {data:{session}} = await sb.auth.getSession();
  if(session?.user?.id) return session.user.id;
  const {data,error} = await sb.auth.signInAnonymously();
  if(error) throw error;
  return data.user.id;
}

async function insertEvent(event,payload={}){
  if(!sb || localStorage.getItem("lbc-analytics-consent")!=="yes") return;
  try{
    const uid=await ensureAuth();
    await sb.from("lbc_events").insert({
      owner_id:uid,event_type:event,source,
      box_number:payload.box||null,rounds:payload.rounds||null,total_score:payload.total??null,
      language:payload.language||$("lang")?.value||"en",room_code:room.code||null
    });
  }catch(e){console.warn("LiMATO stats:",e.message)}
}

async function trackVisit(){
  if(!sb || localStorage.getItem("lbc-analytics-consent")!=="yes") return;
  const today=new Date().toISOString().slice(0,10);
  if(localStorage.getItem("lbc-last-visit-date")===today) return;
  localStorage.setItem("lbc-last-visit-date",today);
  await insertEvent("visit");
}

function status(text,kind=""){
  const el=$("onlineStatus"); if(!el)return;
  el.textContent=text; el.className="onlineStatus "+kind;
}

function inviteUrl(code){
  const u=new URL(location.href); u.search=""; u.searchParams.set("room",code);u.searchParams.set("utm_source","invite");return u.toString();
}

function randomCode(){
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({length:6},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

async function joinPlayer(code){
  const uid=await ensureAuth();
  const nickname=($("name").value.trim()||"Player").slice(0,24);
  const {error}=await sb.from("lbc_room_players").upsert({room_code:code,owner_id:uid,nickname,last_seen:new Date().toISOString()},{onConflict:"room_code,owner_id"});
  if(error) throw error;
  room.code=code;room.userId=uid;
  $("roomCode").value=code; $("roomBadge").textContent=`${tx("room")}: ${code}`; $("roomBadge").hidden=false;
  $("copyRoom").hidden=false;$("leaveRoom").hidden=false;
  $("mode").disabled=true;$("rounds").disabled=true;
  $("start").disabled=false;
  await subscribeRoom(); await refreshLeaderboard();
  status(`${tx("joined")} ${code}.`,"ok");
}

async function createRoom(){
  if(!configured){status(tx("missing"),"warn");return}
  try{
    const uid=await ensureAuth();
    let code=null;
    for(let i=0;i<5;i++){
      const c=randomCode();
      const {error}=await sb.from("lbc_rooms").insert({code:c,host_id:uid,max_number:+$("mode").value,rounds:+$("rounds").value,status:"open"});
      if(!error){code=c;break}
      if(error.code!=="23505") throw error;
    }
    if(!code) throw new Error("room_code_failed");
    await joinPlayer(code);
  }catch(e){status(e.message,"bad")}
}

async function joinRoom(){
  if(!configured){status(tx("missing"),"warn");return}
  const code=$("roomCode").value.trim().toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  if(!code)return;
  try{
    const {data,error}=await sb.from("lbc_rooms").select("code,max_number,rounds,status").eq("code",code).maybeSingle();
    if(error) throw error;
    if(!data){status(tx("notFound"),"bad");return}
    $("mode").value=String(data.max_number);$("rounds").value=String(data.rounds);
    await joinPlayer(code);
  }catch(e){status(e.message,"bad")}
}

async function refreshLeaderboard(){
  const box=$("onlineLeaderboard"); if(!sb||!room.code||!box)return;
  const {data,error}=await sb.from("lbc_room_players").select("owner_id,nickname,progress_round,total_score,finished,updated_at").eq("room_code",room.code).order("created_at",{ascending:true});
  if(error){console.warn(error);return}
  box.hidden=false;
  const rows=(data||[]).map(p=>{
    const me=p.owner_id===room.userId?" me":"";
    const state=p.finished?`${tx("finished")} · ${p.total_score}`:`${tx("playing")} · ${p.progress_round||0}/${+$("rounds").value}`;
    return `<div class="onlinePlayer${me}"><span>${escapeHtml(p.nickname||"Player")}</span><b>${state}</b></div>`;
  }).join("");
  box.innerHTML=`<h3>🌍 ${tx("leader")}</h3>${rows||`<small>${tx("waiting")}</small>`}`;
}

function escapeHtml(v){return String(v).replace(/[&<>\'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\'":"&#39;",'"':"&quot;"}[c]))}

async function subscribeRoom(){
  if(room.channel){await sb.removeChannel(room.channel);room.channel=null}
  room.channel=sb.channel(`lbc-room-${room.code}`).on("postgres_changes",{event:"*",schema:"public",table:"lbc_room_players",filter:`room_code=eq.${room.code}`},()=>refreshLeaderboard()).subscribe();
}

async function updatePlayer(patch){
  if(!sb||!room.code||!room.userId)return;
  try{await sb.from("lbc_room_players").update({...patch,last_seen:new Date().toISOString()}).eq("room_code",room.code).eq("owner_id",room.userId)}catch(e){console.warn(e)}
}

async function leaveRoom(){
  if(room.channel&&sb){await sb.removeChannel(room.channel)}
  room={code:null,userId:null,channel:null};
  $("roomBadge").hidden=true;$("copyRoom").hidden=true;$("leaveRoom").hidden=true;$("onlineLeaderboard").hidden=true;
  $("mode").disabled=false;$("rounds").disabled=false;
  if($("playMode").value==="online") $("start").disabled=true;
  status("");
}

function showRating(){
  if(!configured || localStorage.getItem("lbc-rated-v1")==="yes" || $("ratingOverlay"))return;
  const o=document.createElement("div");o.id="ratingOverlay";o.className="ratingOverlay";
  o.innerHTML=`<div class="ratingCard"><h2>⭐ ${tx("rate")}</h2><div class="stars">${[1,2,3,4,5].map(n=>`<button class="starBtn" data-rate="${n}" aria-label="${n}">★</button>`).join("")}</div><button id="ratingLater" class="ratingLater">${tx("later")}</button><p id="ratingMsg"></p></div>`;
  document.body.appendChild(o);
  o.querySelectorAll(".starBtn").forEach(b=>b.onclick=async()=>{
    const rating=+b.dataset.rate;o.querySelectorAll(".starBtn").forEach(x=>x.classList.toggle("active",+x.dataset.rate<=rating));
    try{const uid=await ensureAuth();await sb.from("lbc_ratings").insert({owner_id:uid,rating,language:$("lang").value,source});localStorage.setItem("lbc-rated-v1","yes");$("ratingMsg").textContent=tx("thanks");setTimeout(()=>o.remove(),900)}catch(e){$("ratingMsg").textContent=e.message}
  });
  $("ratingLater").onclick=()=>o.remove();
}

function matchCompleted(){
  const n=(+localStorage.getItem("lbc-completed-games")||0)+1;localStorage.setItem("lbc-completed-games",String(n));
  if(n>=3 && localStorage.getItem("lbc-rated-v1")!=="yes")setTimeout(showRating,1000);
}

function showConsent(){
  if(!configured || localStorage.getItem("lbc-analytics-consent"))return;
  const c=document.createElement("div");c.id="consentBar";c.className="consentBar";
  c.innerHTML=`<p id="consentText"></p><div class="consentActions"><button id="consentYes" class="primary"></button><button id="consentNo"></button></div>`;
  document.body.appendChild(c);translateExtras();
  $("consentYes").onclick=async()=>{localStorage.setItem("lbc-analytics-consent","yes");c.remove();await trackVisit()};
  $("consentNo").onclick=()=>{localStorage.setItem("lbc-analytics-consent","no");c.remove()};
}

function mount(){
  const setup=document.querySelector(".setup"),start=$("start");
  const label=document.createElement("label");label.id="playModeWrap";label.innerHTML=`<span id="playModeLabel"></span><select id="playMode"><option value="solo"></option><option value="online"></option></select>`;
  setup.insertBefore(label,start);
  $("extrasMount").innerHTML=`<section id="onlinePanel" class="onlinePanel" hidden><div class="onlineTop"><input id="roomCode" maxlength="6" autocomplete="off" autocapitalize="characters"><button id="createRoom" class="primary"></button><button id="joinRoom"></button><span id="roomBadge" class="roomCodeBadge" hidden></span><button id="copyRoom" hidden></button><button id="leaveRoom" class="danger" hidden></button></div><p id="onlineHint" class="onlineHint"></p><p id="onlineStatus" class="onlineStatus"></p></section>`;
  $("playMode").onchange=()=>{const online=$("playMode").value==="online";$("onlinePanel").hidden=!online;if(!document.getElementById("name").disabled)$("start").disabled=online&&!room.code;if(online&&!configured)status(tx("missing"),"warn")};
  $("createRoom").onclick=createRoom;$("joinRoom").onclick=joinRoom;$("copyRoom").onclick=async()=>{const link=inviteUrl(room.code);try{await navigator.clipboard.writeText(link);status(tx("copied"),"ok")}catch{prompt("Link",link)}};$("leaveRoom").onclick=leaveRoom;
  const invited=new URL(location.href).searchParams.get("room");if(invited){$("playMode").value="online";$("onlinePanel").hidden=false;$("roomCode").value=invited.toUpperCase().slice(0,6);$("start").disabled=true}
  translateExtras();showConsent();if(localStorage.getItem("lbc-analytics-consent")==="yes")trackVisit();
}

function translateExtras(){
  if(!$("playMode"))return;
  $("playModeLabel").textContent=tx("mode");$("playMode").options[0].textContent=tx("solo");$("playMode").options[1].textContent=tx("online");
  $("roomCode").placeholder=tx("code");$("createRoom").textContent=tx("create");$("joinRoom").textContent=tx("join");$("copyRoom").textContent=tx("copy");$("leaveRoom").textContent=tx("leave");$("onlineHint").textContent=tx("onlineHint");
  if($("consentText")){ $("consentText").textContent=tx("consent");$("consentYes").textContent=tx("allow");$("consentNo").textContent=tx("decline") }
  if(room.code)refreshLeaderboard();
}

window.LBCBackend={
  track:insertEvent,
  translateExtras,
  online:{
    matchStarted:()=>updatePlayer({progress_round:1,partial_score:0,total_score:null,finished:false,started_at:new Date().toISOString()}),
    progress:p=>updatePlayer({progress_round:p.round,partial_score:p.total}),
    matchFinished:p=>{updatePlayer({progress_round:p.rounds||+$("rounds").value,partial_score:p.total,total_score:p.total,finished:true,finished_at:new Date().toISOString()});if(room.code){$("mode").disabled=true;$("rounds").disabled=true}matchCompleted()}
  }
};

mount();
