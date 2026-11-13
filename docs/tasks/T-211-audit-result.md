336 /c/Users/ALY/AppData/Local/Temp/claude/2b64e5fa05a10440/e5998d07-2996-4fa9-8f4b-e6f6dd03b922/scratchpad/t211-report.md
--- codex final report ---
## Done

Read-only audit completed. No files were created or edited.

Labels below are the exact default Egyptian Arabic (`ar`) strings. For icon-only controls, **“No visible label”** is followed by the translated accessible label. `{name}`, `{count}`, and similar placeholders represent runtime values.

Paths are relative to **`src/features/`**, except entries explicitly beginning with `src/ui/`. Routes omit the locale prefix. Multiple locations in one row identify separate instances of the same issue.

I checked the rendered primitives: `Button secondary` and `IconButton` have a background and border through `glass`; `Button ghost` is transparent until hover. Rounded corners and minimum height alone do not produce a visible pill.

**Captain home — `/captain`**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `dashboard/components/player-finder.tsx:51` | Legacy home | كل اللاعبين | Opens roster | Plain text; background appears only on hover | `secondary` |
| `dashboard/components/smart-alerts.tsx:41` | Legacy home alerts | جدّد / فكّره بالدفع / راجع / اديله برنامج | Opens the relevant next action | Standalone lime text without a surface | `secondary` |
| `dashboard/components/smart-alerts.tsx:47` | Legacy home alerts | اعرض {count} كمان | Expands alerts | Transparent `ghost`; no chevron | `secondary` |
| `dashboard/components/workspace-error.tsx:8` | Workspace home | جرّب تاني | Refreshes failed data | Plain ink text | `secondary` |
| `dashboard/home/home-side-cards.tsx:22` | Expiring subscriptions | Player name, followed by النهارده / بعد يوم / بعد يومين / بعد {n} أيام | Opens billing | Looks like a static name/date row | `secondary`, or add a clearly styled action within the row |

**Roster — `/captain/players`**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `roster/components/captain-account-menu.tsx:20,23` | Captain account menu | الإعدادات / الدفعات | Opens account destinations | Transparent rows; only hover changes their background | `secondary` |
| `roster/components/invite-content.tsx:44` | Invitation load failure | جرّب تاني | Reloads invitation data | Transparent `ghost` | `secondary` |
| `roster/components/invite-result.tsx:43` | Invitation result | انسخ اللينك | Copies invitation URL | Transparent `ghost` | `secondary` |
| `roster/components/invite-sheet.tsx:23` | Invitation sheet | No visible label; accessible: اقفل الدعوة | Closes sheet | Bare X through `ghost` | `icon-button` |
| `roster/components/radar-card.tsx:54,56` | Dropout radar | ابعتله | Opens WhatsApp; disabled without a phone | Text-only action, including its disabled version | `secondary` |
| `roster/components/radar-card.tsx:62` | Dropout radar | وريني الكل | Expands the radar list | Transparent `ghost`; no chevron | `secondary` |
| `roster/components/roster-row.tsx:43` | Legacy roster | Player name — runtime data | Opens player file | Plain bold name, lime only on hover | `link style` |
| `roster/components/roster-row.tsx:52,53,54` | Legacy roster actions | البرامج / الأكل / شوف كلاعب | Opens training, nutrition or preview | Standalone lime text actions | `secondary` |
| `roster/components/roster-row.tsx:59` | Legacy roster | No visible label; accessible: أرشفة {v0} | Archives player | Bare Archive icon through `ghost` | `icon-button` |
| `roster/v6/player-row.tsx:42` | Workspace roster menu | No visible label; accessible: اختيارات {name} | Opens player menu | Bare ellipsis; background only on hover | `icon-button` |
| `roster/v6/player-row.tsx:44,45` | Workspace roster menu | شوف كلاعب / أرشفة | Opens preview or archives player | Transparent menu actions | `secondary` |
| `roster/v6/roster.tsx:77` | Workspace roster error | جرّب تاني | Retries roster load | Rounded but transparent `ghost` | `secondary` |

**Player file — `/captain/players/[playerId]` and preview**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `captain-workspace/player-file/file-header.tsx:30` | File breadcrumb | اللاعبين ‹ | Returns to roster | Faint text without link styling | `link style` |
| `captain-workspace/player-file/file-header.tsx:38` | File header | كلّمه على واتساب | Opens WhatsApp | Small muted text | `secondary` |
| `captain-workspace/player-file/file-state.tsx:9` | File load failure | جرّب تاني | Reloads file route | Rounded transparent anchor | `secondary` |
| `captain-workspace/player-file/billing-entry.tsx:22` | Subscription dialog | No visible label; accessible: اقفل | Closes subscription dialog | Bare X through `ghost` | `icon-button` |
| `captain-workspace/player-file/checkin-list.tsx:26` | Check-in history | راجعها في المهام | Opens inbox | Standalone lime text action | `secondary` |
| `captain-workspace/components/workspace-header.tsx:19` | Older workspace breadcrumb | اللاعبين | Returns to roster | Muted text link | `link style` |
| `captain-workspace/components/workspace-header.tsx:25` | Older workspace navigation | ملف اللاعب / التمرين / التغذية / المتابعات / التقييمات | Changes workspace section | Only current item has a surface | `secondary` for inactive pills |
| `captain-workspace/components/workspace-state.tsx:13` | Workspace load failure | جرّب تاني | Reloads workspace | Muted transparent anchor | `secondary` |
| `player-profile/components/profile-screen.tsx:34` | Legacy player file | رجوع للاعبين | Returns to roster | Muted text and arrow | `link style` |
| `player-profile/components/plan-tab.tsx:49` | Legacy plan tab | شوف زي اللاعب | Opens player preview | Eye and label; transparent until hover | `secondary` |
| `player-profile/components/checkins-tab.tsx:33` | Legacy check-ins | راجعها في المهام | Opens inbox | Standalone lime text action | `secondary` |
| `player-preview/components/preview-screen.tsx:42` | Player preview | النهارده / البرنامج / الأكل / الأسبوع | Changes preview section | Inactive buttons are plain muted text; group has only a bottom divider | `secondary`, using a surfaced segmented group |
| `player-preview/components/preview-screen.tsx:47` | Preview error | جرّب تاني | Refreshes preview | Bare lime text button | `secondary` |

**Training — library and generator**

Training-editor exclusions are explained under Notes for reviewer. These findings concern the separate library and generator controls.

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `templates/components/library-view.tsx:39` | Training/nutrition library | جرّب تاني | Reloads library | Transparent `ghost` | `secondary` |
| `templates/components/library-view.tsx:43` | Training library tools | أدوات | Expands tools | Flex section header without a chevron | `keep`, add chevron |
| `templates/components/library-menu.tsx:17,18,19` | Library item menu | معاينة / ادّيه للاعب / اعمل نسخة | Previews, assigns or copies template | Plain text menu buttons | `secondary` |
| `templates/components/library-menu.tsx:21,25,26` | Library item menu | غيّر اسم {v0} / أرشف / رجّع / امسح {v0} | Renames, archives, restores or deletes template | Plain text; delete uses danger text alone | `secondary` |
| `templates/components/assign-sheet.tsx:46,72` | Assignment sheet | جرّب تاني / إلغاء | Retries player load or closes sheet | Transparent `ghost` | `secondary` |
| `templates/components/preview-sheet.tsx:42,64` | Template preview | جرّب تاني / اقفل | Reloads preview or closes it | Transparent `ghost` | `secondary` |
| `templates/components/save-template-button.tsx:29,35` | Save as template | احفظ كقالب / جرّب تاني | Saves template or retries save | Transparent `ghost` | `secondary` |
| `templates/components/template-card.tsx:28,30` | Legacy library card | معاينة / اعمل نسخة | Previews or copies template | Icon and text through transparent `ghost` | `secondary` |
| `templates/components/template-card.tsx:32` | Legacy library card | عدّل القالب | Opens template editor | Plain text link | `secondary` |
| `templates/components/template-card.tsx:33,37` | Legacy library card | No visible labels; accessible: غيّر اسم {v0} / امسح {v0} | Renames or deletes template | Bare Pencil/Trash icons through `ghost` | `icon-button` |
| `templates/components/template-section.tsx:30` | Legacy library failure | جرّب تاني | Reloads templates | Transparent `ghost` | `secondary` |
| `templates/components/template-section.tsx:33` | Legacy empty library | انسخ قالب جاهز | Jumps to starter templates | Muted transparent anchor | `secondary` |
| `program-generator/components/brief-sheet.tsx:52` | Generator brief | إغلاق | Closes generator | Transparent `ghost` | `secondary` |
| `program-generator/components/generate-button.tsx:77,84,112` | Generator states | إغلاق | Closes generator | Transparent `ghost` | `secondary` |
| `program-generator/components/generate-button.tsx:103` | Regeneration confirmation | إلغاء | Cancels regeneration | Transparent `ghost` | `secondary` |
| `program-generator/components/generate-button.tsx:110,111` | Generated program | عدّل في محرر البرامج / غيّر التفاصيل | Opens editor or returns to brief | Transparent `ghost` | `secondary` |
| `program-generator/components/generated-exercise.tsx:25` | Generated exercise | Exercise name and prescription — runtime data | Opens exercise details | Text inside a glass article; button has no independent surface or disclosure cue | `secondary`, or add an explicit details control |
| `program-generator/components/swap-sheet.tsx:30` | Exercise replacement | إغلاق | Closes alternatives | Transparent `ghost` | `secondary` |

**Nutrition — captain plans, food library and supplements**

| File:line | Screen or route | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `meal-plans/components/calculator-content.tsx:26` | Player nutrition calculator | جرّب تاني | Reloads calculator | Plain anchor | `secondary` |
| `meal-plans/components/nutrition-workspace-entry.tsx:15` | Nutrition workspace | خطة الأكل | Returns to plan | Muted text link | `link style` |
| `meal-plans/components/nutrition-workspace-entry.tsx:22` | Nutrition load failure | جرّب تاني | Reloads workspace | Plain anchor | `secondary` |
| `meal-plans/components/plan-builder.tsx:25` | Legacy plan builder | الأنظمة الغذائية / قوالبي | Returns to plan list or templates | Muted text link | `link style` |
| `meal-plans/components/custom-food-sheet.tsx:66` | Custom food sheet | No visible label; accessible: اقفل | Closes sheet | Bare X through `ghost` | `icon-button` |
| `meal-plans/components/food-picker.tsx:97,98` | Food picker | No visible labels; accessible: عدّل الأكلة / امسح الأكلة | Edits or deletes custom food | Bare Pencil/Trash icons through `ghost` | `icon-button` |
| `meal-plans/components/item-row.tsx:39,40,41` | Meal item | No visible labels; accessible: طلّع الأكلة / نزّل الأكلة / امسح الأكلة | Reorders or removes food | Bare icons through `ghost` | `icon-button` |
| `meal-plans/components/item-row.tsx:59` | Food alternatives | No visible label; accessible: امسح بديل {v0} | Removes alternative | Bare Trash icon through `ghost` | `icon-button` |
| `meal-plans/components/meal-editor.tsx:34,35,36` | Meal editor | No visible labels; accessible: طلّع الوجبة / نزّل الوجبة / امسح الوجبة | Reorders or removes meal | Bare icons through `ghost` | `icon-button` |
| `meal-plans/components/editor/food-search.tsx:36` | Workspace meal editor | + أكلة جديدة مش في المكتبة | Creates food | Small muted text | `secondary` |
| `meal-plans/components/editor/food-search.tsx:46` | Food search results | Arabic food name — runtime data | Adds selected food | Name-only row with top divider | `secondary`, preferably with an add icon |
| `meal-plans/components/editor/food-row.tsx:60` | Workspace meal item | No visible label; accessible: شيل {name} | Removes food | Bare faint X | `icon-button` |
| `meal-plans/components/editor/meal-card.tsx:34` | Workspace meal card | No visible label; accessible: تفاصيل الوجبة والبدائل | Opens meal details | Bare faint ellipsis | `icon-button` |
| `meal-plans/components/editor/player-editor.tsx:100` | Nutrition editor | ملاحظات تساعدك وتعديل الأهداف يدويًا | Expands additional controls | Flex header without chevron | `keep`, add chevron |
| `meal-plans/components/editor/player-editor.tsx:113` | Nutrition editor | المكتبة | Expands plan history/library | Flex header without chevron | `keep`, add chevron |
| `meal-plans/components/editor/player-editor.tsx:115` | Plan history | Plan title and status — runtime title | Opens plan | Plain title/status link | `link style` |
| `meal-plans/components/editor/player-editor.tsx:117` | Nutrition editor | المكتبة | Opens template library | Plain anchor | `secondary` |
| `meal-plans/components/foods-library-entry.tsx:49` | `/captain/library/foods` | جرّب تاني | Reloads foods | Bare lime text button | `secondary` |
| `meal-plans/components/foods-library-entry.tsx:52,53` | Food library pagination | أول صفحة / التالي | Changes page | Plain text buttons | `secondary` |
| `meal-plans/components/library/food-drawer.tsx:83` | Food drawer | No visible label; accessible: اقفل | Closes drawer | Bare X | `icon-button` |
| `meal-plans/components/library/food-drawer.tsx:109` | Custom food drawer | امسح الأكلة | Deletes food | Danger text only | `secondary`, with a visible destructive surface/border |
| `meal-plans/components/library/food-units.tsx:22` | Food units | No visible label; accessible: شيل الوحدة | Removes unit | Bare Trash icon | `icon-button` |
| `meal-plans/components/library/food-units.tsx:25` | Food units | ضيف وحدة | Adds unit | Lime text and Plus without a surface | `secondary` |
| `meal-plans/components/library/foods-table.tsx:20` | Food library table | Food name, plus أكلاتي / العامة | Opens food drawer | Looks like ordinary table content | `secondary`, or add an explicit open/edit action |
| `supplements/components/captain-supplements.tsx:47` | Player supplements | جرّب تاني | Reloads supplements | Plain text button | `secondary` |
| `supplements/components/captain-supplements.tsx:56,57` | Supplement row | عدّل / أرشف | Edits or archives supplement | Plain text buttons | `secondary` |
| `supplements/components/captain-supplements.tsx:58,59` | Supplement row | No visible labels; accessible: طلّع لفوق / نزّل لتحت | Reorders supplement | Bare arrow icons | `icon-button` |
| `supplements/components/supplement-editor.tsx:42` | Supplement editor | إلغاء | Cancels editing | Plain text button | `secondary` |

The search submit control at `meal-plans/components/foods-library-entry.tsx:45` is **keep**: although its icon is faint, it sits inside the explicitly bordered, rounded search form and has a translated accessible label.

**Assessments — `/captain/library/forms`, player assessments and older forms workspace**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `forms/components/assessment-library-list.tsx:48` | Assessment library | No visible label; accessible: اختيارات التقييم | Opens assessment menu | Bare ellipsis | `icon-button` |
| `forms/components/assessment-library-list.tsx:50,51` | Assessment menu | تعديل / المواعيد واللاعبين | Opens editor or schedules | Plain text links | `secondary` |
| `forms/components/assessment-panel.tsx:37` | Assessment schedule | No visible label; accessible: تعديل | Opens schedule actions | Bare ellipsis | `icon-button` |
| `forms/components/assessment-panel.tsx:39,40,41` | Schedule actions | تعديل / وقّف مؤقتًا / شغّل تاني / احذف | Edits, pauses, resumes or deletes schedule | Transparent `ghost` | `secondary` |
| `forms/components/assessment-workspace.tsx:55,62` | Assessment failures | جرّب تاني | Reloads assessments | Plain text buttons | `secondary` |
| `forms/components/form-builder.tsx:41` | Assessment builder | التقييمات | Returns to library | Faint breadcrumb | `link style` |
| `forms/components/form-builder.tsx:48` | Assessment builder | سيب التعديلات | Discards invalid/failed edits | Plain text button | `secondary` |
| `forms/components/form-builder.tsx:61` | Assessment builder | سؤال جديد | Adds question | Inherits faint text; Plus and label have no own surface | `secondary` |
| `forms/components/question-rules.tsx:29` | Question options | احذف الاختيار {number} | Removes choice | Danger text only | `secondary` |
| `forms/components/question-editor.tsx:35` | English question text | + اكتب السؤال بالإنجليزي (اختياري، للاعيبة اللي لغتهم إنجليزي) | Expands English field | Explicitly hides native marker; supplies no chevron | `keep`, add chevron |
| `forms/components/schedule-editor.tsx:25` | Existing schedules | المواعيد واللاعبين | Opens schedule management | Plain text button | `secondary` |
| `forms/components/forms-library-page.tsx:30` | Library error | جرّب تاني | Reloads route | Plain text link | `secondary` |
| `forms/components/library-list.tsx:20` | Library selection | اقفل | Clears selected assessment | Plain text link | `secondary` |
| `forms/components/request-manager.tsx:40,51` | Assessment requests | جرّب تاني | Reloads requests | Bare lime text buttons | `secondary` |
| `forms/components/request-manager.tsx:53` | Pending request | فكّره / اتعمل تذكير | Sends reminder | Lime text; muted when disabled | `secondary` |
| `forms/components/request-picker.tsx:37` | Request picker | إلغاء | Cancels request selection | Plain text button | `secondary` |
| `forms/components/request-review.tsx:42` | Assessment response | صورة التقييم | Signs/loads photo | Bare lime text button | `secondary` |
| `captain-workspace/forms/form-photos.tsx:37` | Older response photos | جرّب تاني | Reloads photos | Plain text button | `secondary` |
| `captain-workspace/forms/forms-state.tsx:11` | Older forms failure | جرّب تاني | Reloads forms | Plain ink text | `secondary` |
| `captain-workspace/forms/forms-timeline.tsx:21` | Older forms timeline | فكّره | Future reminder action, currently disabled | Muted transparent button | `secondary` |

**Follow-up — `/captain/inbox`, team ranking and KO**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `inbox/components/checkin-detail.tsx:43` | Legacy check-in photos | جرّب تاني | Reloads media | Plain text button | `secondary` |
| `inbox/components/form-check-detail.tsx:15` | Legacy form video | جرّب تاني | Reloads video | Plain text button | `secondary` |
| `inbox/components/inbox-screen.tsx:171` | Legacy inbox failure | جرّب تاني | Reloads inbox | Plain ink text | `secondary` |
| `inbox/components/inbox-screen.tsx:186` | Legacy inbox detail | No visible label; accessible: اقفل التفاصيل | Closes detail | Bare X | `icon-button` |
| `inbox/components/workspace-assessment.tsx:34` | Assessment photos | جرّب تاني | Reloads photos | Plain text button | `secondary` |
| `inbox/components/workspace-checkin.tsx:27` | Check-in photos | جرّب تاني | Reloads photos | Plain text button | `secondary` |
| `inbox/components/workspace-detail.tsx:34` | Mobile follow-up detail | No visible label; accessible: ارجع للمتابعة | Returns to list | Bare arrow | `icon-button` |
| `inbox/components/workspace-detail.tsx:42` | Detail failure | جرّب تاني | Refreshes detail | Plain text button | `secondary` |
| `inbox/components/workspace-screen.tsx:101` | Workspace inbox failure | جرّب تاني | Reloads inbox | Plain text button | `secondary` |
| `captain-workspace/queue/queue-state.tsx:8` | Older requests queue | جرّب تاني | Reloads queue | Lime text with invisible rounded shape | `secondary` |
| `captain-workspace/queue/review-dialog.tsx:46` | Queue review | No visible label; accessible: اقفل المراجعة | Closes review | Bare X | `icon-button` |
| `voice-notes/components/voice-recorder.tsx:46` | Recorded reply | امسح | Discards recording | Trash and text through transparent `ghost` | `secondary` |
| `rank-review/components/crown-prize-editor.tsx:37` | `/captain/leaderboard` prize editor | إلغاء | Cancels prize edit | Rounded transparent button | `secondary` |
| `rank-review/components/crown-prize-editor.tsx:42` | Team prize | عدّل الجايزة / حط جايزة للتاج الشهر ده | Opens prize editor | Lime text without surface | `secondary` |
| `rank-review/components/leaderboard-screen.tsx:26` | Empty leaderboard month | الشهر اللي جاي | Advances month | Lime text without surface | `secondary` |
| `rank-review/components/month-switch.tsx:13,16` | Month navigation | No visible labels; accessible: الشهر اللي فات / الشهر اللي جاي | Changes month | Bare chevrons through `ghost` | `icon-button` |
| `ko-preview/components/feed-card.tsx:79` | KO feed | No visible label; accessible: فكّرني كمان 24 ساعة | Snoozes feed item | Bare muted X | `icon-button` |
| `ko-preview/components/ko-feed.tsx:19,29` | KO feed | حاول تاني / اعرض الكل | Reloads or expands feed | Bare lime text buttons | `secondary` |
| `ko-preview/components/ko-confirm.tsx:39` | KO confirmation | إلغاء | Cancels proposed action | Muted transparent button | `secondary` |
| `ko-preview/components/ko-chat.tsx:126` | KO account chat | No visible label; accessible: شيل سياق الصفحة | Removes context | Bare X | `icon-button` |
| `ko-preview/components/ko-chat.tsx:159,165` | KO attachments | No visible labels; accessible: امسح الصورة / امسح التسجيل | Removes attachment | Bare X icons | `icon-button` |
| `ko-preview/components/ko-panel.tsx:41,45` | KO panel | No visible labels; accessible: اقفل KO / شيل سياق الصفحة | Closes panel or removes context | Bare X icons; hover-only fill on close | `icon-button` |
| `ko-preview/components/ko-panel.tsx:50` | KO expression preview | No visible label; accessible: جرّب تعبير تاني لـKO | Cycles avatar expression | Clickable avatar without button surface | `secondary`, with a visible label |
| `ko-preview/components/ko-teaser-panel.tsx:35` | KO teaser | No visible label; accessible: اقفل KO | Closes teaser | Bare X; hover-only background | `icon-button` |
| `ko-preview/components/ko-teaser.tsx:41` | Teaser loading/error panel | No visible label; accessible: اقفل KO | Closes panel | Bare X | `icon-button` |
| `ko-preview/components/ko-widget.tsx:70` | Widget loading/error panel | No visible label; accessible: اقفل KO | Closes panel | Bare X | `icon-button` |

**Billing — `/captain/billing`, packages and offers**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `billing/choice/renewal-requests.tsx:24` | Renewal requests | جرّب تاني | Reloads requests | Plain text button | `secondary` |
| `billing/components/activate-sheet.tsx:35` | Activate subscription | No visible label; accessible: اقفل التجديد | Closes sheet | Bare X through `ghost`; accessible wording also mismatches activation | `icon-button` |
| `billing/components/collect-sheet.tsx:36` | Record payment | No visible label; accessible: اقفل | Closes sheet | Bare X through `ghost` | `icon-button` |
| `billing/components/packages-card.tsx:67` | Legacy packages | No visible label; accessible: شيل باقة {name} | Archives package | Bare X through `ghost` | `icon-button` |
| `billing/components/packages-card.tsx:82` | Legacy package editor | اقفل | Cancels package creation | Transparent `ghost` | `secondary` |
| `billing/components/payment-player-picker.tsx:19` | Payment player picker | Player name — runtime data | Selects payment recipient | Plain name row | `secondary` |
| `billing/components/plan-badge-error.tsx:10` | Plan badge failure | جرّب تاني — supplied by caller | Refreshes plan | Plain bold text | `secondary` |
| `billing/components/plan-card.tsx:33` | Legacy plan, support unavailable | رقّي باقتك | Disabled upgrade action | Transparent disabled `ghost` | `secondary` |
| `billing/components/plan-sidebar.tsx:20,23` | Captain sidebar plan summary | Tier/usage data; legacy branch also اشتراكي | Opens settings or billing | Looks like static account information | `link style`, or a visible secondary container |
| `billing/components/player-billing-row.tsx:119` | Legacy player billing | جدّد / جاري التجديد / فكّ التجميد الأول | Opens renewal | Transparent `ghost` | `secondary` |
| `billing/components/player-billing-row.tsx:121` | Legacy player billing | فكّره | Opens WhatsApp reminder | Transparent anchor; fill only on hover | `secondary` |
| `billing/components/renew-sheet.tsx:60` | Renewal sheet | No visible label; accessible: اقفل التجديد | Closes sheet | Bare X through `ghost` | `icon-button` |
| `billing/components/workspace-billing-row.tsx:49,51` | Workspace billing row | Player name — runtime data | Opens payment history | Static-looking row/name; outer clickable `div` also lacks button semantics | `secondary` for explicit history action |
| `billing/components/workspace-billing.tsx:68` | Billing details | تفاصيل | Expands details | Flex section header without chevron | `keep`, add chevron |
| `billing/components/workspace-packages.tsx:20` | Package summary | إدارة الباقات | Opens package management | Standalone lime text action | `secondary` |
| `billing/components/workspace-packages.tsx:22` | Package summary | Package name, price and ج.م — runtime data | Opens package management | Looks like static pricing information | `secondary` |
| `billing/offers/offer-screen.tsx:30` | Offer editor | باقاتي والعروض ‹ | Closes offer editor | Small faint text button | `link style` |
| `billing/offers/offers-card.tsx:29` | Offers | + عرض جديد | Creates offer | Plain text button | `secondary` |
| `billing/offers/offers-card.tsx:30` | Offer presets | بلاك فرايداي / رمضان / الصيف / رأس السنة | Starts offer from preset | Rounded but transparent text buttons | `secondary` |
| `billing/tiers/catalog-screen.tsx:47` | `/captain/billing/packages` | الدفعات ‹ | Returns to billing | Faint breadcrumb | `link style` |
| `billing/tiers/tier-card.tsx:23` | Tier menu | No visible label; accessible: اختيارات {name} | Opens tier menu | Bare faint ellipsis | `icon-button` |
| `billing/tiers/tier-card.tsx:25,26,27` | Tier menu | غيّر الاسم / عدّل المميزات / خلّيها الأكثر طلبًا / شيل الأكثر طلبًا | Edits or features tier | Plain menu rows; hover-only background | `secondary` |
| `billing/tiers/tier-card.tsx:28,29,30` | Tier menu | طلّع لفوق / نزّل لتحت / أرشف الفئة | Reorders or archives tier | Plain menu rows | `secondary` |
| `billing/tiers/tier-card.tsx:40` | Tier durations | شهر / {n} شهور / {n} يوم, or package name; price follows | Opens package editor | Looks like static duration/price row | `secondary` |
| `billing/tiers/tier-card.tsx:47` | Tier footer | + مدة | Adds package duration | Plain footer text button | `secondary` |
| `billing/tiers/unassigned-packages.tsx:12` | Unassigned packages | Package name + عدّل الباقة | Opens package editor | Plain name/edit row | `secondary` |

**Settings — captain and player**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `settings/components/captain-profile-card.tsx:69` | Captain profile editor | إلغاء | Resets profile edits | Transparent `ghost` | `secondary` |
| `settings/components/captain-settings.tsx:55` | Captain account settings | اختيارات إضافية | Opens extra settings | Muted transparent `ghost` | `secondary` |
| `settings/components/delete-account-card.tsx:46` | Account deletion | امسح الحساب / الغي طلب المسح / بننفّذ الطلب... | Requests or cancels deletion | Danger text on transparent `ghost` | `secondary`, with destructive treatment where appropriate |
| `settings/components/export-card.tsx:34` | Data export | نزّل بياناتك / بنجهّز بياناتك... | Downloads account export | Transparent `ghost` | `secondary` |
| `settings/components/settings-screen.tsx:85` | Legacy player settings | رجوع للرئيسية | Returns home | Muted link | `link style` |
| `settings/components/settings-screen.tsx:92` | Legacy language choices | العربية / English | Changes language | Inactive choice has no border/background; group itself is unsurfaced | `secondary`, using a surfaced segmented group |
| `settings/components/player-account.tsx:25` | Player profile disclosure | Player name and captain/subscription text — runtime data | Expands profile form | Flex summary with no disclosure indicator | `keep`, add chevron |
| `notifications/components/notification-dropdown.tsx:41,47` | Notification panel | علّم الكل كمقروء | Marks notifications read | Faint text in workspace version; bare lime text in legacy version | `secondary` |
| `notifications/components/notification-dropdown.tsx:43` | Notification panel | No visible label; accessible: اقفل الإشعارات | Closes panel | Bare X | `icon-button` |
| `notifications/components/notification-dropdown.tsx:52` | Notification failure | جرّب تاني | Reloads notifications | Bare lime text button | `secondary` |
| `notifications/push/components/push-toggle-card.tsx:75` | Push settings failure | جرّب تاني | Retries setup/status | Bare lime text button | `secondary` |
| `install/components/install-button.tsx:22` | Settings installation control | تنزيل التطبيق / جاري التثبيت | Opens installation flow | Download icon and label through transparent `ghost` | `secondary` |
| `install/components/install-button.tsx:31` | iPhone instructions | اقفل | Closes instructions | Transparent `ghost` | `secondary` |
| `install/components/install-sheet.tsx:35` | Installation prompt | مش دلوقتي | Dismisses prompt | Transparent `ghost` | `secondary` |
| `feedback/components/feedback-sheet.tsx:47` | Report sheet | اقفل | Closes report | Transparent `ghost` | `secondary` |

**Public pages — marketing, authentication, demo and admin**

| File:line | Screen or route | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `marketing/components/site-menu.tsx:44` | Public mobile header | No visible label; accessible: افتح القائمة / اقفل القائمة | Toggles navigation | Bare menu/X icon through `marketing-ghost` | `icon-button` |
| `marketing/components/site-header.tsx:25,31` | Public header | دخول | Opens login | `marketing-ghost`; no persistent surface | `secondary` |
| `marketing/components/site-footer.tsx:10` | Public footer | واتساب الدعم | Opens support | Transparent `marketing-ghost` text | `secondary` |
| `marketing/components/hero.tsx:25` | Public hero | لاعب ومعاك دعوة؟ | Expands invitation help | Flex summary without chevron | `keep`, add chevron |
| `auth/components/coach-signup.tsx:45` | `/login` signup flow | حساب جديد / دخول | Switches account flow | Transparent `ghost` | `secondary` |
| `auth/components/player-invite-flow.tsx:55` | `/i/[code]` | غيّر الإيميل أو ابعت تاني | Resets email/code step | Transparent `ghost` | `secondary` |
| `auth/components/resend-code-button.tsx:21` | Verification step | ابعت الكود تاني / ابعت تاني بعد ثانية / ابعت تاني بعد ثانيتين / ابعت تاني بعد {n} ثواني / ابعت تاني بعد {n} ثانية | Resends verification code | Transparent `ghost`, including countdown state | `secondary` |
| `demo/components/demo-screen.tsx:54` | `/demo` failure | جرّب تاني | Resets failed demo attempt | Transparent `ghost` | `secondary` |
| `coach-page/components/join-requests-list.tsx:39` | Captain join requests | ارفض | Declines join request | Transparent `ghost` | `secondary` |
| `admin/components/activate-panel.tsx:38` | `/admin` activation | إلغاء | Closes activation panel | Transparent `ghost` | `secondary` |
| `admin/components/admin-screen.tsx:117,119` | Admin pagination | السابق / التالي | Changes page | Transparent `ghost` | `secondary` |
| `admin/components/captain-requests.tsx:47,68` | Captain applications | جرّب تاني / إلغاء | Reloads applications or cancels rejection | Transparent `ghost` | `secondary` |
| `admin/components/captains-table.tsx:30` | Captains table | رجّع / وقّف | Opens account restoration/suspension | Transparent `ghost` | `secondary` |
| `admin/components/suspend-dialog.tsx:43` | Account suspension dialog | إلغاء | Closes dialog | Transparent `ghost` | `secondary` |
| `admin/components/ko-waitlist-count.tsx:37` | KO waitlist failure | جرّب تاني | Reloads count | Underlined button used as a standalone retry action | `secondary` |

**Player app**

| File:line | Screen or route | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `player-shell/components/player-shell.tsx:64` | Player app header | No visible label; accessible: حسابي / الإعدادات | Opens account settings | Bare muted icon when inactive | `icon-button` |
| `player-shell/components/captain-screen.tsx:83` | `/player/captain` | ملف الكابتن | Expands captain profile | Flex summary without chevron | `keep`, add chevron |
| `player-home/components/streak-sheet.tsx:27` | Streak details | No visible label; accessible: اقفل تفاصيل السلسلة | Closes streak sheet | Rounded but bare X | `icon-button` |
| `player-home/components/week-strip.tsx:36,37,42,43` | Player calendar | No visible labels; accessible: الأسبوع ده / الأسبوع الجاي | Changes displayed week | Bare chevrons | `icon-button` |
| `player-home/components/week-strip.tsx:25,45` | Player calendar days | Localized weekday; second layout also date number | Selects day | Most unselected days have no visible control surface | `secondary`, retaining calendar layout |
| `player-home/components/week-strip.tsx:34` | Compact calendar | الأسبوع ده / الأسبوع الجاي | Expands calendar | Flex summary without chevron | `keep`, add chevron |
| `player-home/components/home-screen.tsx:105` → `src/ui/empty-state.tsx:37` | Program being prepared | ابعت للكابتن | Opens captain page | Secondary action renders as transparent text | `secondary` |
| `onboarding/components/intake-v6.tsx:60` | `/player/onboarding` | تخطّى | Skips optional question | Plain text button | `secondary` |
| `onboarding/components/intake-v6.tsx:71`; `onboarding/components/intake-wizard.tsx:131` | Onboarding questions | رجوع | Goes to previous step | Transparent `ghost` | `secondary` |
| `forms/components/answer-flow.tsx:74` | `/player/forms/[requestId]` | No visible label; accessible: اقفل | Leaves assessment | Bare X link | `icon-button` |
| `forms/components/answer-flow.tsx:95` | Legacy assessment flow | السابق | Goes to previous question | Plain text button in legacy branch; workspace branch is already bordered | `secondary` for legacy branch |
| `forms/components/pending-forms.tsx:20,23` | Pending assessments | جرّب تاني | Reloads requests | Bare lime text buttons | `secondary` |
| `nutrition/components/day-type.tsx:19` | `/player/nutrition` | مش قادرين نحمّل نوع اليوم. جرّب تاني | Retries day-type lookup | Small muted sentence used as button | `secondary` |
| `nutrition/components/nutrition-screen.tsx:35` | Nutrition failure | جرّب تاني | Reloads nutrition | Transparent `ghost` | `secondary` |
| `nutrition/components/meal-card.tsx:56` | Meal details | بدّل | Cycles food alternative | Transparent `ghost` | `secondary` |
| `nutrition/components/meal-card.tsx:62` | Completed meal details | كلت الوجبة | Toggles meal completion | Changes to transparent `ghost` after completion | `secondary` for completed state |
| `nutrition/components/meal-card.tsx:85` | Workspace meal | تفاصيل الوجبة والبدائل | Expands full meal controls | Flex summary without chevron | `keep`, add chevron |
| `supplements/components/player-supplements.tsx:49,62,76` | Player supplements failures | جرّب تاني | Reloads supplement state | Plain or bare lime text buttons | `secondary` |
| `readiness/components/readiness-row.tsx:24` | Morning readiness | عدّل | Opens readiness questions | Plain muted text button | `secondary` |
| `progress/components/checkin-sheet.tsx:81` | Weekly update sheet | No visible label; accessible: اقفل التحديث | Closes sheet | Bare X through `ghost` | `icon-button` |
| `progress/components/checkin-sheet.tsx:107` | Check-in photo | No visible label; accessible: امسح صورة قدام / امسح صورة جنب / امسح صورة ضهر | Removes selected photo | Bare X through `ghost` | `icon-button` |
| `progress/components/line-chart.tsx:53` | `/player/progress` | اعرض جدول القياسات / اقفل جدول القياسات | Toggles measurements table | Transparent `ghost`, no chevron | `secondary`, or disclosure row with chevron |
| `progress/components/progress-gallery.tsx:34` | Progress photos | قارن | Toggles photo comparison | Transparent `ghost` | `secondary` |
| `body-scans/components/scan-section.tsx:84` | InBody history | امسح الفحص | Deletes scan | Muted transparent `ghost` | `secondary`, with destructive treatment |
| `body-scans/components/scan-sheet.tsx:48` | InBody upload | No visible label; accessible: اقفل | Closes upload | Bare X through `ghost` | `icon-button` |
| `workout/components/exercise-alternatives.tsx:25` | `/player/workout/[dayId]` | التمرين الأساسي | Restores original exercise | Small muted text button | `secondary` |
| `workout/components/exercise-alternatives.tsx:17` | Workout alternatives | بدّل التمرين | Expands alternatives | Flex summary without chevron | `keep`, add chevron |
| `workout/components/form-check-button.tsx:75` | Workout form video | صوّر الفورم | Opens video file/camera picker | Video icon and text through transparent `ghost` | `secondary` |
| `workout/components/form-check-button.tsx:92` | Form-video sheet | كمّل التمرين | Closes sheet | Transparent `ghost` | `secondary` |
| `workout/components/pr-burst.tsx:25` | New-record celebration | رقم جديد!, plus previous/current values | Dismisses celebration | Looks like celebratory information; no dismiss surface | `secondary`, or separate `icon-button` |
| `workout/components/warmup-workout.tsx:45` | Warm-up | تخطّي التسخين | Skips warm-up | Muted transparent text button | `secondary` |
| `workout/components/focus-screen.tsx:99,100` | Workout footer navigation | الحركات / السجل | Jumps to exercises or history | Muted links without link styling | `link style` |
| `workout/components/focus-screen.tsx:101` | Exercise list | الحركات | Expands exercise list | Flex summary without chevron | `keep`, add chevron |
| `workout/components/workout-exercise.tsx:36` | Additional gym controls | التحكم | Expands steppers/done control | Flex summary without chevron | `keep`, add chevron |

**Shared UI controls**

| File:line | Screen | Visible Arabic label | What it does | Current look | Proposed fix |
|---|---|---|---|---|---|
| `src/ui/in-app-browser-warning.tsx:25` | In-app browser warning | انسخ الرابط | Copies current URL | Bare lime text button | `secondary` |
| `src/ui/in-app-browser-warning.tsx:30` | In-app browser warning | No visible label; accessible: اقفل الإشعار | Dismisses warning | Bare muted X | `icon-button` |
| `src/ui/language-switch.tsx:22` | Shared language selector | العربية / عربي مصري / عربي فصحى / English, according to enabled options | Changes language/style | Unselected or compact choices have no persistent surface | `secondary`, using a surfaced segmented group |
| `src/ui/save-status.tsx:14` | Autosave failure | جرّب تاني | Retries save | Rounded transparent `ghost` | `secondary` |
| `src/ui/sync-pill.tsx:28` | Sync attention state | جرّب تاني | Retries sync | Bare lime text inside status pill | `secondary` |
| `src/ui/theme-switch.tsx:41` | Theme selection | No visible label; accessible: شكل التطبيق: {current}، غيّر لـ{next} | Cycles theme | Bare icon through `marketing-ghost` | `icon-button` |
| `src/ui/toast.tsx:95` | Toasts | No visible label; accessible: اقفل الإشعار | Dismisses toast | Bare muted X | `icon-button` |
| `src/ui/tour.tsx:104,105` | Product tour | تخطّي الجولة / ارجع | Skips tour or goes back | Muted/plain transparent buttons | `secondary` |
| `src/ui/empty-state.tsx:37,38` | Shared secondary empty-state action | Caller-provided label; current feature use: ابعت للكابتن | Runs secondary action | Both anchor and button branches are transparent | `secondary` |

**Screens with more than one primary action**

These are simultaneous rendered cases, rather than mutually exclusive branches:

| Screen | Competing lime actions |
|---|---|
| Public marketing `/` | Header **ابدأ مجاناً** (`marketing/components/site-header.tsx:27`), hero **ابدأ مجاناً · لحد 5 لاعبين** (`hero.tsx:21`), featured pricing **اشترك** (`pricing.tsx:20`), final **اعمل حسابك كابتن** (`final-cta.tsx:12`). |
| `/c/[slug]`, when `requested === 'member'` and featured pricing exists | **افتح التطبيق** (`coach-page/components/coach-page.tsx:39`) and the featured **اختار…** package action (`billing/choice/pricing-cards.tsx:57`). |
| `/admin`, with multiple pending captain applications | Each application renders a primary approval button (`admin/components/captain-requests.tsx:58`). |
| `/player/nutrition`, with multiple uneaten meals | Each meal renders primary **كلت الوجبة** inside its full details (`nutrition/components/meal-card.tsx:62`). In workspace mode, opening details also exposes this beside the meal’s lime completion control. |
| `/player/workout/[dayId]`, with completed sets | Completed-set edit buttons and the active-set completion button share filled lime styling (`workout/components/set-rows.tsx:56`). Expanding **التحكم** additionally exposes primary **تمت المجموعة** (`set-controls.tsx:35`). |
| KO chat with multiple actionable feed cards | Multiple **وافق** feed actions (`ko-preview/components/feed-card.tsx:86`) can coexist with the lime chat-send control (`ko-chat.tsx:178`). |
| Captain home, when join-request content is opened | The primary invitation control remains present while join-request content can expose additional actions; those request actions should remain secondary. |

Selected chips, selected tabs, progress indicators, badges and media-play controls were not counted as separate primary CTAs merely because they use lime.

**Shared fixes worth making once**

- Reuse the existing `Button variant="secondary"` and `IconButton`; the necessary primitives already exist.
- Add shared secondary **link** styling so `Link` and `<a>` actions match secondary buttons.
- Add a shared disclosure header that consistently renders a chevron. Several `summary` elements use `flex`, losing the native marker without supplying a replacement.
- Standardize action-menu rows with a persistent surface/border treatment.
- Surface the shared language selector as a segmented group. Existing `Segmented`, bordered `Chip`, profile-tab groups and marketing-preview groups already demonstrate this approach.
- Fix `EmptyState.secondary` centrally.
- Reserve filled lime for the screen’s main action; give completed set/meal controls and repeated approvals a secondary state treatment.

## Checks

- `npm run check`: not run; this was a read-only source audit.
- `npm run build`: not run; builds generate files and conflict with the read-only instruction.
- Inspected JSX, primitive variants, surface CSS, translated labels and relevant composition/conditional rendering.

## Notes for reviewer

- No T-210 card exists in this checkout. I treated `captain-workspace/training/` and the editor components in `programs/components/` as excluded. Their findings are not included above.
- Both workspace-enabled and legacy feature branches are covered.
- Runtime player, food, package and exercise names cannot have an exact fixed label from `messages.ts`; those rows explicitly identify their data source.
- Kept surfaced segmented groups, bordered chips, switches with visible tracks, image links, clearly bounded clickable cards and disclosure headers that retain an indicator. The public footer’s **© Gym visual** credit remains untouched.
- This is a source-based audit; no browser rendering or measured contrast assessment was performed.
--- end report ---
