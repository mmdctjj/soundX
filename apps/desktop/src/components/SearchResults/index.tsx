import { Avatar, Empty } from "antd";
import React from "react";
import { useNavigate } from "react-router-dom";
import { getBaseURL } from "../../https";
import type { SearchResults as SearchResultsType } from "../../services/search";
import { usePlayerStore } from "../../store/player";
import styles from "./index.module.less";

interface SearchResultsProps {
  results: SearchResultsType;
  onClose: () => void;
}

const SearchResults: React.FC<SearchResultsProps> = ({ results, onClose }) => {
  const navigate = useNavigate();
  const { play, setPlaylist } = usePlayerStore();

  const handleTrackClick = (track: any) => {
    play(track);
    setPlaylist([track]);
    onClose();
  };

  const handleArtistClick = (artistId: number) => {
    navigate(`/artist/${artistId}`);
    onClose();
  };

  const handleAlbumClick = (albumId: number) => {
    navigate(`/detail?id=${albumId}`);
    onClose();
  };

  const hasResults =
    results.tracks.length > 0 ||
    results.artists.length > 0 ||
    results.albums.length > 0;

  if (!hasResults) {
    return (
      <div className={styles.searchResults}>
        <div className={styles.empty}>
          <Empty description="暂无搜索结果" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.searchResults}>
      {results.tracks.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>单曲</div>
          {results.tracks.map((track) => (
            <div
              key={track.id}
              className={styles.resultItem}
              onClick={() => handleTrackClick(track)}
            >
              <div className={styles.info}>
                <div className={styles.name}>{track.name}</div>
                <div className={styles.meta}>
                  {track.artist} · {track.album}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.artists.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>艺术家</div>
          {results.artists.map((artist) => (
            <div
              key={artist.id}
              className={styles.resultItem}
              onClick={() => handleArtistClick(artist.id)}
            >
              <Avatar
                src={
                  artist.avatar
                    ? `${getBaseURL()}${artist.avatar}`
                    : `https://picsum.photos/seed/${artist.id}/48/48`
                }
                size={48}
                className={styles.avatar}
                icon={!artist.avatar && artist.name[0]}
              />
              <div className={styles.info}>
                <div className={styles.name}>{artist.name}</div>
                <div className={styles.meta}>
                  {artist.type === "MUSIC" ? "音乐人" : "演播者"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.albums.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>专辑</div>
          {results.albums.map((album) => (
            <div
              key={album.id}
              className={styles.resultItem}
              onClick={() => handleAlbumClick(album.id)}
            >
              <img
                src={
                  album.cover
                    ? `${getBaseURL()}${album.cover}`
                    : `https://picsum.photos/seed/${album.id}/48/48`
                }
                alt={album.name}
                className={styles.cover}
              />
              <div className={styles.info}>
                <div className={styles.name}>{album.name}</div>
                <div className={styles.meta}>
                  {album.artist} · {album.year}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
