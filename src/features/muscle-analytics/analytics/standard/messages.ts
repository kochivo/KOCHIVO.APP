export const arStd = {
  title: 'توزيع حمل التمرين', subtitle: 'عدد المجموعات لكل عضلة في آخر ٤ أسابيع', loading: 'جاري تحميل التحليل',
  error: 'تعذّر تحميل التحليل', retry: 'حاول مجدداً', empty: 'لم يسجّل اللاعب تمارين بعد',
  emptySelf: 'سجّل أول تمرين لعرض مقدار تدريب عضلاتك', emptyWeek: 'لا توجد تمارين هذا الأسبوع', week: 'الأسبوع {number}',
  weekRange: 'اختر أسبوعاً', weekDates: 'بداية الأسبوع {date}', push: 'دفع', pull: 'سحب', percent: '{value}٪',
  imbalance: 'يوجد عدم توازن بين الدفع والسحب', highLoad: 'حمل مرتفع على {muscle}', front: 'الأمام', back: 'الخلف',
  bodyLabel: '{view} — العضلات الأكثر تدريباً: {regions}', regionSets: '{muscle}: {sets} مجموعة', separator: '، ',
  noRegions: 'لا يوجد', legend: 'عدد المجموعات', heat0: '٠', heat1: '١–٣', heat4: '٤–٧', heat8: '٨–١٢', heat13: '١٣+',
  less: 'قليل', more: 'كثير', 'region.chest': 'الصدر', 'region.back': 'الظهر', 'region.shoulders': 'الكتف',
  'region.arms': 'الذراع', 'region.abs': 'البطن', 'region.legs': 'الساق',
} as const;
