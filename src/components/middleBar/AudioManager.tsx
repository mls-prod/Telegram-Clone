"use client";
import useAudio from "@/stores/audioStore";
import { toaster } from "@/utils";
import { useEffect, useRef, useMemo } from "react";

interface AudioFile {
  _id: string;
  src?: string;
  downloaded: boolean;
  isDownloading: boolean;
}

const AudioManager = () => {
  const { isPlaying, setter, voiceData, downloadedAudios } = useAudio(
    (state) => state
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const isVoiceFileReadyToPlay = useMemo(() => {
    return downloadedAudios.some(
      (audio: { _id: string; downloaded: boolean; isDownloading: boolean }) =>
        audio._id === voiceData?._id && !audio.isDownloading && audio.downloaded
    );
  }, [downloadedAudios, voiceData?._id]);

  useEffect(() => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && isVoiceFileReadyToPlay) {
      setter({ audioElem: audioRef.current, isPlaying: true });
      audioRef.current?.play();
    }
  }, [isPlaying, isVoiceFileReadyToPlay, setter]);

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current as HTMLAudioElement;

    const handleEnded = () => {
      setter({ isPlaying: false, voiceData: null });
    };

    const handleError = () => {
      toaster("error", "Загрузка не удалась! Проверьте подключение к Интернету.");

      setter({
        downloadedAudios: downloadedAudios.filter(
          (audio: {
            _id: string;
            downloaded: boolean;
            isDownloading: boolean;
          }) => audio._id !== voiceData?._id
        ),
        isPlaying: false,
        voiceData: null,
      });
    };

    const handleCanPlayThrough = () => {
      setter((prev: { downloadedAudios: AudioFile[]; isPlaying: boolean }) => ({
        downloadedAudios: prev.downloadedAudios.map((audio: AudioFile) =>
          audio._id === voiceData?._id
            ? { ...audio, downloaded: true, isDownloading: false }
            : audio
        ),
        isPlaying: true,
      }));
      audio.play();
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplaythrough", handleCanPlayThrough);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
    };
  }, [voiceData?._id, downloadedAudios, setter]);

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;

    const updateProgress = () => {
      if (!audio.duration) return;
      setter({ currentTime: Math.floor(audio.currentTime) });

      if (!audio.paused) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, setter]);

  return voiceData ? (
    <audio
      key={voiceData._id}
      ref={audioRef}
      className="hidden"
      src={voiceData.src}
      controls={false}
    ></audio>
  ) : null;
};

export default AudioManager;
