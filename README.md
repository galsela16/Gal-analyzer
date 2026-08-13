# GAL Analyzer V5.4.38 — Low-frequency accuracy

- The left-rail EQ button now toggles the entire correction workspace on/off. The arrow inside the workspace remains dedicated only to collapsing or expanding its contents.

- Auto Delay now lives in the persistent bottom bar next to I/O, works from every measurement view, shows the measured result on its button and leaves only a read-only active-delay status inside TF.

- The rail EQ button now uses a direct, explicit action in the HTML rather than depending on the later workspace initialization sequence. It also shows immediate press feedback.

- The left-rail EQ button now resolves the latest result from TF, SPL or spatial measurements, raises the workspace above measurement docks and redraws only after its canvas is visible.

- Day mode now covers correlation, measurement cards, advanced TF/Delay content, global EQ controls, rail tools, generator controls and help tooltips.
- Help mode includes the newer workspace, I/O, EQ, Trace and TF controls and provides an automatic explanation fallback for controls without custom help text.

- The floating MIC 1 / REF 2 panel now starts to the right of the side-rail toggle, keeping the arrow and both level readouts fully visible.

- The TF More/Less and Close controls now have fixed, non-overlapping positions with reserved title space, including on narrow screens.

- Hovering near any point on the EQ correction curve now highlights it and shows frequency, exact dB value and the required action (cut/boost).

- The EQ workspace now uses a middle-density layout: a slightly shorter graph and six compact priority rows containing frequency, action and dB on one line; remaining bands stay under “show more”.

- Full correction / cut-only is now a global control in the EQ result header and applies equally to SPL, spatial and TF calculations.
- The left rail now opens the latest EQ result from any measurement mode and includes a protected session reset button.

- EQ corrections are now presented as a prioritized action list: the eight most important bands appear first as clear Cut/Boost cards, while smaller corrections stay behind an optional “show more” row.

- The RTA resolution chip in the header is now interactive and offers direct 1/3, 1/6, 1/12 and 1/24 octave selection, synchronized with I/O and saved for the next session.

- Correlation now has a dedicated full-width meter row; its scale, coloured bar and moving marker can no longer collapse into the surrounding controls.

- The TF correlation readout is now a wide, high-contrast meter with a moving marker, a −1 to +1 scale, a large signed value and a plain-language status.

- TF now shows MIC 1 and REF 2 live together across the full graph, even before a Transfer Function measurement is taken.

- MIC 1 uses a clear blue curve and REF 2 uses orange, with a shared dBFS scale, live level readouts and an uncluttered legend.

- Low Reference level no longer removes the live dual-input view; it only pauses the calculated TF measurement.

- The empty legacy TF canvas is removed from the advanced view and replaced by clear frequency + dB correction cards.

- Exact frequency and dB correction values are shown below the result curve for every actionable EQ band.

- EQ correction results now appear as a compact response curve above the measurement dock, with a clear 0 dB line, frequency scale and cut/boost colours.

- The redesigned Delay panel is hidden by default and opens only when Delay is selected, using the original dock behavior.

- Delay is forcibly closed and hidden as soon as any non-Delay workspace is selected.

- Changing measurement modes always closes the previous dock before the next workspace opens.

- Delay is arranged as inputs → measure → speaker alignment.
- TF keeps Mic 1 and Reference 2 live spectra visible together under the TF response.

- “עוד” in TF is always available; before a result exists it shows clear next-step guidance instead of a blank results area.

- MEAS and REF now read the live input waveforms continuously, with smooth movement, peak hold and clear clip indication.

- Field preflight validates syntax, cached assets, PWA icons and all visible UI hookups before packaging.

- The shared SPL meter stays visible above the Sub / Top controls.

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
