import ExpoModulesCore
import MediaPlayer
import AVFoundation

public class MediaControlBridgeModule: Module {
  private var isListening = false
  private var nowPlayingInfo: [String: Any] = [:]

  public func definition() -> ModuleDefinition {
    Name("MediaControlBridge")

    Events("MediaControlBridgeEvent")

    Function("startListening") {
      ensureAudioSession()
      setupRemoteCommands()
      isListening = true
      return true
    }

    Function("stopListening") {
      teardownRemoteCommands()
      isListening = false
      return true
    }

    Function("updatePlaybackState") { (state: String, position: Double?, speed: Double?, canSkipNext: Bool, canSkipPrevious: Bool) in
      updateRemoteCommandAvailability(canSkipNext: canSkipNext, canSkipPrevious: canSkipPrevious)
      let isPlaying = state.lowercased() == "playing"
      let rate = isPlaying ? (speed ?? 1.0) : 0.0
      var updates: [String: Any] = [
        MPNowPlayingInfoPropertyPlaybackRate: rate
      ]
      if let pos = position {
        updates[MPNowPlayingInfoPropertyElapsedPlaybackTime] = pos
      }
      applyNowPlayingUpdates(updates)
      return true
    }

    Function("updateMetadata") { (title: String?, artist: String?, album: String?, duration: Double?, lyrics: String?) in
      var updates: [String: Any] = [:]
      if let title = title, !title.isEmpty { updates[MPMediaItemPropertyTitle] = title }
      if let artist = artist, !artist.isEmpty { updates[MPMediaItemPropertyArtist] = artist }
      if let album = album, !album.isEmpty { updates[MPMediaItemPropertyAlbumTitle] = album }
      if let duration = duration, duration > 0 { updates[MPMediaItemPropertyPlaybackDuration] = duration }
      // CarPlay: 通过 Lyrics 属性推送当前歌词行，CarPlay NowPlaying 界面可展示
      if let lyrics = lyrics { updates[MPMediaItemPropertyLyrics] = lyrics }
      applyNowPlayingUpdates(updates)
      return true
    }

    OnDestroy {
      teardownRemoteCommands()
    }
  }

  private func ensureAudioSession() {
    let session = AVAudioSession.sharedInstance()
    do {
      try session.setCategory(.playback, mode: .default, options: [])
      try session.setActive(true)
    } catch {
      print("[MediaControlBridge] Failed to activate audio session: \(error)")
    }
  }

  private func setupRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()

    center.playCommand.removeTarget(nil)
    center.pauseCommand.removeTarget(nil)
    center.togglePlayPauseCommand.removeTarget(nil)
    center.nextTrackCommand.removeTarget(nil)
    center.previousTrackCommand.removeTarget(nil)
    center.changePlaybackPositionCommand.removeTarget(nil)

    center.playCommand.isEnabled = true
    center.pauseCommand.isEnabled = true
    center.togglePlayPauseCommand.isEnabled = true
    center.nextTrackCommand.isEnabled = true
    center.previousTrackCommand.isEnabled = true
    center.changePlaybackPositionCommand.isEnabled = true

    center.playCommand.addTarget { [weak self] _ in
      self?.emitAction("play")
      return .success
    }
    center.pauseCommand.addTarget { [weak self] _ in
      self?.emitAction("pause")
      return .success
    }
    center.togglePlayPauseCommand.addTarget { [weak self] _ in
      self?.emitAction("toggle")
      return .success
    }
    center.nextTrackCommand.addTarget { [weak self] _ in
      self?.emitAction("next")
      return .success
    }
    center.previousTrackCommand.addTarget { [weak self] _ in
      self?.emitAction("previous")
      return .success
    }
    center.changePlaybackPositionCommand.addTarget { [weak self] event in
      if let e = event as? MPChangePlaybackPositionCommandEvent {
        self?.emitAction("seek", position: e.positionTime)
        return .success
      }
      return .commandFailed
    }
  }

  private func teardownRemoteCommands() {
    let center = MPRemoteCommandCenter.shared()
    center.playCommand.removeTarget(nil)
    center.pauseCommand.removeTarget(nil)
    center.togglePlayPauseCommand.removeTarget(nil)
    center.nextTrackCommand.removeTarget(nil)
    center.previousTrackCommand.removeTarget(nil)
    center.changePlaybackPositionCommand.removeTarget(nil)
    center.playCommand.isEnabled = false
    center.pauseCommand.isEnabled = false
    center.togglePlayPauseCommand.isEnabled = false
    center.nextTrackCommand.isEnabled = false
    center.previousTrackCommand.isEnabled = false
    center.changePlaybackPositionCommand.isEnabled = false
  }

  private func updateRemoteCommandAvailability(canSkipNext: Bool, canSkipPrevious: Bool) {
    let center = MPRemoteCommandCenter.shared()
    center.nextTrackCommand.isEnabled = canSkipNext
    center.previousTrackCommand.isEnabled = canSkipPrevious
  }

  private func applyNowPlayingUpdates(_ updates: [String: Any]) {
    // IMPORTANT:
    // TrackPlayer may already have populated MPNowPlayingInfoCenter (including artwork).
    // If we overwrite with our own dictionary (which may not include artwork),
    // the lockscreen/Control Center cover will disappear.
    var merged = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? nowPlayingInfo
    for (key, value) in updates {
      merged[key] = value
    }
    nowPlayingInfo = merged
    MPNowPlayingInfoCenter.default().nowPlayingInfo = merged
  }

  private func emitAction(_ action: String, position: Double? = nil, interval: Double? = nil) {
    var params: [String: Any] = ["action": action]
    if let position = position { params["position"] = position }
    if let interval = interval { params["interval"] = interval }
    sendEvent("MediaControlBridgeEvent", params)
  }
}
