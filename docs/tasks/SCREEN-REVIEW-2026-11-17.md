# Logged-in screen review — kochivo.site, 2026-11-17 (evening)

**How:** the owner's captain account (Ali Esmail) on the live site, in the Claude app's browser, desktop size, plus the player view at 390px through «شوف زي اللاعب» (Youssef). View only: nothing was saved or sent. Real player pages behind a player's own login were not covered.

## A. Speed (the biggest problem)
| # | Where | What we saw |
|---|---|---|
| S-1 | Every captain page with data (players, programs, meal plans, forms, settings, player file, leaderboard) | The page frame appears in under 1 s, then it stays empty or skeleton for **10–20 s**. On the programs page the data requests only **started** at 11.7 s, while the requests themselves take 0.3–1 s. Something holds the data load back. The sidebar also prefetches every captain page again and again (24 page prefetches in one visit, hundreds of requests in the session). Settings took about 20 s. |

## B. Wrong or illogical numbers (logic)
| # | Where | What we saw |
|---|---|---|
| L-1 | Players list vs player file | The list shows the weight **75** for all 3 players. Youssef's file shows **66 (−9)**, so the list shows the starting weight, not the latest. |
| L-2 | Players filters | Two players show «غايب 13 أيام», yet «محتاجينك» shows **0**. The chips (ماشيين تمام 1 + جداد 1) do not add up to «الكل 3»; Hesham is in no group. |
| L-3 | Workout counts disagree | Youssef has «2 من 7 الأسبوع ده» and «آخر RPE 3» in his file, and the team chart shows workouts on Sunday and Monday, but the leaderboard shows «0 تمرين · 5 نقطة» for him. |
| L-4 | Home, KO card | In the evening it says «KO · ملخص الصبح». It also says «فريقك ماشي تمام» while weekly adherence is 13% and 0 of 3 players trained today. |
| L-5 | Billing, «دخل الشهر» | **Not a bug** (checked on live data): 300 + 500 + a 500 collection recorded a minute after Youssef's 0-amount renewal = 1,300. The real problem is L-7: his row ignores that collection. |
| L-6 | Billing, «كل الدفعات» | It shows 2 players, but there are 3 active subscriptions. Hesham has an active subscription (17 days left) with **no payment at all**, so he does not appear in the table. |
| L-7 | Billing rows | Youssef shows amount «0» with «InstaPay», and Alyy shows «من غير مبلغ». The same situation is written two ways, and a payment method shows on a payment of 0. |
| L-8 | Program and meal plan libraries | There is a leftover template named **«قالب جديد»** in both (1 day, and 2000 kcal). The auto-save seems to keep a template the captain opened and then left. |
| L-9 | Leaderboard | Players with 0 workouts and 0 points are ranked 2nd and 3rd on the podium. |

## C. Copy and units
| # | Where | What we saw |
|---|---|---|
| C-1 | Meal plans | Grams are written «150ج». In Egypt «ج» reads as **جنيه**, and billing on the next page uses جنيه. It should be «جم». |
| C-2 | Many places | Number grammar: «13 أيام», «1 أيام», «0 لاعبين عليه», «12 مجموعات», «لحد 5 لاعب». |
| C-3 | Player view banner | «ده عرض بس. أي تعديل من البرنامج أو النظام» is a cut-off sentence. |
| C-4 | Sets in the player file | «2.5 × 8 كجم» reads as 2.5 reps of 8 kg. It should be «2.5 كجم × 8». |
| C-5 | Forms | One assessment is titled «Weekly assessment» in English in the Arabic app. Check whether a template was copied in English. |
| C-6 | Billing | The page title is «الدفعات» but the menu says «الاشتراكات والدفعات», and that menu item wraps onto two lines. |

## D. Layout
| # | Where | What we saw |
|---|---|---|
| D-1 | Player captain screen (owner's screenshot) | The «جدد باقتك» button text is almost invisible, so it looks disabled. |
| D-2 | Player captain screen and captain sidebar | The KO «قريبًا» bubble and the report button sit over «ابعت إيصال الدفع» and over the bottom of the sidebar. |
| D-3 | Settings | «اللغة والوقت» and «اللغة والتوقيت» are two cards showing the same thing. «أسعار الأكل» is a lone card with only a button. |
| D-4 | Inbox | There are no date separators. Messages from Nov 4, 13 and 14 show only times (10:51, 23:40, 22:28, 23:15), so they look out of order. |
| D-5 | Player «النهارده» at 390px | «الخميس» breaks into «الخمي / س» in the week strip. «اليوم التالت» shows twice. Exercise media leaves a large empty block while loading. |
| D-6 | Programs list | The week letters «س ح ن ث ر خ ج» are hard to read. |
| D-7 | Billing | «المبالغ المستنية» shows a card «0 جنيه مستني من 0 لاعبين» **and** the text «مفيش مبالغ مستنية»: one empty state is enough. |
