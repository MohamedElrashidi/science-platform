/** هل يحق للطالب (أو ولي أمره) رؤية نتيجة هذه المحاولة؟ تلقائي: فورًا. يدوي: بعد اعتماد المعلم. */
export const isReleased = (exam: any, attempt: any) => (exam?.release_mode ?? "auto") !== "manual" || !!attempt?.released_at;
