# KOCHIVO starter templates — owner review

Draft content, 23 October 2026. All ten templates have `approved: false`. Coaches see the coming-soon state; admins can preview at `/admin/library?tab=training` or `?tab=nutrition`. Approval is an owner code change in `lib/starter-templates.ts`; there is no approval button.

Deterministic generator: from the repository root, run `node scripts/generate-starter-review.mjs` after editing the data. It reads the checked-in templates/catalogs and writes only this file, with no timestamps or random IDs in the output.

## Copy and save behavior

Training opens an unsaved draft in `QuickProgram`. The existing `program` builder command accepts existing coach-owned workout IDs only, so it cannot atomically materialize a complete global starter program. The fallback therefore selects the athlete in the quick editor and saves through unchanged `save_quick_program`. Global exercise names become independent custom exercises using that command's existing support. No catalog import or write occurs on Use. Rest is review guidance shown beside the draft: the current workout prescription schema stores sets/reps, not rest. Plank durations remain explicit in the reps text. Current entitlements, validation and limits still apply.

Nutrition opens the existing plan editor with an independent unsaved copy, then saves through its assignment-free `nutrition_save` path on Save. Foods/gram portions are copied into the existing meal text fields; no structured portion rows are written by Use. The existing Nutrition portion editor remains available for structured tracking after save. Leaving either editor without saving creates no workspace records.

## Review basis

Programming choices are proposed examples, not an approved prescription. The owner should review exercise selection, recovery, progression, equipment and bilingual wording. Six-day PPL is intended only for intermediates already tolerating that frequency. The home plan uses dumbbells, floor presses and a stable chair for row support. Warm-up and load selection should be individualized by the coach.

General programming context: [ACSM 2026 resistance-training position stand](https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/) and [ACSM progression models](https://pubmed.ncbi.nlm.nih.gov/19204579/). These support the general use of progressive resistance training; the exact draft splits here are KOCHIVO proposals for review, not published protocols.

Nutrition totals are examples, not universal calorie targets. Seed values are approximate cooked/edible per-100g values; recipes and brands vary. Fat loss / maintenance / gain labels require portion adjustment to the athlete. Ramadan timing and fluid intake require individual review.

## Catalog identities and macro math

Exercise UUIDs/slugs come directly from `lib/data/global-exercises.json`, the same data mounted by `ExerciseCatalog`. Foods use the stable `kochivo-curated:eg-N` source identity from `supabase/seed/foods_global.sql`. Food database UUIDs are generated during seeding and must not be hard-coded. Per-100g values are read from the matching `lib/data/foods-starter.json` entries used by the app's seed/preview tooling. Tests check source identities against the SQL seed without modifying it.

For each portion: `round(per100g × grams / 100, 1)` for kcal, protein, carbs and fat, using `calculateMacros`. Totals use `sumMacros` over rounded portions, matching existing catalog math. No calorie or macro total is typed into a template. All weights below are grams; macros are grams except kcal.

## Training templates

### Beginner full body · 3 days / جسم كامل للمبتدئ · 3 أيام

ID: `full-body-3` · beginner · 3 days/week · approved: false

Three balanced sessions with a rest day between sessions. Start light and leave 2–3 reps in reserve.

ثلاث حصص متوازنة وبينها يوم راحة. ابدأ بوزن خفيف واترك 2–3 عدات في الاحتياط.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Full body A / جسم كامل أ (1) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Full body A / جسم كامل أ (1) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Full body A / جسم كامل أ (1) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Full body A / جسم كامل أ (1) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Full body B / جسم كامل ب (3) | Romanian Deadlift / رفعة ميتة رومانية | `4ab2a35d-80b1-5b65-a81c-5e02b0726644` · `Romanian_Deadlift` | 3 | 8–10 | 120 |
| Full body B / جسم كامل ب (3) | Dumbbell Shoulder Press / ضغط كتف بالدمبل | `d2fcd833-84c2-53c6-a05a-9b46a77e29cc` · `Dumbbell_Shoulder_Press` | 3 | 8–12 | 90 |
| Full body B / جسم كامل ب (3) | Wide-Grip Lat Pulldown / سحب علوي بمسكة واسعة | `1335b440-6f06-5447-ae4e-d3071734e0fc` · `Wide-Grip_Lat_Pulldown` | 3 | 8–12 | 90 |
| Full body B / جسم كامل ب (3) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Full body C / جسم كامل ج (5) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Full body C / جسم كامل ج (5) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Full body C / جسم كامل ج (5) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Full body C / جسم كامل ج (5) | Barbell Hip Thrust / دفع الحوض بالبار | `3142782e-6c5b-5902-af98-2648ae8f6512` · `Barbell_Hip_Thrust` | 3 | 10–12 | 120 |

### Upper / lower · 4 days / علوي / سفلي · 4 أيام

ID: `upper-lower-4` · intermediate · 4 days/week · approved: false

Two upper and two lower sessions. Leave 1–3 reps in reserve; add load only after completing the range comfortably.

حصتان للجزء العلوي وحصتان للسفلي. اترك 1–3 عدات في الاحتياط وزد الوزن بعد إتمام المدى بسهولة.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Upper A / علوي أ (1) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Upper A / علوي أ (1) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Upper A / علوي أ (1) | Dumbbell Shoulder Press / ضغط كتف بالدمبل | `d2fcd833-84c2-53c6-a05a-9b46a77e29cc` · `Dumbbell_Shoulder_Press` | 3 | 8–12 | 90 |
| Upper A / علوي أ (1) | Wide-Grip Lat Pulldown / سحب علوي بمسكة واسعة | `1335b440-6f06-5447-ae4e-d3071734e0fc` · `Wide-Grip_Lat_Pulldown` | 3 | 8–12 | 90 |
| Lower A / سفلي أ (2) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Lower A / سفلي أ (2) | Romanian Deadlift / رفعة ميتة رومانية | `4ab2a35d-80b1-5b65-a81c-5e02b0726644` · `Romanian_Deadlift` | 3 | 8–10 | 120 |
| Lower A / سفلي أ (2) | Lying Leg Curls / ثني الرجلين من النوم على الجهاز | `1f1f20dc-1b5f-5030-a6c5-1a75d96418ec` · `Lying_Leg_Curls` | 3 | 8–12 | 90 |
| Lower A / سفلي أ (2) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Upper B / علوي ب (4) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Upper B / علوي ب (4) | Wide-Grip Lat Pulldown / سحب علوي بمسكة واسعة | `1335b440-6f06-5447-ae4e-d3071734e0fc` · `Wide-Grip_Lat_Pulldown` | 3 | 8–12 | 90 |
| Upper B / علوي ب (4) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Upper B / علوي ب (4) | Side Lateral Raise / رفرفة جانبي بالدمبل | `15937924-d9d1-56f5-a66c-7a6140f67d4f` · `Side_Lateral_Raise` | 2 | 12–15 | 60 |
| Lower B / سفلي ب (5) | Leg Press / ضغط الرجلين على الجهاز | `4c582211-4df9-56ac-a24f-7407f43a9b71` · `Leg_Press` | 3 | 8–12 | 90 |
| Lower B / سفلي ب (5) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Lower B / سفلي ب (5) | Barbell Hip Thrust / دفع الحوض بالبار | `3142782e-6c5b-5902-af98-2648ae8f6512` · `Barbell_Hip_Thrust` | 3 | 10–12 | 120 |
| Lower B / سفلي ب (5) | Standing Calf Raises / رفع السمانة من الوقوف | `77fb135d-24bc-5563-a5c3-564ebb564052` · `Standing_Calf_Raises` | 3 | 12–15 | 60 |

### Push / pull / legs · 6 days / دفع / سحب / رجل · 6 أيام

ID: `ppl-6` · intermediate · 6 days/week · approved: false

For intermediates already tolerating six sessions. Keep 2 reps in reserve and take the seventh day off.

للمتوسط المعتاد على ست حصص. اترك عدتين في الاحتياط واليوم السابع راحة.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Push A / دفع أ (1) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Push A / دفع أ (1) | Dumbbell Shoulder Press / ضغط كتف بالدمبل | `d2fcd833-84c2-53c6-a05a-9b46a77e29cc` · `Dumbbell_Shoulder_Press` | 3 | 8–12 | 90 |
| Push A / دفع أ (1) | Triceps Pushdown / دفع ترايسبس بالكابل لأسفل | `2a7e29e1-9a03-5e11-a373-598bf1fbdab9` · `Triceps_Pushdown` | 2 | 10–15 | 60 |
| Pull A / سحب أ (2) | Wide-Grip Lat Pulldown / سحب علوي بمسكة واسعة | `1335b440-6f06-5447-ae4e-d3071734e0fc` · `Wide-Grip_Lat_Pulldown` | 3 | 8–12 | 90 |
| Pull A / سحب أ (2) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Pull A / سحب أ (2) | Dumbbell Bicep Curl / باي بالدمبل | `c8a0d0f5-971a-54ce-a87d-4be9dd506d11` · `Dumbbell_Bicep_Curl` | 2 | 10–15 | 60 |
| Legs A / رجل أ (3) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Legs A / رجل أ (3) | Romanian Deadlift / رفعة ميتة رومانية | `4ab2a35d-80b1-5b65-a81c-5e02b0726644` · `Romanian_Deadlift` | 3 | 8–10 | 120 |
| Legs A / رجل أ (3) | Lying Leg Curls / ثني الرجلين من النوم على الجهاز | `1f1f20dc-1b5f-5030-a6c5-1a75d96418ec` · `Lying_Leg_Curls` | 3 | 8–12 | 90 |
| Legs A / رجل أ (3) | Standing Calf Raises / رفع السمانة من الوقوف | `77fb135d-24bc-5563-a5c3-564ebb564052` · `Standing_Calf_Raises` | 3 | 12–15 | 60 |
| Push B / دفع ب (4) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Push B / دفع ب (4) | Dumbbell Shoulder Press / ضغط كتف بالدمبل | `d2fcd833-84c2-53c6-a05a-9b46a77e29cc` · `Dumbbell_Shoulder_Press` | 3 | 8–12 | 90 |
| Push B / دفع ب (4) | Triceps Pushdown / دفع ترايسبس بالكابل لأسفل | `2a7e29e1-9a03-5e11-a373-598bf1fbdab9` · `Triceps_Pushdown` | 2 | 10–15 | 60 |
| Pull B / سحب ب (5) | Wide-Grip Lat Pulldown / سحب علوي بمسكة واسعة | `1335b440-6f06-5447-ae4e-d3071734e0fc` · `Wide-Grip_Lat_Pulldown` | 3 | 8–12 | 90 |
| Pull B / سحب ب (5) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Pull B / سحب ب (5) | Dumbbell Bicep Curl / باي بالدمبل | `c8a0d0f5-971a-54ce-a87d-4be9dd506d11` · `Dumbbell_Bicep_Curl` | 2 | 10–15 | 60 |
| Legs B / رجل ب (6) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Legs B / رجل ب (6) | Romanian Deadlift / رفعة ميتة رومانية | `4ab2a35d-80b1-5b65-a81c-5e02b0726644` · `Romanian_Deadlift` | 3 | 8–10 | 120 |
| Legs B / رجل ب (6) | Lying Leg Curls / ثني الرجلين من النوم على الجهاز | `1f1f20dc-1b5f-5030-a6c5-1a75d96418ec` · `Lying_Leg_Curls` | 3 | 8–12 | 90 |
| Legs B / رجل ب (6) | Standing Calf Raises / رفع السمانة من الوقوف | `77fb135d-24bc-5563-a5c3-564ebb564052` · `Standing_Calf_Raises` | 3 | 12–15 | 60 |

### Home dumbbells · 3 days / دمبل في البيت · 3 أيام

ID: `home-dumbbells-3` · beginner · 3 days/week · approved: false

Dumbbells and a stable chair only. Use floor presses instead of a bench; row with the free hand supported on the chair.

دمبل وكرسي ثابت فقط. نفّذ ضغط الصدر على الأرض بدل البنش واسند اليد الحرة على الكرسي أثناء السحب.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Home 1 / البيت 1 (1) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Home 1 / البيت 1 (1) | Dumbbell Floor Press / ضغط صدر أرضي بالدمبل | `39bdb661-f406-560c-a845-140f9e0be590` · `Dumbbell_Floor_Press` | 3 | 8–12 | 90 |
| Home 1 / البيت 1 (1) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Home 1 / البيت 1 (1) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Home 1 / البيت 1 (1) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Home 2 / البيت 2 (3) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Home 2 / البيت 2 (3) | Dumbbell Floor Press / ضغط صدر أرضي بالدمبل | `39bdb661-f406-560c-a845-140f9e0be590` · `Dumbbell_Floor_Press` | 3 | 8–12 | 90 |
| Home 2 / البيت 2 (3) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Home 2 / البيت 2 (3) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Home 2 / البيت 2 (3) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Home 3 / البيت 3 (5) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Home 3 / البيت 3 (5) | Dumbbell Floor Press / ضغط صدر أرضي بالدمبل | `39bdb661-f406-560c-a845-140f9e0be590` · `Dumbbell_Floor_Press` | 3 | 8–12 | 90 |
| Home 3 / البيت 3 (5) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Home 3 / البيت 3 (5) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Home 3 / البيت 3 (5) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |

### Conditioning circuit · 3 days / دائرة لياقة · 3 أيام

ID: `conditioning-3` · beginner · 3 days/week · approved: false

Two easy rounds per session. Rest 60 seconds between exercises and 2 minutes between rounds. Fat loss also depends on energy intake.

جولتان خفيفتان في الحصة. راحة 60 ثانية بين التمارين ودقيقتين بين الجولات. فقدان الدهون يعتمد أيضًا على الأكل.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Circuit 1 / دائرة 1 (1) | Bodyweight Squat / سكوات بوزن الجسم | `580616fc-3ca6-5ad2-a915-fd1246559f55` · `Bodyweight_Squat` | 2 | 10–15 | 60 |
| Circuit 1 / دائرة 1 (1) | Pushups / ضغط أرضي | `e0d9ccae-349f-598d-aab6-615a997cd921` · `Pushups` | 2 | 6–10 | 60 |
| Circuit 1 / دائرة 1 (1) | Mountain Climbers / متسلق الجبال | `a3163652-0966-5dca-a925-24092c85188e` · `Mountain_Climbers` | 2 | 10–15 per side | 60 |
| Circuit 1 / دائرة 1 (1) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Circuit 2 / دائرة 2 (3) | Bodyweight Squat / سكوات بوزن الجسم | `580616fc-3ca6-5ad2-a915-fd1246559f55` · `Bodyweight_Squat` | 2 | 10–15 | 60 |
| Circuit 2 / دائرة 2 (3) | Pushups / ضغط أرضي | `e0d9ccae-349f-598d-aab6-615a997cd921` · `Pushups` | 2 | 6–10 | 60 |
| Circuit 2 / دائرة 2 (3) | Mountain Climbers / متسلق الجبال | `a3163652-0966-5dca-a925-24092c85188e` · `Mountain_Climbers` | 2 | 10–15 per side | 60 |
| Circuit 2 / دائرة 2 (3) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Circuit 3 / دائرة 3 (5) | Bodyweight Squat / سكوات بوزن الجسم | `580616fc-3ca6-5ad2-a915-fd1246559f55` · `Bodyweight_Squat` | 2 | 10–15 | 60 |
| Circuit 3 / دائرة 3 (5) | Pushups / ضغط أرضي | `e0d9ccae-349f-598d-aab6-615a997cd921` · `Pushups` | 2 | 6–10 | 60 |
| Circuit 3 / دائرة 3 (5) | Mountain Climbers / متسلق الجبال | `a3163652-0966-5dca-a925-24092c85188e` · `Mountain_Climbers` | 2 | 10–15 per side | 60 |
| Circuit 3 / دائرة 3 (5) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |

### Lower body & glutes · 3 days / رجل وعضلات الألوية · 3 أيام

ID: `lower-glutes-3` · intermediate · 3 days/week · approved: false

Lower-body emphasis with upper-body maintenance. Allow at least one rest day between sessions.

تركيز على الرجل والألوية مع الحفاظ على الجزء العلوي. يوم راحة على الأقل بين الحصص.

| Day (weekday; Sunday=0) | Exercise / التمرين | Global UUID · slug | Sets | Reps / duration | Rest (s) |
| --- | --- | --- | ---: | --- | ---: |
| Lower A / سفلي أ (1) | Goblet Squat / سكوات الكأس | `e32fe9bc-2412-5c00-a149-299a20bcf2e7` · `Goblet_Squat` | 3 | 8–12 | 90 |
| Lower A / سفلي أ (1) | Barbell Hip Thrust / دفع الحوض بالبار | `3142782e-6c5b-5902-af98-2648ae8f6512` · `Barbell_Hip_Thrust` | 3 | 10–12 | 120 |
| Lower A / سفلي أ (1) | One-Arm Dumbbell Row / تجديف بالدمبل بدراع واحدة | `d173e26d-ea8f-5a04-a4ff-0f314d77f8bc` · `One-Arm_Dumbbell_Row` | 3 | 8–12 | 90 |
| Lower A / سفلي أ (1) | Lying Leg Curls / ثني الرجلين من النوم على الجهاز | `1f1f20dc-1b5f-5030-a6c5-1a75d96418ec` · `Lying_Leg_Curls` | 3 | 8–12 | 90 |
| Lower B / سفلي ب (3) | Romanian Deadlift / رفعة ميتة رومانية | `4ab2a35d-80b1-5b65-a81c-5e02b0726644` · `Romanian_Deadlift` | 3 | 8–10 | 120 |
| Lower B / سفلي ب (3) | Dumbbell Lunges / اندفاع بالدمبل | `c74ef282-66a3-5ab8-a4c6-fc7ba7ef36f6` · `Dumbbell_Lunges` | 2 | 10–12 | 90 |
| Lower B / سفلي ب (3) | Dumbbell Bench Press / بنش مستوي بالدمبل | `11618f53-e38a-566b-a9cd-d8e994544eb4` · `Dumbbell_Bench_Press` | 3 | 8–12 | 90 |
| Lower B / سفلي ب (3) | Plank / بلانك | `f04eebb4-5457-5362-a6b2-2f733b1b360d` · `Plank` | 2 | 20–30 seconds | 60 |
| Lower C / سفلي ج (5) | Leg Press / ضغط الرجلين على الجهاز | `4c582211-4df9-56ac-a24f-7407f43a9b71` · `Leg_Press` | 3 | 8–12 | 90 |
| Lower C / سفلي ج (5) | Barbell Hip Thrust / دفع الحوض بالبار | `3142782e-6c5b-5902-af98-2648ae8f6512` · `Barbell_Hip_Thrust` | 3 | 10–12 | 120 |
| Lower C / سفلي ج (5) | Dumbbell Shoulder Press / ضغط كتف بالدمبل | `d2fcd833-84c2-53c6-a05a-9b46a77e29cc` · `Dumbbell_Shoulder_Press` | 3 | 8–12 | 90 |
| Lower C / سفلي ج (5) | Standing Calf Raises / رفع السمانة من الوقوف | `77fb135d-24bc-5563-a5c3-564ebb564052` · `Standing_Calf_Raises` | 3 | 12–15 | 60 |

## Nutrition templates

### Fat loss example day / يوم مقترح لفقدان الدهون

ID: `fat-loss` · beginner · 7 days/week · approved: false

Example portions, not a personal calorie target. Adjust for the athlete, preferences and activity.

كميات مقترحة وليست هدف سعرات شخصي. عدّل حسب اللاعب وتفضيلاته ونشاطه.

| Meal | Food / الأكل | Stable seed ID | Grams | kcal | Protein | Carbs | Fat |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Breakfast / فطار | Oats, dry / شوفان جاف | `kochivo-curated:eg-21` | 50 | 194.5 | 8.5 | 33.2 | 3.5 |
| Breakfast / فطار | Low fat yogurt / زبادي قليل الدسم | `kochivo-curated:eg-29` | 200 | 126 | 10.6 | 14 | 3.2 |
| Breakfast / فطار | Banana / موز | `kochivo-curated:eg-42` | 100 | 89 | 1.1 | 22.8 | 0.3 |
| Lunch / غداء | Chicken breast, cooked / صدور دجاج مطبوخة | `kochivo-curated:eg-3` | 150 | 247.5 | 46.5 | 0 | 5.4 |
| Lunch / غداء | White rice, cooked / أرز أبيض مطبوخ | `kochivo-curated:eg-1` | 150 | 195 | 4.1 | 42.3 | 0.5 |
| Lunch / غداء | Broccoli, cooked / بروكلي مطبوخ | `kochivo-curated:eg-53` | 150 | 52.5 | 3.6 | 10.8 | 0.6 |
| Lunch / غداء | Olive oil / زيت زيتون | `kochivo-curated:eg-40` | 10 | 88.4 | 0 | 0 | 10 |
| Dinner / عشاء | Lentils, cooked / عدس مطبوخ | `kochivo-curated:eg-15` | 200 | 232 | 18 | 40.2 | 0.8 |
| Dinner / عشاء | Baladi bread / عيش بلدي | `kochivo-curated:eg-18` | 70 | 186.2 | 6.3 | 38.5 | 0.8 |
| Dinner / عشاء | Cucumber / خيار | `kochivo-curated:eg-50` | 150 | 22.5 | 1.1 | 5.4 | 0.2 |
| Snack / سناك | Greek yogurt, plain / زبادي يوناني سادة | `kochivo-curated:eg-30` | 200 | 146 | 20 | 7.8 | 3.8 |
| Snack / سناك | Almonds / لوز | `kochivo-curated:eg-37` | 20 | 115.8 | 4.2 | 4.3 | 10 |
| Snack / سناك | Apple / تفاح | `kochivo-curated:eg-43` | 150 | 78 | 0.5 | 20.7 | 0.3 |
| **Daily total** | | | | **1773.4** | **124.5** | **240** | **39.4** |

### Maintenance example day / يوم مقترح لثبات الوزن

ID: `maintenance` · beginner · 7 days/week · approved: false

A balanced starting point; adjust portions to observed weight trends, appetite and training.

بداية متوازنة؛ عدّل الكميات حسب تغيّر الوزن والشهية والتدريب.

| Meal | Food / الأكل | Stable seed ID | Grams | kcal | Protein | Carbs | Fat |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Breakfast / فطار | Oats, dry / شوفان جاف | `kochivo-curated:eg-21` | 70 | 272.3 | 11.8 | 46.4 | 4.8 |
| Breakfast / فطار | Skimmed milk / حليب خالي الدسم | `kochivo-curated:eg-32` | 250 | 85 | 8.5 | 12.5 | 0.3 |
| Breakfast / فطار | Banana / موز | `kochivo-curated:eg-42` | 120 | 106.8 | 1.3 | 27.4 | 0.4 |
| Breakfast / فطار | Peanut butter / زبدة فول سوداني | `kochivo-curated:eg-35` | 20 | 117.6 | 5 | 4 | 10 |
| Lunch / غداء | Chicken breast, cooked / صدور دجاج مطبوخة | `kochivo-curated:eg-3` | 180 | 297 | 55.8 | 0 | 6.5 |
| Lunch / غداء | White rice, cooked / أرز أبيض مطبوخ | `kochivo-curated:eg-1` | 250 | 325 | 6.8 | 70.5 | 0.8 |
| Lunch / غداء | Broccoli, cooked / بروكلي مطبوخ | `kochivo-curated:eg-53` | 150 | 52.5 | 3.6 | 10.8 | 0.6 |
| Lunch / غداء | Olive oil / زيت زيتون | `kochivo-curated:eg-40` | 15 | 132.6 | 0 | 0 | 15 |
| Dinner / عشاء | Ful medames, plain / فول مدمس سادة | `kochivo-curated:eg-13` | 200 | 220 | 15.2 | 39.4 | 0.8 |
| Dinner / عشاء | Baladi bread / عيش بلدي | `kochivo-curated:eg-18` | 100 | 266 | 9 | 55 | 1.2 |
| Dinner / عشاء | Whole egg, boiled / بيض مسلوق | `kochivo-curated:eg-10` | 100 | 155 | 12.6 | 1.1 | 10.6 |
| Dinner / عشاء | Tomato / طماطم | `kochivo-curated:eg-51` | 150 | 27 | 1.4 | 5.9 | 0.3 |
| Snack / سناك | Greek yogurt, plain / زبادي يوناني سادة | `kochivo-curated:eg-30` | 200 | 146 | 20 | 7.8 | 3.8 |
| Snack / سناك | Apple / تفاح | `kochivo-curated:eg-43` | 180 | 93.6 | 0.5 | 24.8 | 0.4 |
| Snack / سناك | Almonds / لوز | `kochivo-curated:eg-37` | 25 | 144.8 | 5.3 | 5.4 | 12.5 |
| **Daily total** | | | | **2441.2** | **156.8** | **311** | **68** |

### Lean gain example day / يوم مقترح لزيادة عضلية

ID: `lean-gain` · intermediate · 7 days/week · approved: false

Larger portions for review. Adjust gradually; calorie needs vary widely between athletes.

كميات أكبر للمراجعة. عدّل تدريجيًا؛ احتياجات السعرات تختلف كثيرًا بين اللاعبين.

| Meal | Food / الأكل | Stable seed ID | Grams | kcal | Protein | Carbs | Fat |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Breakfast / فطار | Oats, dry / شوفان جاف | `kochivo-curated:eg-21` | 90 | 350.1 | 15.2 | 59.7 | 6.2 |
| Breakfast / فطار | Whole milk / حليب كامل الدسم | `kochivo-curated:eg-31` | 300 | 183 | 9.6 | 14.4 | 9.9 |
| Breakfast / فطار | Banana / موز | `kochivo-curated:eg-42` | 150 | 133.5 | 1.7 | 34.2 | 0.5 |
| Breakfast / فطار | Peanut butter / زبدة فول سوداني | `kochivo-curated:eg-35` | 25 | 147 | 6.3 | 5 | 12.5 |
| Lunch / غداء | Chicken breast, cooked / صدور دجاج مطبوخة | `kochivo-curated:eg-3` | 200 | 330 | 62 | 0 | 7.2 |
| Lunch / غداء | White rice, cooked / أرز أبيض مطبوخ | `kochivo-curated:eg-1` | 300 | 390 | 8.1 | 84.6 | 0.9 |
| Lunch / غداء | Broccoli, cooked / بروكلي مطبوخ | `kochivo-curated:eg-53` | 150 | 52.5 | 3.6 | 10.8 | 0.6 |
| Lunch / غداء | Olive oil / زيت زيتون | `kochivo-curated:eg-40` | 15 | 132.6 | 0 | 0 | 15 |
| Dinner / عشاء | Salmon, cooked / سلمون مطبوخ | `kochivo-curated:eg-9` | 180 | 370.8 | 39.6 | 0 | 21.6 |
| Dinner / عشاء | Potatoes, boiled / بطاطس مسلوقة | `kochivo-curated:eg-23` | 300 | 261 | 5.7 | 60.3 | 0.3 |
| Dinner / عشاء | Baladi bread / عيش بلدي | `kochivo-curated:eg-18` | 100 | 266 | 9 | 55 | 1.2 |
| Dinner / عشاء | Cucumber / خيار | `kochivo-curated:eg-50` | 150 | 22.5 | 1.1 | 5.4 | 0.2 |
| Snack / سناك | Greek yogurt, plain / زبادي يوناني سادة | `kochivo-curated:eg-30` | 250 | 182.5 | 25 | 9.8 | 4.8 |
| Snack / سناك | Almonds / لوز | `kochivo-curated:eg-37` | 30 | 173.7 | 6.4 | 6.5 | 15 |
| Snack / سناك | Apple / تفاح | `kochivo-curated:eg-43` | 200 | 104 | 0.6 | 27.6 | 0.4 |
| **Daily total** | | | | **3099.2** | **193.9** | **373.3** | **96.3** |

### Ramadan · suhoor / iftar / رمضان · سحور / إفطار

ID: `ramadan` · beginner · 7 days/week · approved: false

Suhoor, iftar and an evening snack. Distribute fluids across non-fasting hours and adjust training timing individually.

سحور وإفطار وسناك مسائي. وزّع السوائل في ساعات الإفطار وعدّل موعد التمرين حسب اللاعب.

| Meal | Food / الأكل | Stable seed ID | Grams | kcal | Protein | Carbs | Fat |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Suhoor / سحور | Ful medames, plain / فول مدمس سادة | `kochivo-curated:eg-13` | 200 | 220 | 15.2 | 39.4 | 0.8 |
| Suhoor / سحور | Baladi bread / عيش بلدي | `kochivo-curated:eg-18` | 100 | 266 | 9 | 55 | 1.2 |
| Suhoor / سحور | Whole egg, boiled / بيض مسلوق | `kochivo-curated:eg-10` | 100 | 155 | 12.6 | 1.1 | 10.6 |
| Suhoor / سحور | Low fat yogurt / زبادي قليل الدسم | `kochivo-curated:eg-29` | 200 | 126 | 10.6 | 14 | 3.2 |
| Suhoor / سحور | Cucumber / خيار | `kochivo-curated:eg-50` | 150 | 22.5 | 1.1 | 5.4 | 0.2 |
| Iftar / إفطار | Dates / بلح | `kochivo-curated:eg-45` | 40 | 110.8 | 0.7 | 30 | 0.1 |
| Iftar / إفطار | Chicken breast, cooked / صدور دجاج مطبوخة | `kochivo-curated:eg-3` | 180 | 297 | 55.8 | 0 | 6.5 |
| Iftar / إفطار | White rice, cooked / أرز أبيض مطبوخ | `kochivo-curated:eg-1` | 250 | 325 | 6.8 | 70.5 | 0.8 |
| Iftar / إفطار | Broccoli, cooked / بروكلي مطبوخ | `kochivo-curated:eg-53` | 150 | 52.5 | 3.6 | 10.8 | 0.6 |
| Iftar / إفطار | Olive oil / زيت زيتون | `kochivo-curated:eg-40` | 15 | 132.6 | 0 | 0 | 15 |
| Evening snack / سناك مسائي | Oats, dry / شوفان جاف | `kochivo-curated:eg-21` | 50 | 194.5 | 8.5 | 33.2 | 3.5 |
| Evening snack / سناك مسائي | Skimmed milk / حليب خالي الدسم | `kochivo-curated:eg-32` | 250 | 85 | 8.5 | 12.5 | 0.3 |
| Evening snack / سناك مسائي | Banana / موز | `kochivo-curated:eg-42` | 120 | 106.8 | 1.3 | 27.4 | 0.4 |
| Evening snack / سناك مسائي | Almonds / لوز | `kochivo-curated:eg-37` | 25 | 144.8 | 5.3 | 5.4 | 12.5 |
| **Daily total** | | | | **2238.5** | **139** | **304.7** | **55.7** |

