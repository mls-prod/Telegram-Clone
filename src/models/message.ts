import User from "./user";

export default interface Message {
  _id: string;
  message: string;
  sender: User;
  isEdited: boolean;
  seen: string[];
  replays: string[];
  pinnedAt: string | null;
  voiceData: { src: string; duration: number; playedBy: string[] } | null;
  replayedTo: { message: string; msgID: string; username: string } | null;
  roomID: string;
  hideFor: string[];
  createdAt: string;
  updatedAt: string;
}
