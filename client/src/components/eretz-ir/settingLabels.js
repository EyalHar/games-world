export const SETTING_LABELS = {
  roundSeconds: {
    title: '⏱️ זמן לסיבוב',
    values: { 60: 'דקה', 90: 'דקה וחצי', 120: '2 דקות', 180: '3 דקות' },
  },
  rounds: {
    title: '🔁 מספר סיבובים',
    values: { 5: '5', 10: '10', 15: '15', all: 'עד שנגמרות האותיות' },
  },
  hardLetters: {
    title: '🔥 אותיות קשות',
    values: { exclude: 'לדלג עליהן', include: 'לשלב כרגיל', later: 'שלב בונוס בסוף (ניקוד כפול)' },
  },
  leniency: {
    title: '✏️ סלחנות לשגיאות כתיב',
    values: { strict: 'מחמיר', medium: 'בינוני', lenient: 'סלחני' },
  },
  scoring: {
    title: '🏅 שיטת ניקוד',
    values: { simple: 'נקודה לכל תשובה', classic: 'קלאסי (10 / 5 / 15)' },
  },
  voteThreshold: {
    title: '🗳️ רוב נדרש בהצבעה על ערעור',
    values: { majority: 'יותר מחצי', p65: 'לפחות 65%', unanimous: 'פה אחד' },
  },
  stopper: {
    title: '✋ מי עוצר את האות',
    values: { rotate: 'בתורות', host: 'תמיד מנהל החדר' },
  },
};

export const SETTING_NOTES = {
  scoring: {
    classic: 'תשובה ייחודית: 10 · תשובה שגם אחר כתב: 5 · רק את/ה מילאת את התחום: 15',
  },
  leniency: {
    strict: 'רק כתיב תקני מתקבל',
    medium: 'שגיאות קטנות עוברות (ו׳/י׳ חסרה, א/ע, כ/ח)',
    lenient: 'כל מילה שאפשר לזהות כשקוראים בקול',
  },
};
