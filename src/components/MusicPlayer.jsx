import React, { useState, useRef, useEffect } from "react";
import styles from "./MusicPlayer.module.css";

const tracks = [
  { title: "校歌", src: "public/audio/school-song.wav" },
  { title: "班歌", src: "public/audio/class-song.wav" },
];

export default function MusicPlayer() {
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showPanel, setShowPanel] = useState(false);

  const audioRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const track = tracks[currentTrack];

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    const next = (currentTrack + 1) % tracks.length;
    setCurrentTrack(next);
    setIsPlaying(true);
  };

  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol;
  };

  const handleProgressChange = (e) => {
    const prog = parseFloat(e.target.value);
    setProgress(prog);
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (prog / 100) * audioRef.current.duration;
    }
  };

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.src = track.src;
    audio.volume = volume;
    if (isPlaying) audio.play();

    const updateProgress = () => {
      setProgress((audio.currentTime / audio.duration) * 100 || 0);
      setCurrentTime(audio.currentTime);
    };

    audio.addEventListener("timeupdate", updateProgress);
    return () => audio.removeEventListener("timeupdate", updateProgress);
  }, [track, isPlaying, volume]);

  const showMusicPanel = () => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setShowPanel(true);
  };

  const hideMusicPanel = () => {
    hideTimeoutRef.current = setTimeout(() => setShowPanel(false), 300);
  };

  return (
    <div className={styles.musicPlayer}>
      <div
        className={`${styles.musicPanel} ${showPanel ? styles.showPanel : ""}`}
        onMouseEnter={showMusicPanel}
        onMouseLeave={hideMusicPanel}
      >
        <div className={styles.musicTitle}>{track.title}</div>
        <div className={styles.musicControls}>
          <button onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
          />
        </div>
        <div className={styles.musicMeta}>
          <span>{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
          />
          <span>{Math.round(volume * 100)}%</span>
        </div>
      </div>

      <div
        className={styles.musicToggle}
        onMouseEnter={showMusicPanel}
        onMouseLeave={hideMusicPanel}
        onClick={nextTrack}
      >
        ♪
      </div>

      <audio ref={audioRef}></audio>
    </div>
  );
}
