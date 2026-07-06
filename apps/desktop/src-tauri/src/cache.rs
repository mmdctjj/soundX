use std::collections::HashMap;
use std::path::{Path, PathBuf};
use futures_util::StreamExt;
use percent_encoding::percent_decode_str;
use serde::{Deserialize, Serialize};
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TrackMetadata {
    pub id: i64,
    pub path: String,
    pub name: String,
    pub artist: String,
    pub album: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub album_id: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<f64>,
    pub track_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cover: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lyrics: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
}

pub struct CacheManager {
    cache_dir: PathBuf,
    active_downloads: Mutex<HashMap<i64, tokio::task::JoinHandle<Result<Option<String>, String>>>>,
}

impl CacheManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let cache_dir = app_data_dir.join("audio_cache");
        std::fs::create_dir_all(&cache_dir).ok();

        Self {
            cache_dir,
            active_downloads: Mutex::new(HashMap::new()),
        }
    }

    pub fn check_cache(
        &self,
        track_id: i64,
        _original_path: &str,
        download_path: &str,
        _track_type: &str,
        _album_name: &str,
    ) -> Result<Option<String>, String> {
        let meta_path = self.cache_dir.join(format!("{}.json", track_id));
        if !meta_path.exists() {
            return Ok(None);
        }

        let content = std::fs::read_to_string(&meta_path)
            .map_err(|e| format!("read meta: {}", e))?;
        let metadata: TrackMetadata = serde_json::from_str(&content)
            .map_err(|e| format!("parse meta: {}", e))?;

        if let Some(local_path) = &metadata.local_path {
            let expanded_download = expand_tilde(download_path)?;
            let full_path = Path::new(&expanded_download).join(local_path);
            match full_path.metadata() {
                Ok(m) if m.len() > 0 => {
                    return Ok(Some(format!("media://audio/{}", local_path)));
                }
                _ => {}
            }
        }

        Ok(None)
    }

    pub async fn download_track(
        &self,
        track_id: i64,
        url: &str,
        download_path: &str,
        track_type: &str,
        album_name: &str,
        metadata: TrackMetadata,
        token: Option<&str>,
    ) -> Result<Option<String>, String> {
        // Check if already downloading
        {
            let active = self.active_downloads.lock().await;
            if active.contains_key(&track_id) {
                return Ok(None);
            }
        }

        let expanded_download = expand_tilde(download_path)?;
        let url = url.to_string();
        let token = token.map(|s| s.to_string());
        let cache_dir = self.cache_dir.clone();
        let track_type = track_type.to_string();
        let album_name = album_name.to_string();

        let handle = tokio::spawn(async move {
            download_track_internal(
                &url,
                &expanded_download,
                &track_type,
                &album_name,
                &metadata,
                token.as_deref(),
                &cache_dir,
            )
            .await
        });

        {
            let mut active = self.active_downloads.lock().await;
            active.insert(track_id, handle);
        }

        // Wait for completion and clean up
        let result = {
            let mut active = self.active_downloads.lock().await;
            if let Some(handle) = active.remove(&track_id) {
                match handle.await {
                    Ok(res) => res,
                    Err(e) => Err(format!("Download task failed: {}", e)),
                }
            } else {
                Ok(None)
            }
        };

        result
    }

    pub fn list_cache(
        &self,
        download_path: &str,
        track_type: &str,
    ) -> Result<Vec<TrackMetadata>, String> {
        let mut results = Vec::new();

        if !self.cache_dir.exists() {
            return Ok(results);
        }

        let expanded_download = expand_tilde(download_path)?;

        for entry in std::fs::read_dir(&self.cache_dir)
            .map_err(|e| format!("read_dir: {}", e))?
        {
            let entry = entry.map_err(|e| format!("entry: {}", e))?;
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                let content = std::fs::read_to_string(&path)
                    .map_err(|e| format!("read meta: {}", e))?;
                if let Ok(data) = serde_json::from_str::<TrackMetadata>(&content) {
                    if data.track_type == track_type {
                        if let Some(local_path) = &data.local_path {
                            let full_path = Path::new(&expanded_download).join(local_path);
                            if full_path.exists() {
                                results.push(data);
                            }
                        }
                    }
                }
            }
        }

        Ok(results)
    }

    pub fn get_total_size(&self) -> Result<u64, String> {
        let mut total_size = 0u64;

        if self.cache_dir.exists() {
            for entry in std::fs::read_dir(&self.cache_dir)
                .map_err(|e| format!("read_dir: {}", e))?
            {
                let entry = entry.map_err(|e| format!("entry: {}", e))?;
                if let Ok(meta) = entry.metadata() {
                    total_size += meta.len();
                }
            }
        }

        Ok(total_size)
    }

    pub fn clear_cache(&self) -> Result<(), String> {
        if self.cache_dir.exists() {
            for entry in std::fs::read_dir(&self.cache_dir)
                .map_err(|e| format!("read_dir: {}", e))?
            {
                let entry = entry.map_err(|e| format!("entry: {}", e))?;
                let path = entry.path();
                if path.is_file() {
                    std::fs::remove_file(&path).map_err(|e| format!("remove: {}", e))?;
                }
            }
        }
        Ok(())
    }
}

fn expand_tilde(path: &str) -> Result<String, String> {
    if path.starts_with("~") {
        let home = dirs::home_dir().ok_or("Failed to get home dir")?;
        Ok(path.replacen("~", &home.to_string_lossy(), 1))
    } else {
        Ok(path.to_string())
    }
}

async fn download_track_internal(
    url: &str,
    download_path: &str,
    track_type: &str,
    album_name: &str,
    metadata: &TrackMetadata,
    token: Option<&str>,
    cache_dir: &Path,
) -> Result<Option<String>, String> {
    let url_parsed = reqwest::Url::parse(url).map_err(|e| format!("url parse: {}", e))?;
    let file_name = url_parsed
        .path_segments()
        .and_then(|segments| segments.last())
        .unwrap_or("unknown");
    let decoded_name = percent_decode(file_name);

    let sub_folder = if track_type == "MUSIC" {
        "music".to_string()
    } else {
        format!("audio/{}", sanitize_filename(album_name))
    };

    let file_path = Path::new(download_path)
        .join(&sub_folder)
        .join(&decoded_name);
    let rel_path = format!("{}/{}", sub_folder, decoded_name);

    let dir_path = file_path.parent().unwrap();
    tokio::fs::create_dir_all(dir_path)
        .await
        .map_err(|e| format!("mkdir: {}", e))?;

    let temp_path = file_path.with_extension("tmp");

    if file_path.exists() {
        let mut meta = metadata.clone();
        meta.local_path = Some(rel_path.clone());
        let meta_path = cache_dir.join(format!("{}.json", metadata.id));
        tokio::fs::write(
            &meta_path,
            serde_json::to_string_pretty(&meta).map_err(|e| format!("ser: {}", e))?,
        )
        .await
        .map_err(|e| format!("write meta: {}", e))?;
        return Ok(Some(format!("media://audio/{}", rel_path)));
    }

    let client = reqwest::Client::new();
    let mut request = client.get(url);
    if let Some(t) = token {
        request = request.header("Authorization", format!("Bearer {}", t));
    }
    request = request.header("User-Agent", "SoundX-Desktop");

    let response = request
        .send()
        .await
        .map_err(|e| format!("send: {}", e))?;
    if !response.status().is_success() {
        return Err(format!("Download failed: {}", response.status()));
    }

    let mut file = tokio::fs::File::create(&temp_path)
        .await
        .map_err(|e| format!("create file: {}", e))?;
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("chunk: {}", e))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("write: {}", e))?;
    }

    file.flush().await.map_err(|e| format!("flush: {}", e))?;
    drop(file);

    tokio::fs::rename(&temp_path, &file_path)
        .await
        .map_err(|e| format!("rename: {}", e))?;

    if let Some(cover_url) = &metadata.cover {
        if !cover_url.is_empty() {
            let cover_ext = Path::new(cover_url)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("jpg");
            let cover_name = format!("{}_cover.{}", metadata.id, cover_ext);
            let cover_path = cache_dir.join(&cover_name);

            if let Ok(cover_res) = client.get(cover_url).send().await {
                if cover_res.status().is_success() {
                    if let Ok(bytes) = cover_res.bytes().await {
                        let snippet = String::from_utf8_lossy(&bytes[..bytes.len().min(10)]);
                        if !snippet.to_lowercase().contains("<!doc")
                            && !snippet.to_lowercase().contains("<html")
                        {
                            let _ = tokio::fs::write(&cover_path, &bytes).await;
                        }
                    }
                }
            }
        }
    }

    let mut meta = metadata.clone();
    meta.local_path = Some(rel_path.clone());
    let meta_path = cache_dir.join(format!("{}.json", metadata.id));
    tokio::fs::write(
        &meta_path,
        serde_json::to_string_pretty(&meta).map_err(|e| format!("ser: {}", e))?,
    )
    .await
    .map_err(|e| format!("write meta: {}", e))?;

    Ok(Some(format!("media://audio/{}", rel_path)))
}

fn percent_decode(s: &str) -> String {
    percent_decode_str(s).decode_utf8_lossy().to_string()
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | '?' | '%' | '*' | ':' | '|' | '"' | '<' | '>' => '-',
            _ => c,
        })
        .collect()
}
