import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const PrivacyPolicy = () => {
    const { t } = useTranslation();
    return (
        <div className="min-h-[100dvh] bg-[#f5f0e8] px-4 py-10 text-[#1f2937]">
            <div className="mx-auto w-full max-w-4xl rounded-2xl border-4 border-[#2b2b2b] bg-white/90 p-6 shadow-[8px_8px_0_#2b2b2b] min-[481px]:p-10">
                <p className="mb-4 text-sm uppercase tracking-[0.22em] text-[#4b5563]">{t('privacy.label')}</p>
                <h1 className="mb-6 text-3xl font-bold min-[481px]:text-5xl">{t('privacy.title')}</h1>
                <div className="space-y-5 text-sm leading-7 min-[481px]:text-base">
                    <p>{t('privacy.p1')}</p>
                    <p>{t('privacy.p2')}</p>
                    <p>{t('privacy.p3')}</p>
                    <p>{t('privacy.p4')}</p>
                    <p>{t('privacy.p5')}</p>
                    <p>
                        {t('privacy.p6_pre')}
                        <Link className="font-semibold underline" to="/">{t('privacy.p6_link')}</Link>.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
