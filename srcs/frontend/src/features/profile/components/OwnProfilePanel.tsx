import HandleBio from "./Bio";
import { CountryLanguageEditor } from "./CountryLanguageEditor";
import { MatchHistory } from "./MatchHistory";
import { Leaderboard } from "./Leaderboard";

interface OwnProfilePanelProps {
    myUserId: number;
    editableCountry: string;
    editableLanguage: string;
    onCountryChange: (v: string) => void;
    onLanguageChange: (v: string) => void;
    onSaveCountryLanguage: () => void;
    arcadeButtonClass: string;
}

export function OwnProfilePanel({
    myUserId,
    editableCountry,
    editableLanguage,
    onCountryChange,
    onLanguageChange,
    onSaveCountryLanguage,
    arcadeButtonClass,
}: OwnProfilePanelProps) {
    return (
        <>
            <HandleBio />
            <CountryLanguageEditor
                country={editableCountry}
                language={editableLanguage}
                onCountryChange={onCountryChange}
                onLanguageChange={onLanguageChange}
                onSave={onSaveCountryLanguage}
                arcadeButtonClass={arcadeButtonClass}
            />
            <MatchHistory userId={myUserId} />
            <Leaderboard myUserId={myUserId} />
        </>
    );
}
