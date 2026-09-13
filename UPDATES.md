# Practice links and readability update

Copy the address from the browser after opening a section. These bookmarks work with the existing hosted URL and require no server routing changes:

| Section | URL ending |
| --- | --- |
| Learn | `#learn` |
| Test 1 | `#test1` |
| Test 2 | `#test2` |
| More | `#more` |
| Home | `#home` |

Direct links, refresh, and browser Back/Forward preserve the selected section. Each learner retains their own progress; links do not reset progress or select a specific letter or variant. Test 2 opened directly waits for Play Prompt.

Letters and filled answer slots are larger and more colourful. Empty placeholders, headings, and supporting controls are smaller. The theme picker says **Your fav color** in neutral text; the theme names use their matching colours. The SIL Open Font License Noto Sans Ethiopic font and its license are bundled locally for devices without an Ethiopic font. Keyboard focus and reduced-motion preferences are supported.

## Childlike voices

All 273 MP3 recordings (270 letters, two celebrations, and the remaining project recording) use a lighter voice effect: pitch raised five semitones, shifted formants, preserved timing, normalized volume, and stripped metadata. These are processed original voices, not recordings by children or guaranteed anonymization. A fluent-speaker pronunciation review is still recommended. Browser-synthesized spoken feedback also uses a higher pitch. Versioned audio URLs avoid previously cached recordings.

To regenerate, run `python3 tools/process-letter-audio.py /absolute/path/to/original-letter-audio.tar.gz` with the existing external archive of original letter recordings. Requires FFmpeg with the rubberband filter. The script reads the remaining original recordings from the pinned pre-processing Git revision, avoiding cumulative processing on reruns. It writes playback files only after every conversion succeeds. Backups are not included in this repository update.

## Validation

Chromium checks passed for direct section links, refresh, Back/Forward, Learn playback, Test 1 placement, Test 2 prompt playback, admin audio loading, and unknown-bookmark fallback. Layouts were checked at 320, 390, 768, and 1280 pixels with no page overflow or clipped letter buttons. Desktop and mobile screenshots were reviewed with the bundled font loaded. All six theme selections and their matching text colours were verified. No JavaScript errors were reported.

All 273 childlike recordings decoded successfully with FFmpeg, and browser playback fetched the updated audio version. `git diff --check` passed.
