import { getBaseURL } from "../https";

export type AudioQuality = "lossless" | "high" | "standard";

export interface AudioQualityOption {
  quality: AudioQuality;
  label: string;
  codec: string;
  bitrate: string;
}

export interface AudioQualityProfile {
  defaultQuality: AudioQuality;
  options: AudioQualityOption[];
}

export const getFallbackAudioQualityProfile = (): AudioQualityProfile => ({
  defaultQuality: "lossless",
  options: [
    {
      quality: "lossless",
      label: "无损",
      codec: "原始",
      bitrate: "原始",
    },
  ],
});

export const getTrackAudioQualityProfile = async (track: {
  id: number | string;
  path: string;
}): Promise<AudioQualityProfile> => {
  if (track.path.startsWith("http")) {
    return getFallbackAudioQualityProfile();
  }

  try {
    const response = await fetch(
      `${getBaseURL().replace(/\/$/, "")}/track/${track.id}/playback-qualities`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch playback qualities: ${response.status}`);
    }
    const payload = await response.json();
    return payload?.data || getFallbackAudioQualityProfile();
  } catch (error) {
    console.error("Failed to load track audio quality profile:", error);
    return getFallbackAudioQualityProfile();
  }
};

export const buildTrackPlaybackUrl = (
  track: { id: number | string; path: string },
  quality?: AudioQuality,
): string => {
  if (track.path.startsWith("http")) {
    return track.path;
  }

  const baseURL = getBaseURL().replace(/\/$/, "");
  const qualityQuery = quality ? `?quality=${quality}` : "";
  return `${baseURL}/track/stream/${track.id}${qualityQuery}`;
};
