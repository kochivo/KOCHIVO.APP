# KOCHIVO — معمارية المشروع

النسخة الجديدة مستقلة عن المشروع القديم. الملف ده هو المرجع لأي قرار تقني، وأي حاجة بتخالفه محتاجة تعديل هنا الأول.

## 1. المبادئ

1. **ملف = مسؤولية واحدة.** Component واحد في الملف، وحد أقصى 250 سطر. لو الملف كبر يتقسم.
2. **الـ features معزولة عن بعض.** كل feature ليها فولدر، وأي feature تانية تستورد منها عن طريق `index.ts` بتاعها بس.
3. **الـ routes رفيعة.** ملفات `src/app` بتركّب components من الـ features، ومفيهاش business logic.
4. **اللاعب Offline-first.** أي حاجة اللاعب بيسجلها بتتكتب على الجهاز الأول (IndexedDB) وبعدين تتبعت للسيرفر. الواجهة عمرها ما تستنى الشبكة.
5. **الأمان في الداتابيز.** RLS هي خط الدفاع الحقيقي، وأي check في الواجهة بيبقى للـ UX بس.
6. **مفيش ألوان hard-coded.** كل الألوان tokens جاية من الهوية (`src/app/globals.css`).
7. **عربي أولاً و RTL أصيل.** نستخدم logical properties (`ms-*` و`pe-*` و`start`/`end`) ومنستخدمش `left`/`right`.
8. **مفيش dependency جديدة من غير موافقة.** كل مكتبة بنضيفها بتبقى مسؤولية صيانة.

## 2. الـ Stack

| الطبقة | الاختيار | السبب |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict | SSR للكابتن، وPWA للاعب، وتتغلف بـ Capacitor بعدين |
| Styling | Tailwind CSS v4 + CSS tokens | RTL بالـ logical utilities، وتوكنز الهوية في مكان واحد |
| Backend | Supabase (Postgres + Auth + Storage + RLS) | |
| Offline | Dexie (IndexedDB) + Outbox + Service Worker مكتوب يدوي | بدون plugin بناء، فمفيش مشاكل مع Turbopack |
| Validation | Zod | نفس الـ schema للفورم وللبيانات الجاية من السيرفر |
| Tests | Vitest (logic) + Playwright (E2E) + PGlite (RLS) | |
| Icons | lucide-react | |

## 3. هيكل الفولدرات

```
KOCHIVO-REBRAND/
├─ AGENTS.md              قواعد إلزامية لأي agent (Codex) بيكتب كود
├─ brand/                 الهوية الأصلية (مرجع بس، التطبيق مبيستوردش منه)
├─ docs/
│  ├─ ARCHITECTURE.md     الملف ده
│  ├─ LEGACY-AUDIT.md     إيه اللي اتاخد من المشروع القديم وإيه اللي اترفض
│  ├─ PLAN.md             المراحل
│  └─ tasks/              كارت لكل مهمة (T-001 …) — هو اللي بيتبعت لـ Codex
├─ supabase/
│  ├─ migrations/         ملف لكل domain، بالترتيب
│  └─ seed/
├─ public/                manifest + sw.js + icons
├─ src/
│  ├─ app/                routes بس
│  │  ├─ (auth)/          login
│  │  ├─ (captain)/       لوحة الكابتن
│  │  └─ (player)/        واجهة اللاعب
│  ├─ core/               بنية تحتية، مبتعرفش حاجة عن الـ features
│  │  ├─ config/          env متحقق منه بـ Zod
│  │  ├─ supabase/        browser / server / proxy clients
│  │  ├─ offline/         IndexedDB + outbox + sync engine
│  │  ├─ i18n/            القواميس مقسّمة حسب الـ namespace
│  │  └─ pwa/             تسجيل الـ service worker
│  ├─ features/           كل feature: components/ data/ schemas.ts types.ts index.ts
│  │  ├─ auth/  clients/  programs/  workout/
│  │  └─ nutrition/  checkins/  inbox/  progress/
│  ├─ ui/                 primitives مشتركة (Button, Card, Stepper, Ring …)
│  ├─ lib/                دوال pure (حساب الماكروز، التواريخ، cn)
│  └─ types/database.ts   متولّد من Supabase
└─ tests/                 e2e + rls
```

**قاعدة الاستيراد:** `app → features → (ui, core, lib)`. الـ `core` والـ `ui` والـ `lib` مبيستوردوش من `features`، والـ feature مبتستوردش من feature تانية إلا من `index.ts` بتاعها.

## 4. نموذج البيانات (MVP)

```
profiles ─┬─< coach_clients >─┬─ profiles
 (captain)│  (اشتراك + حالة)   │  (player)
          │                    │
          ├─< programs ─< program_days ─< program_exercises >─ exercises
          │     (is_template / player_id)                      (global أو خاص بالكابتن)
          │                    │
          │                    └─ workout_sessions ─< set_logs     (بيكتبها اللاعب، offline)
          │
          ├─< nutrition_plans ─< meals ─< meal_items >─ foods
          │                              └─< meal_item_alternatives
          │                    └─ meal_logs                        (بيكتبها اللاعب، offline)
          │
          └─< check_ins / form_checks                             (صندوق المهام)
```

- **القالب والبرنامج نفس الجدول.** `is_template = true` معناه قالب مش مربوط بلاعب. تعيين القالب لمتدرب بيعمل نسخة كاملة منه عن طريق RPC `assign_program_template`، فتعديل القالب بعدين مبيأثرش على المتدربين.
- **السوبر سِت** هو `superset_group` على `program_exercises`. التمارين اللي ليها نفس الرقم في نفس اليوم بتتلعب ورا بعض.
- **RPE و Tempo** أعمدة nullable، وبتظهر في الواجهة بس لو `programs.settings.advanced = true`.
- **البدائل الغذائية** بتتحسب جراماتها وقت التصميم عشان تساوي سعرات الأكلة الأصلية، فاللاعب بيبدّل بضغطة واحدة من غير ما يحسب حاجة.

## 5. الصلاحيات (RLS)

| الدور | يقرأ | يكتب |
|---|---|---|
| الكابتن | متدربينه بس، وبرامجه وقوالبه، واللوجز بتاعة متدربينه | برامجه وقوالبه، وبيانات اشتراك متدربينه، والردود |
| اللاعب | برامجه المعيّنة له، **مش** القوالب | `set_logs` و`meal_logs` و`check_ins` و`form_checks` بتوعه بس |

**الاشتراك** في `coach_clients.access_until`:
- `now() <= access_until`: الوصول كامل.
- لحد `access_until + 3 أيام`: قراءة بس (فترة السماح).
- بعد كده المحتوى التدريبي بيتحجب، لكن اللوجز والصور بتفضل محفوظة وبيقدر يشوفها.

الدوال المساعدة اللي بتحسب الحالة دي `security definer` وبترجع boolean بس: `is_captain_of(player)` و`player_can_read(captain)` و`player_can_write(captain)`.

## 6. محرك الـ Offline

```
Player taps "تمّ السِت"
   │
   ▼
Dexie transaction ──► set_logs (local)  ──► liveQuery ──► UI يتحدث فوراً (Optimistic)
   │
   └──► outbox (table, row, attempts)
                │
   online / كل 30ث / فتح التطبيق
                ▼
        sync.flush()  ──► RPC sync_set_logs(rows)   (security invoker، فالـ RLS شغالة)
                │            on conflict (id) do update
                │            where existing.client_updated_at < new.client_updated_at
                ▼
        نجاح: نمسح من الـ outbox   |   فشل: backoff أُسّي (حد أقصى 5 دقايق)
```

- **الـ ID بيتحسب من البيانات نفسها** (`stableId` = SHA-256): الـ session بيتحسب من `(program_day_id, training_date)`، والسِت من `(session_id, program_exercise_id, set_index)`، والوجبة من `(meal_id, log_date)`. النتيجة إن نفس السِت بيبقى ليه نفس الـ ID على أي جهاز، وإعادة الإرسال مبتعملش نسخة مكررة.
- **التعارض بيتحل بآخر `client_updated_at`** زي ما الـ PRD طالب، وده جوه الـ RPC: `where existing.client_updated_at < new.client_updated_at`. القيد المعروف: لو ساعة الجهاز غلط، النتيجة ممكن تبقى غلط، ودي حالة نادرة ومقبولة في الـ MVP.
- **الاختبارات:** `src/core/offline/sync.test.ts` بيغطي الـ outbox والترتيب والـ backoff وإن التعديل اللي حصل والطلب لسه رايح ميضيعش. و`supabase/tests/rls.test.ts` بيغطي آخر-كتابة-تكسب على Postgres حقيقي.
- **الـ Service Worker** بيكاش الـ app shell والـ static assets بس. الداتا مكانها Dexie، مش الـ SW cache.

## 7. التخزين

- **الـ MVP:** Supabase Storage في buckets private بـ RLS (`checkin-photos` و`form-videos`)، والروابط signed.
- **بعدين:** Cloudflare R2. الكود بيتعامل مع التخزين من خلال interface واحد (`core/storage`)، فالتغيير هيبقى في ملف واحد.

## 8. خارج الـ MVP (مؤجّل عن قصد)

بوابات الدفع والعمولة، والـ White-label، واستيراد الإكسيل، والشات realtime (في الـ MVP بيبقى "رسالة للكابتن" جوه الـ check-in)، وتسجيل الدخول برقم الموبايل (الـ MVP: الكابتن بإيميل وكلمة سر أو Google، واللاعب بلينك دعوة وبعدين Google أو Email OTP)، والإشعارات Push، وCapacitor.

## 9. قيود معروفة

- **iOS Safari:** مفيش Vibration API، وعدّاد الراحة بيقف لما الشاشة تقفل. الحل في الـ MVP صوت وتنبيه مرئي، والحل الكامل لما نغلّف بـ Capacitor.
- **الـ Drag & Drop** معمول للديسكتوب والتابلت. على الموبايل بيبقى ترتيب بأزرار ↑↓.
