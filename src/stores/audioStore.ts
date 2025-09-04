import Message from "@/models/message";
import User from "@/models/user";
import Voice from "@/models/voice";
import { create } from "zustand";

interface DownloadedAudio {
  _id: string;
  src?: string;
  downloaded: boolean;
  isDownloading: boolean;
}
interface Updater {
  updater: (key: keyof User, value: User[keyof User]) => void;
  isPlaying: boolean;
  audioElem: HTMLAudioElement | null;
  currentTime: number;
  voiceData: (Voice & Message) | null;
  downloadedAudios: DownloadedAudio[];
  setter: (
    partialState: Partial<Updater> | ((state: Updater) => Partial<Updater>)
  ) => void;
}

const useAudio = create<Updater>((set) => ({
  isPlaying: false,
  audioElem: null,
  currentTime: 0,
  voiceData: {} as Voice & Message,
  downloadedAudios: [],

  updater: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
    })),

  setter: (partialState) => set(partialState),
}));

export default useAudio;
