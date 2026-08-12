# GAL Analyzer V5.3 — Measurement Workflow

## מה חדש
- RTA ו-Waterfall נמצאים במצב Analysis אחד עם מעבר פנימי.
- Generator נפתח כ-Dock תחתון שמקטין את הגרף.
- פעולות Device, Channels, Mic CAL, SPL, Output ו-Export פועלות בתוך I/O החדש.
- Trace הוא צילום עקומה להשוואה, עם הצגה/הסתרה, שינוי שם ומחיקה.

## שינוי מרכזי
הפאנל התחתון הישן הוחלף ב-Quick Bar קומפקטי:
- MIC 1 + level
- REF 2 + level
- Sample Rate
- FFT
- Calibration status
- I/O
- Generator
- Freeze
- Capture

## I/O Dock
לחיצה על I/O פותחת Dock מסודר עם:
- Audio Device
- Measurement / Reference channels
- meters לשני הערוצים
- Sample Rate
- FFT Size
- RTA Resolution
- Mic Calibration
- SPL Offset
- Meter Unit
- Advanced I/O כגשר זמני להגדרות הישנות

ה-controls הישנים נשארו ב-DOM כדי לא לשבור פונקציות קיימות, אבל אינם מוצגים בממשק הראשי.
