import { useTranslation } from "react-i18next";

interface ProfileStatusMessageProps {
    visible: boolean;
    error: string | null;
    success: boolean;
}

export function ProfileStatusMessage({ visible, error, success }: ProfileStatusMessageProps) {
    const { t } = useTranslation();
    if (!visible) return null;

    return (
        <div className="space-y-3 min-h-[70px]">
            {error && (
                <div className="w-full px-4 py-3 bg-white/85 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] text-[#1f2937]">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm min-[481px]:text-base font-medium">{t(error)}</span>
                    </div>
                </div>
            )}
            {success && !error && (
                <div className="w-full px-4 py-3 bg-white/85 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] text-[#1f2937]">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm min-[481px]:text-base font-medium">✓ {t("Success!")}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
