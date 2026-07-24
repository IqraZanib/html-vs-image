'use strict';
// Locale-specific UI chrome labels (module-provided text, NOT lesson content).
// `en` is the fallback. sd/ar labels are machine-provided — recommend a
// native-speaker review before production use in those locales.
const LABELS = {
  en: {
    titles: { objectives: 'Objectives', materials: 'Resources & Support', introduction: 'Introduction', explore: 'Explore', explanation: 'Explanation & Teaching', guided_practice: 'Guided Practice', assessment: 'Assessment & Wrap-up', differentiation: 'Differentiation', generic: 'Section' },
    resources: 'Resources', targetWords: 'Target words', teacherNote: 'Teacher note', cfu: 'Check for understanding', struggling: 'For struggling students', advanced: 'For advanced students', exitTicket: 'Exit ticket', homework: 'Homework',
    chips: { id: 'ID', subject: 'Subject', grade: 'Grade', class: 'Class', time: 'Time', type: 'Type' }, minUnit: 'min',
  },
  ur: {
    titles: { objectives: 'مقاصد', materials: 'وسائل اور معاونت', introduction: 'تعارف', explore: 'دریافت', explanation: 'وضاحت اور تدریس', guided_practice: 'رہنمائی مشق', assessment: 'جانچ اور اختتام', differentiation: 'درجہ بندی', generic: 'حصہ' },
    resources: 'وسائل', targetWords: 'ہدف الفاظ', teacherNote: 'اُستاد کے لیے نوٹ', cfu: 'سمجھ کی جانچ', struggling: 'کمزور طلبہ کے لیے', advanced: 'ہونہار طلبہ کے لیے', exitTicket: 'اخراجی ٹکٹ', homework: 'ہوم ورک',
    chips: { id: 'نمبر', subject: 'مضمون', grade: 'جماعت', class: 'کلاس', time: 'دورانیہ', type: 'قسم' }, minUnit: 'منٹ',
  },
  sd: {
    titles: { objectives: 'مقصد', materials: 'وسيلا ۽ مدد', introduction: 'تعارف', explore: 'ڳولا', explanation: 'وضاحت ۽ سيکارڻ', guided_practice: 'رهنمائي مشق', assessment: 'جاچ ۽ پڄاڻي', differentiation: 'فرق سان سيکارڻ', generic: 'حصو' },
    resources: 'وسيلا', targetWords: 'خاص لفظ', teacherNote: 'استاد لاءِ نوٽ', cfu: 'سمجهه جي جانچ', struggling: 'ڪمزور شاگردن لاءِ', advanced: 'هوشيار شاگردن لاءِ', exitTicket: 'نڪرڻ وارو ٽڪيٽ', homework: 'گهر جو ڪم',
    chips: { id: 'نمبر', subject: 'مضمون', grade: 'درجو', class: 'ڪلاس', time: 'وقت', type: 'قسم' }, minUnit: 'منٽ',
  },
  ar: {
    titles: { objectives: 'الأهداف', materials: 'الموارد والدعم', introduction: 'المقدمة', explore: 'الاستكشاف', explanation: 'الشرح والتدريس', guided_practice: 'التدريب الموجّه', assessment: 'التقييم والخاتمة', differentiation: 'التمايز', generic: 'قسم' },
    resources: 'الموارد', targetWords: 'الكلمات المستهدفة', teacherNote: 'ملاحظة للمعلم', cfu: 'التحقق من الفهم', struggling: 'للطلاب المتعثرين', advanced: 'للطلاب المتقدمين', exitTicket: 'بطاقة الخروج', homework: 'الواجب المنزلي',
    chips: { id: 'رقم', subject: 'المادة', grade: 'الصف', class: 'الفصل', time: 'الوقت', type: 'النوع' }, minUnit: 'دقيقة',
  },
};
function resolveLabels(locale) { return LABELS[locale] || LABELS.en; }
module.exports = { resolveLabels, LABELS };
