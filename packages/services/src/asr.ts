import { ISuccessResponse } from "./models";
import { request } from "./request";

const ASR_BASE_URL = "/asr";

/**
 * Speech to Text using the ASR service
 * @param audio Local URI (string for React Native) or File/Blob (for Web)
 */
export const speechToText = async (audio: string | File | Blob): Promise<string> => {
  const formData = new FormData();
  
  if (typeof audio === 'string') {
    // Extract file name and type from URI
    const filename = audio.split("/").pop() || "audio.m4a";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `audio/${match[1]}` : `audio/m4a`;

    formData.append("audio", {
      uri: audio,
      name: filename,
      type: type,
    } as any);
  } else {
    // Web environment: File or Blob
    const filename = audio instanceof File ? audio.name : "audio.webm";
    formData.append("audio", audio, filename);
  }

  const response = await request.post<ISuccessResponse<any>>(`${ASR_BASE_URL}/text`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const data = response.data as any;
  if (data && typeof data.text === 'string') {
    return data.text;
  } else if (data && data.data && typeof data.data.text === 'string') {
    // Just in case it's wrapped in a data field based on typical fastAPI/axios intercepts
    return data.data.text;
  }
  
  // Also check if the raw response has the text
  if (response as any && typeof (response as any).text === 'string') {
     return (response as any).text;
  }

  console.error("ASR Response invalid or missing text:", response.data || response);
  throw new Error("Failed to transcribe audio");
};
