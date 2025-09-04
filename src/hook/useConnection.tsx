import Loading from "@/components/modules/ui/Loading";
import Room from "@/models/room";
import User from "@/models/user";
import { GlobalStoreProps } from "@/stores/globalStore";
import { UserStoreUpdater } from "@/stores/userStore";
import { SocketsProps } from "@/stores/useSockets";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface useConnectionProps {
  selectedRoom: Room | null;
  setter: (
    state:
      | Partial<GlobalStoreProps>
      | ((prev: GlobalStoreProps) => Partial<GlobalStoreProps>)
  ) => void;
  userId: string;
  userDataUpdater: (state: Partial<User & UserStoreUpdater>) => void;
  updater: (
    key: keyof SocketsProps,
    value: SocketsProps[keyof SocketsProps]
  ) => void;
}

const useConnection = ({
  selectedRoom,
  setter,
  userId,
  userDataUpdater,
  updater,
}: useConnectionProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isPageLoaded, setIsPageLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<ReactNode>(
    <span>
      Connecting
      <Loading loading="dots" size="xs" classNames="text-white mt-1.5" />
    </span>
  );

  const setupSocketListeners = useCallback(() => {
    const socket = socketRef.current;
    if (!socket) return;

    let listenersRemaining = 2;
    const handleListenerUpdate = () => {
      listenersRemaining -= 1;
      // console.log(`Event ${event} completed. Remaining: ${listenersRemaining}`);
      if (listenersRemaining === 0) {
        setStatus("Telegram");
      }
    };

    setStatus(
      <>
        Updating
        <Loading loading="dots" size="xs" classNames="text-white mt-1.5" />
      </>
    );

    socket.emit("joining", selectedRoom?._id);

    socket.on("joining", (roomData) => {
      if (roomData) setter({ selectedRoom: roomData });
      handleListenerUpdate();
    });

    socket.on("getRooms", (fetchedRooms) => {
      setRooms(fetchedRooms);
      userDataUpdater({ rooms: fetchedRooms });
      setIsPageLoaded(true);
      handleListenerUpdate();
    });

    socket.on("lastMsgUpdate", (newMsg) => {
      setRooms((prevRooms) =>
        prevRooms.map((roomData) =>
          roomData._id === newMsg.roomID
            ? { ...roomData, lastMsgData: newMsg }
            : roomData
        )
      );
    });

    socket.on("createRoom", (roomData) => {
      socket.emit("getRooms", userId);
      if (roomData.creator === userId) socket.emit("joining", roomData._id);
    });

    socket.on("updateRoomData", (roomData) => {
      socket.emit("getRooms", userId);

      setter((prev) => ({
        ...prev,
        selectedRoom:
          prev.selectedRoom && prev.selectedRoom._id === roomData._id
            ? {
                ...prev.selectedRoom,
                name: roomData.name,
                avatar: roomData.avatar,
                participants: roomData.participants,
                admins: roomData.admins,
              }
            : prev.selectedRoom,
      }));
    });

    socket.on("updateOnlineUsers", (onlineUsers) => setter({ onlineUsers }));

    socket.on("updateLastMsgPos", (updatedData) => {
      userDataUpdater({ roomMessageTrack: updatedData });
    });

    socket.on("deleteRoom", (roomID) => {
      socket.emit("getRooms");
      if (roomID === selectedRoom?._id) setter({ selectedRoom: null });
    });

    socket.on("seenMsg", ({ roomID, seenBy }) => {
      setRooms((prevRooms) =>
        prevRooms.map((room) => {
          if (room._id === roomID) {
            return {
              ...room,
              lastMsgData: {
                ...room.lastMsgData!,
                seen: [...new Set([...(room.lastMsgData?.seen || []), seenBy])],
              },
            };
          }
          return room;
        })
      );
    });

    socket.on("connect", () => {
      setStatus("Telegram");
      socket.emit("getRooms", userId);
    });

    socket.on("disconnect", () => {
      setStatus(
        <span>
          Connecting
          <Loading loading="dots" size="xs" classNames="text-white mt-1.5" />
        </span>
      );
    });

    return () => {
      [
        "connect",
        "disconnect",
        "joining",
        "getRooms",
        "createRoom",
        "updateLastMsgPos",
        "lastMsgUpdate",
        "updateOnlineUsers",
        "deleteRoom",
        "seenMsg",
        "updateRoomData",
      ].forEach((event) => socket.off(event));
    };
  }, [selectedRoom, setter, userDataUpdater, userId]);

  const initializeSocket = useCallback(() => {
    if (!socketRef.current) {
      const newSocket = io(process.env.NEXT_PUBLIC_SOCKET_SERVER_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ["websocket"],
      });
      socketRef.current = newSocket;
      setupSocketListeners();
    }
  }, [setupSocketListeners]);

  useEffect(() => {
    const handleOnline = () => {
      setStatus(
        <span>
          Connecting
          <Loading loading="dots" size="xs" classNames="text-white mt-1.5" />
        </span>
      );
      initializeSocket();
    };

    const handleOffline = () => {
      setStatus(
        <span>
          Connecting
          <Loading loading="dots" size="xs" classNames="text-white mt-1.5" />
        </span>
      );
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!socketRef.current) {
      initializeSocket();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [initializeSocket]);

  useEffect(() => {
    if (socketRef.current && rooms.length) {
      updater("rooms", socketRef.current);
      userDataUpdater({ rooms });
    }
  }, [rooms, updater, userDataUpdater]);

  return { status, isPageLoaded, setRooms, socketRef };
};

export default useConnection;
