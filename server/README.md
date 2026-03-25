# NotebookLM Share - Server

## הגדרה ראשונית

### 1. התקנת dependencies
```bash
cd server
npm install
npx playwright install chromium
```

### 2. הגדרת .env
```bash
cp .env.example .env
```
ערוך את `.env` והכנס:
- `GMAIL_USER` - כתובת Gmail שלך
- `GMAIL_APP_PASSWORD` - App Password של Gmail (לא סיסמא רגילה!)

### קבלת Gmail App Password:
1. לך ל: https://myaccount.google.com/apppasswords
2. אפשר 2-Factor Authentication
3. צור App Password חדש לאפליקציה
4. העתק את הסיסמא (16 תווים) ל-.env

## הפעלה

```bash
npm start
# או לפיתוח:
npm run dev
```

השרת יפעל על port 3001.

## שימוש ראשון

### NotebookLM
- בפעם הראשונה, תצטרך להתחבר ל-Google בחלון הדפדפן שנפתח
- אחרי כניסה, הסשן נשמר ב-`sessions/notebooklm/`

### WhatsApp
- בפעם הראשונה, קוד QR יוצג באפליקציה
- סרוק עם WhatsApp בטלפון: הגדרות → מכשירים מקושרים → קשר מכשיר
- הסשן נשמר ב-`sessions/whatsapp/`
