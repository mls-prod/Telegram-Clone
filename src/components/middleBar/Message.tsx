import { useOnScreen } from "@/hook/useOnScreen";
import {
  dateString,
  getTimeFromDate,
  scrollToMessage,
  secondsToTimeString,
} from "@/utils";
import { FaPlay } from "react-icons/fa";
import { FaPause, FaArrowDown } from "react-icons/fa6";
import { IoClose, IoEye } from "react-icons/io5";
import { TiPin } from "react-icons/ti";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import MessageActions from "./MessageActions";
import MessageModel from "@/models/message";
import Voice from "@/models/voice";
import useSockets from "@/stores/useSockets";
import useAudio from "@/stores/audioStore";
import { IoMdCheckmark } from "react-icons/io";
import useModalStore from "@/stores/modalStore";
import useGlobalStore from "@/stores/globalStore";
import Loading from "../modules/ui/Loading";
import ProfileGradients from "../modules/ProfileGradients";

interface Props {
  myId: string;
  addReplay: (_id: string) => void;
  edit: (data: MessageModel) => void;
  pin: (_id: string) => void;
  isPv?: boolean;
  voiceData?: Voice | null;
  stickyDate: string | null;
  nextMessage: MessageModel;
}

const Message = (msgData: MessageModel & Props) => {
  const {
    createdAt,
    message,
    seen,
    _id,
    sender,
    myId,
    roomID,
    replayedTo,
    isEdited,
    addReplay,
    edit,
    pin,
    isPv = false,
    nextMessage,
    voiceData: voiceDataProp,
    stickyDate,
  } = msgData;

  const [isMounted, setIsMounted] = useState(false);
  const [voiceCurrentTime, setVoiceCurrentTime] = useState(0);

  const messageRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const { rooms } = useSockets((state) => state);
  const { setter: modalSetter, msgData: modalMsgData } = useModalStore(
    (state) => state
  );
  const { setter, selectedRoom } = useGlobalStore((state) => state);
  const isInViewport = useOnScreen(messageRef);

  //Calculate whether the message is the last message from the current sender.
  const isLastMessageFromUser = useMemo(
    () => !nextMessage || nextMessage.sender._id !== sender._id,
    [nextMessage, sender]
  );
  // Check if the message was sent from me
  const isFromMe = useMemo(() => sender?._id === myId, [sender, myId]);
  const isChannel = useMemo(() => {
    return selectedRoom?.type === "channel";
  }, [selectedRoom?.type]);
  const isMeJoined = useMemo(
    () =>
      selectedRoom?.participants.find((user) => user === myId) ||
      selectedRoom?.admins.includes(myId) ||
      selectedRoom?.creator === myId,
    [
      myId,
      selectedRoom?.admins,
      selectedRoom?.creator,
      selectedRoom?.participants,
    ]
  );
  const canMessageAction = isMeJoined && modalMsgData?._id === _id;

  const messageTime = useMemo(() => getTimeFromDate(createdAt), [createdAt]);
  const stickyDates = useMemo(() => dateString(createdAt), [createdAt]);

  // Get voice info
  const {
    isPlaying,
    voiceData,
    setter: audioUpdater,
    downloadedAudios,
    audioElem,
  } = useAudio((state) => state);

  // The structure of sound waves
  const { songWaves, waveUpdater, resetWaves } = useMemo(() => {
    const waveUpdater = (progress: number) => {
      const activeWaveIndex = Math.floor(progress * 25);
      const partialFill = (progress * 25 - activeWaveIndex) * 100;
      for (let i = 0; i < 25; i++) {
        const elem = document.getElementById(`${_id}${i}`);
        if (elem) {
          if (i < activeWaveIndex) {
            elem.style.background = "white";
          } else if (i === activeWaveIndex) {
            elem.style.background = `linear-gradient(to right, white ${partialFill}%, #4bbfff ${partialFill}%)`;
          } else {
            elem.style.background = "#4bbfff";
          }
        }
      }
    };

    const resetWaves = () => {
      for (let i = 0; i < 25; i++) {
        const elem = document.getElementById(`${_id}${i}`);
        if (elem) {
          elem.style.background = "#4bbfff";
        }
      }
    };

    const waves = Array.from({ length: 25 }, (_, index) => {
      const randomHeight = Math.random() * 10 + 6;
      return (
        <div
          id={`${_id}${index}`}
          key={index}
          className="w-[0.17rem] rounded-4xl"
          style={{ height: `${randomHeight}px` }}
        />
      );
    });

    return { songWaves: waves, waveUpdater, resetWaves };
  }, [_id]);

  // Update audio waves (animation)
  useEffect(() => {
    if (voiceData?._id !== _id || !audioElem) {
      resetWaves();
      return;
    }

    const updateWave = () => {
      if (audioElem) {
        const totalTime = voiceData.duration || audioElem.duration;
        const currentTime = audioElem.currentTime || 0;
        const progress = totalTime ? currentTime / totalTime : 0;
        waveUpdater(progress);
        setVoiceCurrentTime(currentTime);
        animationRef.current = requestAnimationFrame(updateWave);
      }
    };

    animationRef.current = requestAnimationFrame(updateWave);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [
    _id,
    audioElem,
    resetWaves,
    voiceData?._id,
    voiceData?.duration,
    waveUpdater,
  ]);

  // Handler for playing/pausing audio
  const togglePlayVoice = useCallback(() => {
    if (!isFromMe && !voiceDataProp?.playedBy?.includes(myId)) {
      const socket = useSockets.getState().rooms;
      socket?.emit("listenToVoice", { userID: myId, voiceID: _id, roomID });
    }

    const savedVoiceData = downloadedAudios.find((voice) => voice._id === _id);
    if (!savedVoiceData) {
      audioUpdater({
        isPlaying: false,
        voiceData: { ...voiceDataProp!, ...msgData },
        downloadedAudios: [
          ...downloadedAudios,
          { _id, isDownloading: true, downloaded: false },
        ],
      });
      return;
    }

    if (savedVoiceData.isDownloading) {
      audioUpdater({
        isPlaying: false,
        voiceData: null,
        downloadedAudios: downloadedAudios.filter((audio) => audio._id !== _id),
      });
      return;
    }

    audioUpdater({
      isPlaying: voiceData?._id === _id ? !isPlaying : true,
      voiceData: { ...voiceDataProp!, ...msgData },
    });
  }, [
    isFromMe,
    voiceDataProp,
    myId,
    _id,
    roomID,
    downloadedAudios,
    audioUpdater,
    voiceData,
    isPlaying,
    msgData,
  ]);

  // Open the sender's profile
  const openProfile = useCallback(() => {
    setter({
      RoomDetailsData: sender,
      shouldCloseAll: true,
      isRoomDetailsShown: true,
    });
  }, [setter, sender]);

  //Update modal data (for editing, replying, and pinning)
  const updateModalMsgData = useCallback(
    (e: React.MouseEvent) => {
      if (msgData._id === modalMsgData?._id) return;
      modalSetter((prev) => ({
        ...prev,
        clickPosition: { x: e.clientX, y: e.clientY },
        msgData,
        edit,
        reply: () => addReplay(_id),
        pin,
      }));
    },
    [msgData, modalMsgData, modalSetter, addReplay, _id, edit, pin]
  );

  //Send message view event if message is in viewport
  useEffect(() => {
    if (!isFromMe && !seen.includes(myId) && isInViewport && rooms) {
      rooms.emit("seenMsg", {
        seenBy: myId,
        sender,
        msgID: _id,
        roomID,
      });
    }
  }, [_id, isFromMe, isInViewport, myId, roomID, rooms, seen, sender]);

  //Set display state only once after mount.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Calculate and render audio icons (based on download and playback status)
  const audioIcon = useMemo(() => {
    const isDownloading = downloadedAudios.some(
      (audio) => audio._id === _id && audio.isDownloading
    );
    const isDownloaded = downloadedAudios.some(
      (audio) => audio._id === _id && audio.downloaded
    );

    if (voiceData?._id === _id) {
      if (isDownloading) {
        return (
          <span className="absolute flex-center">
            <Loading
              classNames={`absolute w-10 ${
                isFromMe ? "bg-darkBlue" : "bg-white"
              }`}
            />
            <IoClose data-aos="zoom-in" className="size-6" />
          </span>
        );
      } else if (isDownloaded) {
        return isPlaying ? (
          <FaPause data-aos="zoom-in" className="size-5" />
        ) : (
          <FaPlay data-aos="zoom-in" className="ml-1" />
        );
      } else {
        return <FaArrowDown data-aos="zoom-in" className="size-5" />;
      }
    } else {
      return isDownloaded ? (
        <FaPlay data-aos="zoom-in" className="ml-1" />
      ) : (
        <FaArrowDown data-aos="zoom-in" className="size-5" />
      );
    }
  }, [downloadedAudios, voiceData, _id, isPlaying, isFromMe]);
  // console.log(sender?.name, sender?._id);

  return (
    <>
      {stickyDate && (
        <div
          className="static top-20 text-xs bg-gray-800/80 w-fit mx-auto text-center rounded-2xl py-1 my-2 px-3 z-10"
          data-date={stickyDates}
        >
          {stickyDate}
        </div>
      )}

      <div
        ref={messageRef}
        className={`chat transition-all duration-100 w-full  ${
          isFromMe ? "chat-end " : "chat-start"
        } ${isMounted ? "" : "opacity-0 scale-0"}`}
      >
        {/* Show sender avatar in received messages */}
        {!isFromMe &&
          !isPv &&
          !isChannel &&
          isLastMessageFromUser &&
          (sender.avatar ? (
            <div
              className="chat-image avatar cursor-pointer z-5"
              onClick={openProfile}
            >
              <div className="size-8 shrink-0 rounded-full">
                <Image
                  src={sender.avatar}
                  width={32}
                  height={32}
                  alt="avatar"
                  className="size-8 shrink-0 rounded-full "
                />
              </div>
            </div>
          ) : (
            <ProfileGradients
              classNames="size-8 chat-image avatar cursor-pointer z-10"
              id={sender?._id}
              onClick={openProfile}
            >
              {sender.name[0]}
            </ProfileGradients>
          ))}

        <div
          id="messageBox"
          onClick={updateModalMsgData}
          onContextMenu={updateModalMsgData}
          className={`relative grid break-all w-fit max-w-[80%] min-w-32 xl:max-w-[60%] py-0 rounded-t-xl transition-all duration-200
            ${
              isFromMe
                ? `${
                    !isLastMessageFromUser ? "rounded-br-md col-start-1" : ""
                  } ${
                    canMessageAction ? "bg-darkBlue/60" : "bg-darkBlue"
                  } rounded-bl-xl rounded-br-lg px-1`
                : `${
                    canMessageAction ? "bg-gray-800/60" : "bg-gray-800"
                  } pr-1 rounded-br-xl pl-1`
            }
            ${
              !isLastMessageFromUser &&
              !isFromMe &&
              `${
                !isPv && !isChannel ? `ml-8` : "ml-0"
              } rounded-bl-md col-start-2`
            }
            ${isLastMessageFromUser ? "chat-bubble" : ""}`}
        >
          {!isFromMe && !isPv && (
            <p
              dir="auto"
              className="w-full text-xs font-vazirBold pt-2 pl-1 text-[#13d4d4]"
            >
              {isChannel
                ? selectedRoom?.name
                : sender.name + " " + sender.lastName}
            </p>
          )}

          <div className="flex flex-col text-sm gap-1 p-1 mt-1 break-words mb-3">
            {replayedTo && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToMessage(replayedTo?.msgID);
                }}
                className={`${
                  isFromMe
                    ? "bg-lightBlue/20 rounded-l-md"
                    : "bg-green-500/15 rounded-r-md"
                } cursor-pointer rounded-md rounded-t-md text-sm relative w-full py-1 px-3 overflow-hidden`}
              >
                <span
                  className={`absolute ${
                    isFromMe ? "bg-white" : "bg-green-500"
                  } left-0 inset-y-0 w-[3px] h-full`}
                ></span>
                <p className="font-vazirBold text-xs break-words text-start line-clamp-1 text-ellipsis">
                  {replayedTo.username}
                </p>
                <p className="font-thin break-words line-clamp-1 text-ellipsis text-left text-xs">
                  {replayedTo.message || "Voice Message"}
                </p>
              </div>
            )}
            {voiceDataProp && (
              <div className="flex items-center gap-3 bg-inherit w-full mt-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayVoice();
                  }}
                  className={`rounded-full size-10 cursor-pointer relative flex-center overflow-hidden ${
                    isFromMe
                      ? "bg-white text-darkBlue"
                      : "bg-darkBlue text-white"
                  }`}
                >
                  {audioIcon}
                </div>

                <div className="flex flex-col gap-1 justify-center">
                  <div className="overflow-hidden text-nowrap flex items-center gap-[1.5px] relative z-0">
                    {songWaves}
                  </div>

                  <div className="flex items-center gap-px text-[12px] mr-auto text-white/60">
                    {voiceData?._id === _id && isPlaying
                      ? secondsToTimeString(voiceCurrentTime)
                      : secondsToTimeString(voiceDataProp.duration)}
                    {voiceDataProp?.playedBy &&
                      voiceDataProp.playedBy.length === 0 && (
                        <div className="size-1.5 ml-1 mb-0.5 rounded-full bg-white" />
                      )}
                  </div>
                </div>
              </div>
            )}
            <p dir="auto" className="text-white break-keep ">
              {message}
            </p>
          </div>

          <span
            className={`flex items-end justify-end gap-1.5 absolute bottom-0 right-1 w-full text-sm ${
              isFromMe ? "text-[#B7D9F3]" : "text-darkGray"
            } text-right`}
          >
            {isChannel && (
              <div className="flex items-end text-[10px]">
                <IoEye size={14} className="mb-[1.2px] mr-[2px]" />
                {seen.length > 0 ? seen.length : ""}
              </div>
            )}
            {msgData?.pinnedAt && (
              <TiPin data-aos="zoom-in" className="size-4" />
            )}
            <p
              className={`whitespace-nowrap text-[10px] ${!isFromMe && "pr-1"}`}
            >
              {isEdited && "edited "} {messageTime}
            </p>
            {isFromMe &&
              !isChannel &&
              (seen.length ? (
                <Image
                  src="/shapes/seen.svg"
                  width={15}
                  height={15}
                  className="size-4 mb-0.5 duration-500"
                  alt="seen"
                />
              ) : (
                <IoMdCheckmark
                  width={15}
                  height={15}
                  className="size-4 mb-0.5 rounded-full bg-center duration-500"
                />
              ))}
          </span>
        </div>
        {canMessageAction && <MessageActions isFromMe={isFromMe} />}
      </div>
    </>
  );
};

export default Message;
