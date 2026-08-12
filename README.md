# GAL Analyzer V5.4.11 — TF dock layout

- The compact TF dock now keeps its live inputs and primary controls visible, with secondary settings behind “עוד”.

- The SPL meter now spans the usable width of the graph and stays directly above any open bottom dock.

- RTA and Waterfall are a clean two-button switch.
- The left rail is narrower with compact cards and calibration typography.

- Mic CAL is compact: calibration list, selection and file loading only.
- SPL / dBFS toggle now works in both directions.

- Calibration status is shown only in the left workspace rail.
- The header is freed up for day mode and colour controls.

- SPL uses the original horizontal meter bar in every measurement mode.
- The floating graph SPL card has been removed.

- “עוד” in TF stays closed until a real TF measurement is available.
- After measurement it reveals a rendered EQ correction result, never a blank canvas.

- TF now falls back to a full-size live RTA graph whenever Input 2 has no reference signal.
- TF controls use a compact dock by default; deeper options remain under “עוד”.

- Fixed canvas resizing when the I/O dock opens.
- Target uses the correct dB scale in TF.

- The left workspace rail can be collapsed and restored.
- Target is available in every non-alignment graph view.
- TF retains a compact live RTA spectrum strip.
- SPL is visible as a persistent graph HUD.

זו חבילת GitHub Pages מלאה. לפני העלאה אפשר להריץ:

`node scripts/validate-static-site.mjs`

GitHub Actions מריץ את אותה בדיקה בכל Commit/Push.

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
