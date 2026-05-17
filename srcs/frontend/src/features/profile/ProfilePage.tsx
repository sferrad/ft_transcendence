import "../../i18n/index.ts";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useProfilePage } from "./hooks/useProfilePage";
import ProfilePicture from "./components/ProfilePicture";
import IncomingFriendRequests from "./components/IncomingFriendRequests";
import FriendsPanel from "./components/FriendsPanel";
import { OwnProfilePanel } from "./components/OwnProfilePanel";
import { OtherProfilePanel } from "./components/OtherProfilePanel";
import { ProfileStatusMessage } from "./components/ProfileStatusMessage";

const ARCADE_BASE = "hb-tap font-arcade cursor-pointer border-0 shadow-[0px_4px_rgb(255,255,255),0px_-4px_rgb(255,255,255),4px_0px_rgb(255,255,255),-4px_0px_rgb(255,255,255),0px_4px_rgba(0,0,0,0.22),4px_4px_rgba(0,0,0,0.22),-4px_4px_rgba(0,0,0,0.22),inset_0px_4px_rgba(255,255,255,0.21)] no-underline inline-flex items-center justify-center gap-2 transition-transform duration-100 active:translate-y-0.5 max-w-full";
const ARCADE_PRIMARY = `${ARCADE_BASE} px-4 py-2`;
const ARCADE_SMALL = `${ARCADE_BASE} px-3 py-2 text-lg min-[481px]:text-xl`;

function Profile() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const {
        profile, profilePicture, isLoading,
        error, success, messageVisible,
        isMe, isBlocking, viewedUserOnline, isAlreadyFriend,
        incomingRequests, requesterNames,
        showFriends, setShowFriends,
        friends,
        editableCountry, setEditableCountry,
        editableLanguage, setEditableLanguage,
        searchUserId, setSearchUserId,
        myUserId, myUsername,
        setSearchParams,
        handleSearchProfile,
        handleImageUpload,
        handleSaveCountryLanguage,
        handleLogout,
        handleOpenPrivateChat,
        handleToggleFriend,
        handleToggleBlock,
        handleAcceptRequest,
        handleRejectRequest,
    } = useProfilePage();

    return (
        <div className="relative min-h-[100dvh] w-full overflow-auto">
            <div className="fixed inset-0 bg-[url('/assets/bgProfil.jpg')] bg-cover bg-center bg-no-repeat blur-sm" aria-hidden="true" />

            <div className="relative z-10 min-h-[100dvh] px-4 py-8">
                <button
                    onClick={() => navigate("/")}
                    className={`${ARCADE_PRIMARY} absolute left-4 top-4 text-2xl min-[481px]:text-3xl text-white bg-blue-600 hover:bg-blue-700`}
                >
                    {t("Home")}
                </button>

                <div className="min-h-[100dvh] flex items-center justify-center">
                    <div className="bg-[#f5f0e8]/90 border-4 border-[#2b2b2b] px-6 py-8 min-[481px]:px-10 min-[481px]:py-10 shadow-[6px_6px_0_#2b2b2b] w-[min(92vw,46rem)]">

                        <form onSubmit={handleSearchProfile} className="flex flex-col min-[481px]:flex-row gap-3">
                            <input
                                value={searchUserId}
                                onChange={(e) => setSearchUserId(e.target.value)}
                                placeholder={t("Search by username")}
                                className="hb-tap flex-1 px-4 py-2 rounded-lg border-2 border-[#2b2b2b] bg-white/90 text-[#1f2937] text-base focus:outline-none focus:ring-2 focus:ring-black/20"
                            />
                            <button type="submit" className={`${ARCADE_PRIMARY} text-white bg-blue-600 hover:bg-blue-700`}>
                                {t("Search")}
                            </button>
                        </form>

                        <ProfilePicture
                            profilePicture={profilePicture}
                            isLoading={isLoading}
                            onImageUpload={isMe ? handleImageUpload : undefined}
                            presenceOnline={!isMe ? viewedUserOnline : null}
                        />

                        <h1 className="hb-title font-arcade tracking-widest text-[#1f2937] text-center">
                            {profile?.display_name ?? myUsername}
                        </h1>

                        {isMe && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setShowFriends((v) => !v)}
                                    className={`${ARCADE_PRIMARY} text-2xl min-[481px]:text-3xl text-white bg-blue-600 hover:bg-blue-700`}
                                >
                                    {t("Friends")}
                                </button>
                            </div>
                        )}

                        {isMe && showFriends && (
                            <FriendsPanel
                                title={t("My Friends")}
                                friends={friends}
                                onSelectUserId={(friendUserId) => {
                                    setShowFriends(false);
                                    if (myUserId > 0 && friendUserId === myUserId) { setSearchParams({}); return; }
                                    setSearchParams({ userId: String(friendUserId) });
                                }}
                            />
                        )}

                        {isMe && (
                            <IncomingFriendRequests
                                title={t("Friend Requests")}
                                subtitle={t("has sent you a request")}
                                acceptLabel={t("Accept")}
                                rejectLabel={t("Reject")}
                                requests={incomingRequests}
                                requesterNames={requesterNames}
                                onAccept={handleAcceptRequest}
                                onReject={handleRejectRequest}
                            />
                        )}

                        {isMe ? (
                            <OwnProfilePanel
                                myUserId={myUserId}
                                editableCountry={editableCountry}
                                editableLanguage={editableLanguage}
                                onCountryChange={setEditableCountry}
                                onLanguageChange={setEditableLanguage}
                                onSaveCountryLanguage={handleSaveCountryLanguage}
                                arcadeButtonClass={ARCADE_PRIMARY}
                            />
                        ) : profile ? (
                            <OtherProfilePanel
                                profile={profile}
                                isAlreadyFriend={isAlreadyFriend}
                                isBlocking={isBlocking}
                                onOpenChat={handleOpenPrivateChat}
                                onToggleFriend={handleToggleFriend}
                                onToggleBlock={handleToggleBlock}
                                arcadeSmallButtonClass={ARCADE_SMALL}
                            />
                        ) : (
                            <div className="mt-4 rounded-lg bg-white/75 border-2 border-[#2b2b2b] shadow-[3px_3px_0_#2b2b2b] px-4 py-4 text-[#1f2937]">
                                <div className="whitespace-pre-wrap break-words text-sm min-[481px]:text-base">{t("User not found")}</div>
                            </div>
                        )}

                        <div className="border-t-2 border-[#2b2b2b] my-6" />

                        <ProfileStatusMessage visible={messageVisible} error={error} success={success} />

                        <button
                            onClick={handleLogout}
                            className={`w-full mt-6 ${ARCADE_PRIMARY} text-4xl text-white bg-red-600 hover:bg-red-700`}
                        >
                            {t("Logout")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
