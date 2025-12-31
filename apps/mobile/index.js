// Import the Expo Router entry component
import "expo-router/entry";
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/services/playbackService';

TrackPlayer.registerPlaybackService(() => PlaybackService);
