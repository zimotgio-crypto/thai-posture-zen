import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type AdminLang = "de" | "th";

const STORAGE_KEY = "admin-lang";

/**
 * Admin-Übersetzungen. Wichtig:
 * - Für Korrekturen einfach die Strings in `admin.th` anpassen.
 * - Deutsche Fachbegriffe im Behandlungsprotokoll/PDF bleiben IMMER auf Deutsch
 *   und werden dort direkt aus TENSION_ZONES/MOBILITY_ZONES importiert.
 */
export const adminTranslations = {
  de: {
    common: {
      cancel: "Abbrechen",
      save: "Speichern",
      delete: "Löschen",
      close: "Schliessen",
      loading: "Lade…",
      error: "Fehler",
      yes: "Ja",
      no: "Nein",
      back: "Zurück",
      next: "Weiter",
      today: "Heute",
      optional: "optional",
    },
    shell: {
      brand: "Thai Posture Lab",
      subtitle: "Studio-Admin",
      title: "Studio-Admin — Thai Posture Lab",
      calendar: "Kalender",
      clients: "Kunden",
      addBooking: "Termin",
      signOut: "Abmelden",
      noAdminYet: "Es ist noch kein Admin eingerichtet. Beanspruche jetzt den Zugang für dieses Konto.",
      claim: "Admin-Zugang beanspruchen",
      noAccess: "Dieses Konto hat keinen Admin-Zugang.",
      claimExists: "Es existiert bereits ein Admin-Konto.",
      welcome: "Willkommen. Du bist jetzt Studio-Admin.",
    },
    calendar: {
      dayView: "Tag",
      weekView: "Woche",
      connected: "Google Calendar verbunden",
      notConnected: "Google Calendar nicht konfiguriert",
      diagnoseDate: "Diagnose-Datum",
      diagnose: "Google-Diagnose",
      diagnoseChecking: "Prüfe…",
      showJson: "JSON anzeigen",
      hideJson: "JSON ausblenden",
      diagnoseFailed: "Google-Diagnose fehlgeschlagen",
      loadingError: "Fehler beim Laden",
      blocked: "Blockiert",
      privateBusy: "Privat – belegt",
      legendBooking: "Buchung",
      legendPrivate: "Privater Google-Termin",
      legendBlocked: "Manuell blockiert",
      details: "Termin",
      blockedTitle: "Blockierte Zeit",
      duration: "Dauer",
      treatment: "Behandlung",
      price: "Preis",
      client: "Kunde",
      phone: "Telefon",
      email: "E-Mail",
      address: "Adresse",
      silent: "Silent Treatment",
      source: "Quelle",
      notes: "Notizen",
      goToClient: "Zum Kundenprofil",
      deleteBooking: "Termin löschen",
      confirmDelete: "Termin wirklich löschen?",
      deleted: "Gelöscht",
      sourceOnline: "Online-Buchung",
      sourceManual: "Manuell",
      sourceBlock: "Blockiert",
    },
    clients: {
      title: "Kunden",
      searchPlaceholder: "Suchen: Vor-, Nachname, E-Mail, Telefon…",
      add: "Kunde",
      empty: "Keine Kunden gefunden.",
      colName: "Name",
      colEmail: "E-Mail",
      colPhone: "Telefon",
      colStreet: "Strasse / Nr.",
      colZip: "PLZ",
      colCity: "Ort",
      openProfile: "Profil öffnen",
      openProfileOf: (name: string) => `Profil von ${name} öffnen`,
    },
    profile: {
      eyebrow: "Kundenprofil",
      nextBooking: "Nächster Termin",
      editContact: "Stammdaten bearbeiten",
      firstName: "Vorname",
      lastName: "Nachname",
      email: "E-Mail",
      phone: "Telefon",
      street: "Strasse / Nr.",
      zip: "PLZ",
      city: "Ort",
      tabHistory: "Verlauf",
      tabNew: "Neuer Eintrag",
      showPainTrend: "Schmerzverlauf anzeigen",
      loadingHistory: "Lade Verlauf…",
      emptyHistory: "Noch keine Einträge im Massagetagebuch.",
      manualNote: "Manuelle Notiz",
      diary: "Massagetagebuch",
      newEntry: "Neuer Eintrag",
      linkBooking: "Termin verknüpfen (optional)",
      noneOption: "— keiner —",
      notePlaceholder: "z.B. Verhärtung im oberen Trapezmuskel gelöst, Haltung leicht verbessert…",
      tensionTitle: "Spannung & Schmerz",
      tensionHint: "Bewerte jede Zone von 1 (frei) bis 10 (schmerzhaft).",
      tensionLeft: "1 (Frei / Unauffällig)",
      tensionRight: "10 (Schmerzhaft / Verspannt)",
      mobilityTitle: "Beweglichkeit & Gelenke",
      mobilityHint: "Bewertung des Bewegungsausmasses pro Region.",
      mobilityLeft: "1 (Voll beweglich / Frei)",
      mobilityRight: "10 (Stark eingeschränkt / Blockiert)",
      bodyMap: "Körperkartierung",
      bodyMapHint: "Klicken Sie auf die Körperumrisse, um Schmerz- oder Problemstellen zu markieren.",
      saveNote: "Notiz speichern",
      noteSaved: "Notiz gespeichert",
      noteEmpty: "Notiz darf nicht leer sein.",
      profileUpdated: "Kundendaten aktualisiert",
      clientDeleted: "Kunde gelöscht",
      dangerTitle: "Kunde löschen",
      dangerDesc: "Entfernt diesen Kunden inklusive aller Termine und Massagetagebuch-Einträge unwiderruflich.",
      confirmTitle: "Kunde wirklich löschen?",
      confirmDesc: "Möchtest du diesen Kunden wirklich unwiderruflich löschen? Alle zugehörigen Termine und Massagetagebuch-Einträge werden ebenfalls gelöscht.",
      confirmFinal: "Endgültig löschen",
      printPdf: "Als PDF drucken",
      maxTension: "Max. Spannung",
    },
    addBooking: {
      title: "Termin hinzufügen",
      description: "Manuell erfassen (Telefon oder Walk-in) oder eine Zeit blockieren.",
      block: "Zeit blockieren (kein Kunde)",
      date: "Datum",
      time: "Uhrzeit",
      durationPrice: "Dauer · Preis",
      treatment: "Behandlung",
      firstName: "Vorname *",
      lastName: "Nachname *",
      email: "E-Mail *",
      phone: "Telefon *",
      street: "Strasse / Nr. *",
      zip: "PLZ *",
      city: "Ort *",
      silent: "Silent Treatment",
      blockSaved: "Zeit blockiert",
      bookingSaved: "Termin gespeichert",
    },
    addClient: {
      title: "Neuen Kunden anlegen",
      description: "Erfasse einen neuen Kunden für die Kundendatenbank.",
      created: "Kunde angelegt",
    },
    painTrend: {
      title: "Schmerzverlauf",
      rangeAll: "Alle Termine",
      range3m: "Letzte 3 Monate",
      range6m: "Letzte 6 Monate",
      monthly: "Monats-Durchschnitt anzeigen",
      empty: "Keine Daten im gewählten Zeitraum.",
      groupTotal: "Gesamt",
      groupTension: "Spannung & Schmerz",
      groupMobility: "Beweglichkeit & Gelenke",
      aggregateLabel: "Max. Spannung (Gesamt)",
      treatmentsSingular: "Behandlung",
      treatmentsPlural: "Behandlungen",
    },
    tensionZones: {
      kopf: "Kopf",
      nacken: "Nacken",
      schulterblatt: "Schulterblatt",
      arme: "Arme",
      haende: "Hände",
      oberschenkel: "Oberschenkel",
      fuesse: "Füsse",
      waden: "Waden",
      gesaess: "Gesäss",
      obererRuecken: "Oberer Rücken",
      untererRuecken: "Unterer Rücken",
      brust: "Brust",
      bauch: "Bauch",
      faszienAllgemein: "Faszien (Allgemein)",
    },
    mobilityZones: {
      halswirbelsaeule: "Halswirbelsäule & Nackendrehung",
      schultergurtel: "Schultergürtel (Überkopf & Rotation)",
      brustwirbelsaeule: "Brustwirbelsäule & Aufrichtung",
      lendenwirbelsaeule: "Lendenwirbelsäule & Rumpfbeugung",
      hueftoeffnung: "Hüftöffnung & Adduktoren",
    },
    weekdays: { locale: "de-CH" as const },
  },
  th: {
    common: {
      cancel: "ยกเลิก",
      save: "บันทึก",
      delete: "ลบ",
      close: "ปิด",
      loading: "กำลังโหลด…",
      error: "เกิดข้อผิดพลาด",
      yes: "ใช่",
      no: "ไม่",
      back: "ก่อนหน้า",
      next: "ถัดไป",
      today: "วันนี้",
      optional: "ไม่บังคับ",
    },
    shell: {
      brand: "Thai Posture Lab",
      subtitle: "ระบบผู้ดูแล",
      title: "ระบบผู้ดูแล — Thai Posture Lab",
      calendar: "ปฏิทิน",
      clients: "ลูกค้า",
      addBooking: "นัดหมาย",
      signOut: "ออกจากระบบ",
      noAdminYet: "ยังไม่มีผู้ดูแลระบบ กดเพื่อขอสิทธิ์ผู้ดูแลด้วยบัญชีนี้",
      claim: "ขอสิทธิ์ผู้ดูแล",
      noAccess: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล",
      claimExists: "มีบัญชีผู้ดูแลอยู่แล้ว",
      welcome: "ยินดีต้อนรับ คุณเป็นผู้ดูแลระบบแล้ว",
    },
    calendar: {
      dayView: "วัน",
      weekView: "สัปดาห์",
      connected: "เชื่อมต่อ Google Calendar แล้ว",
      notConnected: "ยังไม่ได้ตั้งค่า Google Calendar",
      diagnoseDate: "วันที่ตรวจสอบ",
      diagnose: "ตรวจสอบ Google",
      diagnoseChecking: "กำลังตรวจสอบ…",
      showJson: "แสดง JSON",
      hideJson: "ซ่อน JSON",
      diagnoseFailed: "การตรวจสอบ Google ล้มเหลว",
      loadingError: "โหลดข้อมูลไม่สำเร็จ",
      blocked: "ปิดคิว",
      privateBusy: "ส่วนตัว – ไม่ว่าง",
      legendBooking: "การจอง",
      legendPrivate: "นัดหมายส่วนตัวใน Google",
      legendBlocked: "ปิดคิวด้วยตนเอง",
      details: "นัดหมาย",
      blockedTitle: "ช่วงเวลาที่ปิด",
      duration: "ระยะเวลา",
      treatment: "ทรีตเมนต์",
      price: "ราคา",
      client: "ลูกค้า",
      phone: "โทรศัพท์",
      email: "อีเมล",
      address: "ที่อยู่",
      silent: "นวดแบบเงียบ",
      source: "ที่มา",
      notes: "บันทึกเพิ่มเติม",
      goToClient: "ไปที่โปรไฟล์ลูกค้า",
      deleteBooking: "ลบนัดหมาย",
      confirmDelete: "ต้องการลบนัดหมายนี้จริงหรือไม่?",
      deleted: "ลบแล้ว",
      sourceOnline: "จองออนไลน์",
      sourceManual: "บันทึกโดยผู้ดูแล",
      sourceBlock: "ปิดคิว",
    },
    clients: {
      title: "ลูกค้า",
      searchPlaceholder: "ค้นหา: ชื่อ นามสกุล อีเมล เบอร์โทร…",
      add: "ลูกค้าใหม่",
      empty: "ไม่พบข้อมูลลูกค้า",
      colName: "ชื่อ",
      colEmail: "อีเมล",
      colPhone: "โทรศัพท์",
      colStreet: "ที่อยู่ / บ้านเลขที่",
      colZip: "รหัสไปรษณีย์",
      colCity: "เมือง",
      openProfile: "เปิดโปรไฟล์",
      openProfileOf: (name: string) => `เปิดโปรไฟล์ของ ${name}`,
    },
    profile: {
      eyebrow: "โปรไฟล์ลูกค้า",
      nextBooking: "นัดหมายถัดไป",
      editContact: "แก้ไขข้อมูลลูกค้า",
      firstName: "ชื่อ",
      lastName: "นามสกุล",
      email: "อีเมล",
      phone: "โทรศัพท์",
      street: "ที่อยู่ / บ้านเลขที่",
      zip: "รหัสไปรษณีย์",
      city: "เมือง",
      tabHistory: "ประวัติ",
      tabNew: "บันทึกใหม่",
      showPainTrend: "ดูกราฟความเจ็บปวด",
      loadingHistory: "กำลังโหลดประวัติ…",
      emptyHistory: "ยังไม่มีบันทึกในสมุดนวด",
      manualNote: "บันทึกด้วยตนเอง",
      diary: "สมุดบันทึกการนวด",
      newEntry: "บันทึกใหม่",
      linkBooking: "เชื่อมกับนัดหมาย (ไม่บังคับ)",
      noneOption: "— ไม่มี —",
      notePlaceholder: "เช่น คลายจุดตึงที่กล้ามเนื้อบ่าด้านบน ท่าทางดีขึ้นเล็กน้อย…",
      tensionTitle: "ความตึงและอาการปวด",
      tensionHint: "ประเมินแต่ละจุดจาก 1 (สบายดี) ถึง 10 (ปวดมาก)",
      tensionLeft: "1 (สบาย / ไม่พบอาการ)",
      tensionRight: "10 (ปวดมาก / ตึงมาก)",
      mobilityTitle: "ความยืดหยุ่นและข้อต่อ",
      mobilityHint: "ประเมินระดับการเคลื่อนไหวของแต่ละบริเวณ",
      mobilityLeft: "1 (เคลื่อนไหวเต็มที่ / อิสระ)",
      mobilityRight: "10 (ติดขัดมาก / เคลื่อนไม่ได้)",
      bodyMap: "แผนที่ร่างกาย",
      bodyMapHint: "คลิกบนภาพร่างกายเพื่อทำเครื่องหมายจุดที่ปวดหรือมีปัญหา",
      saveNote: "บันทึก",
      noteSaved: "บันทึกเรียบร้อย",
      noteEmpty: "กรุณากรอกรายละเอียดก่อนบันทึก",
      profileUpdated: "อัปเดตข้อมูลลูกค้าแล้ว",
      clientDeleted: "ลบลูกค้าเรียบร้อย",
      dangerTitle: "ลบลูกค้า",
      dangerDesc: "ลบลูกค้ารายนี้ พร้อมนัดหมายและบันทึกทั้งหมดอย่างถาวร",
      confirmTitle: "ยืนยันการลบลูกค้า?",
      confirmDesc: "ต้องการลบลูกค้ารายนี้อย่างถาวรใช่หรือไม่? นัดหมายและบันทึกสมุดนวดทั้งหมดจะถูกลบไปด้วย",
      confirmFinal: "ลบอย่างถาวร",
      printPdf: "พิมพ์เป็น PDF",
      maxTension: "ความตึงสูงสุด",
    },
    addBooking: {
      title: "เพิ่มนัดหมาย",
      description: "บันทึกด้วยตนเอง (ทางโทรศัพท์หรือ walk-in) หรือปิดคิว",
      block: "ปิดคิว (ไม่มีลูกค้า)",
      date: "วันที่",
      time: "เวลา",
      durationPrice: "ระยะเวลา · ราคา",
      treatment: "ทรีตเมนต์",
      firstName: "ชื่อ *",
      lastName: "นามสกุล *",
      email: "อีเมล *",
      phone: "โทรศัพท์ *",
      street: "ที่อยู่ / บ้านเลขที่ *",
      zip: "รหัสไปรษณีย์ *",
      city: "เมือง *",
      silent: "นวดแบบเงียบ",
      blockSaved: "ปิดคิวเรียบร้อย",
      bookingSaved: "บันทึกนัดหมายเรียบร้อย",
    },
    addClient: {
      title: "เพิ่มลูกค้าใหม่",
      description: "บันทึกลูกค้าใหม่เข้าฐานข้อมูล",
      created: "เพิ่มลูกค้าเรียบร้อย",
    },
    painTrend: {
      title: "กราฟความเจ็บปวด",
      rangeAll: "ทั้งหมด",
      range3m: "3 เดือนล่าสุด",
      range6m: "6 เดือนล่าสุด",
      monthly: "แสดงค่าเฉลี่ยรายเดือน",
      empty: "ไม่มีข้อมูลในช่วงเวลาที่เลือก",
      groupTotal: "ภาพรวม",
      groupTension: "ความตึงและอาการปวด",
      groupMobility: "ความยืดหยุ่นและข้อต่อ",
      aggregateLabel: "ความตึงสูงสุด (ภาพรวม)",
      treatmentsSingular: "ครั้ง",
      treatmentsPlural: "ครั้ง",
    },
    tensionZones: {
      kopf: "ศีรษะ",
      nacken: "ต้นคอ",
      schulterblatt: "สะบัก",
      arme: "แขน",
      haende: "มือ",
      oberschenkel: "ต้นขา",
      fuesse: "เท้า",
      waden: "น่อง",
      gesaess: "ก้น",
      obererRuecken: "หลังส่วนบน",
      untererRuecken: "หลังส่วนล่าง",
      brust: "หน้าอก",
      bauch: "ท้อง",
      faszienAllgemein: "พังผืดทั่วร่างกาย",
    },
    mobilityZones: {
      halswirbelsaeule: "กระดูกคอและการหมุนคอ",
      schultergurtel: "หัวไหล่ (ยกเหนือศีรษะและหมุน)",
      brustwirbelsaeule: "กระดูกสันหลังส่วนอกและการยืดตัว",
      lendenwirbelsaeule: "กระดูกสันหลังส่วนเอวและการก้มลำตัว",
      hueftoeffnung: "การเปิดสะโพกและกล้ามเนื้อต้นขาด้านใน",
    },
    weekdays: { locale: "th-TH" as const },
  },
} as const;

export type AdminDict = typeof adminTranslations["de"];

type Ctx = { lang: AdminLang; setLang: (l: AdminLang) => void; t: AdminDict };
const AdminLangContext = createContext<Ctx | null>(null);

export function AdminLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<AdminLang>("de");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "de" || stored === "th") setLangState(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (l: AdminLang) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const value: Ctx = {
    lang,
    setLang,
    t: adminTranslations[lang] as unknown as AdminDict,
  };
  return <AdminLangContext.Provider value={value}>{children}</AdminLangContext.Provider>;
}

export function useAdminLanguage() {
  const ctx = useContext(AdminLangContext);
  if (!ctx) throw new Error("useAdminLanguage must be used within AdminLanguageProvider");
  return ctx;
}

export function useAdminT() {
  return useAdminLanguage().t;
}

/**
 * Wochentag/Monatsnamen wechseln je nach Sprache; Datumsformat bleibt aber
 * Schweizer Konvention (TT.MM.JJJJ) für Datumsausgaben mit formatSwissDate.
 */
export function useAdminLocale(): string {
  return useAdminLanguage().t.weekdays.locale;
}

/** Helper zum Übersetzen einer Zone (Tension oder Mobility) anhand des Schlüssels. */
export function tensionZoneLabel(t: AdminDict, key: string): string {
  const map = t.tensionZones as Record<string, string>;
  return map[key] ?? key;
}

export function mobilityZoneLabel(t: AdminDict, key: string): string {
  const map = t.mobilityZones as Record<string, string>;
  return map[key] ?? key;
}