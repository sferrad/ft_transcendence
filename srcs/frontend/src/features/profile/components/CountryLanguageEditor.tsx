import { useTranslation } from "react-i18next";

const COUNTRY_OPTIONS = [
    { value: "France", label: "France" },
    { value: "Belgium", label: "Belgium" },
    { value: "Canada", label: "Canada" },
    { value: "Italy", label: "Italy" },
    { value: "Morocco", label: "Morocco" },
    { value: "Algeria", label: "Algeria" },
    { value: "Tunisia", label: "Tunisia" },
] as const;

const LANGUAGE_OPTIONS = [
    { value: "French", label: "French" },
    { value: "English", label: "English" },
    { value: "Spanish", label: "Spanish" },
] as const;

interface CountryLanguageEditorProps {
    country: string;
    language: string;
    onCountryChange: (v: string) => void;
    onLanguageChange: (v: string) => void;
    onSave: () => void;
    arcadeButtonClass: string;
}

export function CountryLanguageEditor({ country, language, onCountryChange, onLanguageChange, onSave, arcadeButtonClass }: CountryLanguageEditorProps) {
    const { t } = useTranslation();

    return (
        <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
            <div className="mb-3 font-arcade tracking-wide text-base min-[481px]:text-lg">{t("Country and language")}</div>
            <div className="flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
                <div className="flex flex-col gap-2">
                    <label className="font-medium">{t("Country")}</label>
                    <select
                        value={country}
                        onChange={(e) => onCountryChange(e.target.value)}
                        className="hb-tap min-w-[12rem] px-3 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white text-[#1f2937]"
                    >
                        <option value="">-</option>
                        {COUNTRY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{t(o.label)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="font-medium">{t("Language")}</label>
                    <select
                        value={language}
                        onChange={(e) => onLanguageChange(e.target.value)}
                        className="hb-tap min-w-[12rem] px-3 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white text-[#1f2937]"
                    >
                        <option value="">-</option>
                        {LANGUAGE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{t(o.label)}</option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    className={`${arcadeButtonClass} text-white bg-blue-600 hover:bg-blue-700 w-full min-[900px]:w-auto`}
                >
                    {t("Save")}
                </button>
            </div>
        </div>
    );
}
