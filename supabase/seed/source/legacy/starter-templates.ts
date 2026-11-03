// Only the starter rows: the full catalog would ship to every browser (scripts/build-client-exercise-data.mjs).
import exercises from "./data/starter-exercises.json";
import foods from "./data/foods-starter.json";
import { calculateMacros, sumMacros } from "./nutrition/macros";
import type { QuickDraft } from "./quick-program";
import type { Meal } from "./wellness-types";
import { localPlanDate } from "./training-schedule";

export type Bilingual = { en: string; ar: string };
type Starter = {
  id: string;
  name: Bilingual;
  description: Bilingual;
  level: "beginner" | "intermediate";
  daysPerWeek: number;
  approved: boolean;
};
export type StarterExercise = {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
};
export type TrainingStarter = Starter & {
  days: { name: Bilingual; weekday: number; exercises: StarterExercise[] }[];
};
export type NutritionStarter = Starter & {
  meals: { name: Bilingual; portions: { foodId: string; grams: number }[] }[];
};
// Foods have generated database UUIDs. source + source_id is their stable seed
// identity (supabase/seed/foods_global.sql), in the same order as this app seed.
export const starterFoods = foods.map((food, index) => ({
  ...food,
  id: `kochivo-curated:eg-${index + 1}`,
}));
function exercise(
  slug: string,
  sets = 3,
  reps = "8–12",
  restSeconds = 90,
): StarterExercise {
  const row = exercises.find((e) => e.source_id === slug);
  if (!row) throw Error(`Unknown starter exercise: ${slug}`);
  return { exerciseId: row.id, sets, reps, restSeconds };
}
const squat = () => exercise("Goblet_Squat");
const press = () => exercise("Dumbbell_Bench_Press");
const row = () => exercise("One-Arm_Dumbbell_Row");
const hinge = () => exercise("Romanian_Deadlift", 3, "8–10", 120);
const shoulder = () => exercise("Dumbbell_Shoulder_Press");
const pull = () => exercise("Wide-Grip_Lat_Pulldown");
const lunge = () => exercise("Dumbbell_Lunges", 2, "10–12", 90);
const bridge = () => exercise("Barbell_Hip_Thrust", 3, "10–12", 120);
const core = () => exercise("Plank", 2, "20–30 seconds", 60);
const day = (
  en: string,
  ar: string,
  weekday: number,
  items: StarterExercise[],
) => ({ name: { en, ar }, weekday, exercises: items });
export const trainingStarters: TrainingStarter[] = [
  {
    id: "full-body-3",
    name: {
      en: "Beginner full body · 3 days",
      ar: "جسم كامل للمبتدئ · 3 أيام",
    },
    description: {
      en: "Three balanced sessions with a rest day between sessions. Start light and leave 2–3 reps in reserve.",
      ar: "ثلاث حصص متوازنة وبينها يوم راحة. ابدأ بوزن خفيف واترك 2–3 عدات في الاحتياط.",
    },
    level: "beginner",
    daysPerWeek: 3,
    approved: false,
    days: [
      day("Full body A", "جسم كامل أ", 1, [squat(), press(), row(), core()]),
      day("Full body B", "جسم كامل ب", 3, [
        hinge(),
        shoulder(),
        pull(),
        lunge(),
      ]),
      day("Full body C", "جسم كامل ج", 5, [squat(), press(), row(), bridge()]),
    ],
  },
  {
    id: "upper-lower-4",
    name: { en: "Upper / lower · 4 days", ar: "علوي / سفلي · 4 أيام" },
    description: {
      en: "Two upper and two lower sessions. Leave 1–3 reps in reserve; add load only after completing the range comfortably.",
      ar: "حصتان للجزء العلوي وحصتان للسفلي. اترك 1–3 عدات في الاحتياط وزد الوزن بعد إتمام المدى بسهولة.",
    },
    level: "intermediate",
    daysPerWeek: 4,
    approved: false,
    days: [
      day("Upper A", "علوي أ", 1, [press(), row(), shoulder(), pull()]),
      day("Lower A", "سفلي أ", 2, [
        squat(),
        hinge(),
        exercise("Lying_Leg_Curls"),
        core(),
      ]),
      day("Upper B", "علوي ب", 4, [
        press(),
        pull(),
        row(),
        exercise("Side_Lateral_Raise", 2, "12–15", 60),
      ]),
      day("Lower B", "سفلي ب", 5, [
        exercise("Leg_Press"),
        lunge(),
        bridge(),
        exercise("Standing_Calf_Raises", 3, "12–15", 60),
      ]),
    ],
  },
  {
    id: "ppl-6",
    name: { en: "Push / pull / legs · 6 days", ar: "دفع / سحب / رجل · 6 أيام" },
    description: {
      en: "For intermediates already tolerating six sessions. Keep 2 reps in reserve and take the seventh day off.",
      ar: "للمتوسط المعتاد على ست حصص. اترك عدتين في الاحتياط واليوم السابع راحة.",
    },
    level: "intermediate",
    daysPerWeek: 6,
    approved: false,
    days: [1, 4]
      .map((n) =>
        day(`Push ${n === 1 ? "A" : "B"}`, `دفع ${n === 1 ? "أ" : "ب"}`, n, [
          press(),
          shoulder(),
          exercise("Triceps_Pushdown", 2, "10–15", 60),
        ]),
      )
      .concat(
        [2, 5].map((n) =>
          day(`Pull ${n === 2 ? "A" : "B"}`, `سحب ${n === 2 ? "أ" : "ب"}`, n, [
            pull(),
            row(),
            exercise("Dumbbell_Bicep_Curl", 2, "10–15", 60),
          ]),
        ),
      )
      .concat(
        [3, 6].map((n) =>
          day(`Legs ${n === 3 ? "A" : "B"}`, `رجل ${n === 3 ? "أ" : "ب"}`, n, [
            squat(),
            hinge(),
            exercise("Lying_Leg_Curls"),
            exercise("Standing_Calf_Raises", 3, "12–15", 60),
          ]),
        ),
      )
      .sort((a, b) => a.weekday - b.weekday),
  },
  {
    id: "home-dumbbells-3",
    name: { en: "Home dumbbells · 3 days", ar: "دمبل في البيت · 3 أيام" },
    description: {
      en: "Dumbbells and a stable chair only. Use floor presses instead of a bench; row with the free hand supported on the chair.",
      ar: "دمبل وكرسي ثابت فقط. نفّذ ضغط الصدر على الأرض بدل البنش واسند اليد الحرة على الكرسي أثناء السحب.",
    },
    level: "beginner",
    daysPerWeek: 3,
    approved: false,
    days: [1, 3, 5].map((n, i) =>
      day(`Home ${i + 1}`, `البيت ${i + 1}`, n, [
        squat(),
        exercise("Dumbbell_Floor_Press"),
        row(),
        lunge(),
        core(),
      ]),
    ),
  },
  {
    id: "conditioning-3",
    name: { en: "Conditioning circuit · 3 days", ar: "دائرة لياقة · 3 أيام" },
    description: {
      en: "Two easy rounds per session. Rest 60 seconds between exercises and 2 minutes between rounds. Fat loss also depends on energy intake.",
      ar: "جولتان خفيفتان في الحصة. راحة 60 ثانية بين التمارين ودقيقتين بين الجولات. فقدان الدهون يعتمد أيضًا على الأكل.",
    },
    level: "beginner",
    daysPerWeek: 3,
    approved: false,
    days: [1, 3, 5].map((n, i) =>
      day(`Circuit ${i + 1}`, `دائرة ${i + 1}`, n, [
        exercise("Bodyweight_Squat", 2, "10–15", 60),
        exercise("Pushups", 2, "6–10", 60),
        exercise("Mountain_Climbers", 2, "10–15 per side", 60),
        core(),
      ]),
    ),
  },
  {
    id: "lower-glutes-3",
    name: {
      en: "Lower body & glutes · 3 days",
      ar: "رجل وعضلات الألوية · 3 أيام",
    },
    description: {
      en: "Lower-body emphasis with upper-body maintenance. Allow at least one rest day between sessions.",
      ar: "تركيز على الرجل والألوية مع الحفاظ على الجزء العلوي. يوم راحة على الأقل بين الحصص.",
    },
    level: "intermediate",
    daysPerWeek: 3,
    approved: false,
    days: [
      day("Lower A", "سفلي أ", 1, [
        squat(),
        bridge(),
        row(),
        exercise("Lying_Leg_Curls"),
      ]),
      day("Lower B", "سفلي ب", 3, [hinge(), lunge(), press(), core()]),
      day("Lower C", "سفلي ج", 5, [
        exercise("Leg_Press"),
        bridge(),
        shoulder(),
        exercise("Standing_Calf_Raises", 3, "12–15", 60),
      ]),
    ],
  },
];
const portion = (seedNumber: number, grams: number) => ({
  foodId: `kochivo-curated:eg-${seedNumber}`,
  grams,
});
const meal = (
  en: string,
  ar: string,
  portions: ReturnType<typeof portion>[],
) => ({ name: { en, ar }, portions });
export const nutritionStarters: NutritionStarter[] = [
  {
    id: "fat-loss",
    name: { en: "Fat loss example day", ar: "يوم مقترح لفقدان الدهون" },
    description: {
      en: "Example portions, not a personal calorie target. Adjust for the athlete, preferences and activity.",
      ar: "كميات مقترحة وليست هدف سعرات شخصي. عدّل حسب اللاعب وتفضيلاته ونشاطه.",
    },
    level: "beginner",
    daysPerWeek: 7,
    approved: false,
    meals: [
      meal("Breakfast", "فطار", [
        portion(21, 50),
        portion(29, 200),
        portion(42, 100),
      ]),
      meal("Lunch", "غداء", [
        portion(3, 150),
        portion(1, 150),
        portion(53, 150),
        portion(40, 10),
      ]),
      meal("Dinner", "عشاء", [
        portion(15, 200),
        portion(18, 70),
        portion(50, 150),
      ]),
      meal("Snack", "سناك", [
        portion(30, 200),
        portion(37, 20),
        portion(43, 150),
      ]),
    ],
  },
  {
    id: "maintenance",
    name: { en: "Maintenance example day", ar: "يوم مقترح لثبات الوزن" },
    description: {
      en: "A balanced starting point; adjust portions to observed weight trends, appetite and training.",
      ar: "بداية متوازنة؛ عدّل الكميات حسب تغيّر الوزن والشهية والتدريب.",
    },
    level: "beginner",
    daysPerWeek: 7,
    approved: false,
    meals: [
      meal("Breakfast", "فطار", [
        portion(21, 70),
        portion(32, 250),
        portion(42, 120),
        portion(35, 20),
      ]),
      meal("Lunch", "غداء", [
        portion(3, 180),
        portion(1, 250),
        portion(53, 150),
        portion(40, 15),
      ]),
      meal("Dinner", "عشاء", [
        portion(13, 200),
        portion(18, 100),
        portion(10, 100),
        portion(51, 150),
      ]),
      meal("Snack", "سناك", [
        portion(30, 200),
        portion(43, 180),
        portion(37, 25),
      ]),
    ],
  },
  {
    id: "lean-gain",
    name: { en: "Lean gain example day", ar: "يوم مقترح لزيادة عضلية" },
    description: {
      en: "Larger portions for review. Adjust gradually; calorie needs vary widely between athletes.",
      ar: "كميات أكبر للمراجعة. عدّل تدريجيًا؛ احتياجات السعرات تختلف كثيرًا بين اللاعبين.",
    },
    level: "intermediate",
    daysPerWeek: 7,
    approved: false,
    meals: [
      meal("Breakfast", "فطار", [
        portion(21, 90),
        portion(31, 300),
        portion(42, 150),
        portion(35, 25),
      ]),
      meal("Lunch", "غداء", [
        portion(3, 200),
        portion(1, 300),
        portion(53, 150),
        portion(40, 15),
      ]),
      meal("Dinner", "عشاء", [
        portion(9, 180),
        portion(23, 300),
        portion(18, 100),
        portion(50, 150),
      ]),
      meal("Snack", "سناك", [
        portion(30, 250),
        portion(37, 30),
        portion(43, 200),
      ]),
    ],
  },
  {
    id: "ramadan",
    name: { en: "Ramadan · suhoor / iftar", ar: "رمضان · سحور / إفطار" },
    description: {
      en: "Suhoor, iftar and an evening snack. Distribute fluids across non-fasting hours and adjust training timing individually.",
      ar: "سحور وإفطار وسناك مسائي. وزّع السوائل في ساعات الإفطار وعدّل موعد التمرين حسب اللاعب.",
    },
    level: "beginner",
    daysPerWeek: 7,
    approved: false,
    meals: [
      meal("Suhoor", "سحور", [
        portion(13, 200),
        portion(18, 100),
        portion(10, 100),
        portion(29, 200),
        portion(50, 150),
      ]),
      meal("Iftar", "إفطار", [
        portion(45, 40),
        portion(3, 180),
        portion(1, 250),
        portion(53, 150),
        portion(40, 15),
      ]),
      meal("Evening snack", "سناك مسائي", [
        portion(21, 50),
        portion(32, 250),
        portion(42, 120),
        portion(37, 25),
      ]),
    ],
  },
];
export function portionMacros(portion: { foodId: string; grams: number }) {
  const food = starterFoods.find((f) => f.id === portion.foodId);
  if (!food) throw Error(`Unknown starter food: ${portion.foodId}`);
  return calculateMacros(food, portion.grams);
}
export function nutritionStarterMacros(template: NutritionStarter) {
  return sumMacros(
    template.meals.flatMap((m) => m.portions.map(portionMacros)),
  );
}
export function starterQuickDraft(
  template: TrainingStarter,
  lang: "en" | "ar",
  now = new Date(),
): QuickDraft {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    name: template.name[lang],
    athlete_id: "",
    mode: "scheduled",
    duration_days: 28,
    starts_on: localPlanDate(now, zone),
    time_zone: zone,
    days: template.days.map((d) => ({
      key: crypto.randomUUID(),
      index: d.weekday,
      name: d.name[lang],
      // The atomic quick path already supports independent named exercises.
      // Global catalog UUIDs cannot be passed as coach-owned exercise IDs.
      exercises: d.exercises.map((item) => {
        const source = exercises.find((e) => e.id === item.exerciseId)!;
        return {
          key: crypto.randomUUID(),
          exercise: `custom:${lang === "ar" ? source.name_ar : source.name}`,
          sets: item.sets,
          reps: item.reps,
          restSeconds: item.restSeconds,
        };
      }),
    })),
  };
}
export function starterNutritionDraft(
  template: NutritionStarter,
  lang: "en" | "ar",
): { name: string; notes: string; meals: Meal[] } {
  return {
    name: template.name[lang],
    notes: template.description[lang],
    meals: template.meals.map((m) => ({
      id: crypto.randomUUID(),
      name: m.name[lang],
      alternatives: [],
      notes: "",
      foods: m.portions
        .map((p) => {
          const food = starterFoods.find((f) => f.id === p.foodId)!;
          return `${lang === "ar" ? food.name_ar : food.name}: ${p.grams} g`;
        })
        .join("\n"),
    })),
  };
}
