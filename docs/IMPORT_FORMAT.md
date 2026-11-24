# صيغة استيراد الامتحانات (JSON)

ملف واحد لكل امتحان (أو `{"exams":[...]}` لأكثر من امتحان). مثال كامل: `examples/exam-sample.json`.

## الامتحان
| الحقل | مطلوب | ملاحظات |
|---|---|---|
| `title` | نعم | عنوان فريد (التكرار لا يُستورد) |
| `questions` | نعم | حتى 200 سؤال |
| `kind` | لا | exam, quiz, homework, worksheet, activity, revision, final |
| `subject`, `lesson`, `grade_level` | لا | تُنشأ المادة والدرس إن لم يوجدا |
| `duration_minutes` | لا | بلا مدة إن غاب |
| `max_attempts` | لا | الافتراضي 1 |
| `shuffle_questions`, `shuffle_options` | لا | الافتراضي false |
| `show_answers`, `show_score`, `practice_mode` | لا | الافتراضي true, true, false |

## الأسئلة (الحقول المشتركة: `type`, `prompt`, `marks`=1, `explanation`, `difficulty` easy/medium/hard, `image` رابط https)
| `type` | الحقول |
|---|---|
| `mcq` | `options`: نصوص، `correct`: أرقام تبدأ من 0 (أكثر من رقم = متعدد) |
| `tf` | `correct`: true / false |
| `fill` | `blanks`: لكل فراغ مصفوفة إجابات مقبولة، مثل `[["الشمس","ضوء الشمس"]]` |
| `short` | `accepted`: الإجابات المقبولة (فارغة = تصحيح يدوي) |
| `matching` | `pairs`: `[{"left":"","right":""}]` |
| `dragdrop` | `targets`: أسماء المجموعات، `items`: `[{"text":"","target":"اسم المجموعة"}]` |
| `ordering` | `items`: العناصر **بالترتيب الصحيح** (يخلطها الموقع للطالب) |
| `essay` | بلا إجابة صحيحة (تصحيح يدوي) |

## قواعد
- الأسئلة المستوردة تدخل «بانتظار الاعتماد»، ولا يُنشر الامتحان قبل اعتمادها.
- أي خطأ في سؤال يمنع استيراد الامتحان كله، ويُعرض رقم السؤال والسبب.
